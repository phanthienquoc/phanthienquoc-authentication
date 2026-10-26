-- Server-issued, short-lived challenges bind MFA completion to a prior first factor.
-- Only SHA-256 token hashes are stored; raw challenge tokens are returned once to the client.
-- All access is through service_role-executable SECURITY DEFINER RPCs; no direct table grants.

create table public.auth_mfa_login_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  locked_at timestamptz,
  constraint auth_mfa_login_challenges_expiry_check
    check (expires_at > created_at and expires_at <= created_at + interval '5 minutes 30 seconds')
);

create index auth_mfa_login_challenges_user_created_idx
  on public.auth_mfa_login_challenges(user_id, created_at desc);
create index auth_mfa_login_challenges_active_expiry_idx
  on public.auth_mfa_login_challenges(expires_at)
  where consumed_at is null and locked_at is null;

alter table public.auth_mfa_login_challenges enable row level security;
revoke all privileges on table public.auth_mfa_login_challenges
  from public, anon, authenticated, service_role;

create or replace function public.auth_create_mfa_login_challenge(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if p_user_id is null
     or p_token_hash is null
     or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_expires_at is null
     or p_expires_at <= clock_timestamp()
     or p_expires_at > clock_timestamp() + interval '5 minutes 15 seconds'
  then
    return false;
  end if;

  if not exists (
    select 1 from public.users
    where id = p_user_id
      and mfa_enabled = true
      and mfa_secret_encrypted is not null
  ) then
    return false;
  end if;

  delete from public.auth_mfa_login_challenges
  where expires_at < clock_timestamp() - interval '24 hours'
     or consumed_at < clock_timestamp() - interval '24 hours'
     or locked_at < clock_timestamp() - interval '24 hours';

  insert into public.auth_mfa_login_challenges(user_id, token_hash, expires_at)
  values (p_user_id, p_token_hash, p_expires_at);

  return true;
exception when unique_violation then
  return false;
end;
$$;

create or replace function public.auth_get_mfa_login_challenge(
  p_token_hash text
) returns table(user_id uuid)
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select c.user_id
  from public.auth_mfa_login_challenges c
  join public.users u on u.id = c.user_id
  where c.token_hash = p_token_hash
    and p_token_hash ~ '^[a-f0-9]{64}$'
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5
    and u.mfa_enabled = true
    and u.mfa_secret_encrypted is not null
  limit 1;
$$;

create or replace function public.auth_record_mfa_login_failure(
  p_token_hash text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_updated boolean := false;
begin
  update public.auth_mfa_login_challenges c
  set failed_attempts = least(c.failed_attempts + 1, 5),
      locked_at = case when c.failed_attempts + 1 >= 5 then clock_timestamp() else c.locked_at end
  where c.token_hash = p_token_hash
    and p_token_hash ~ '^[a-f0-9]{64}$'
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5
    and exists (
      select 1 from public.users u
      where u.id = c.user_id and u.mfa_enabled = true
        and u.mfa_secret_encrypted is not null
    );

  v_updated := found;
  return v_updated;
end;
$$;

create or replace function public.auth_consume_mfa_login_challenge(
  p_token_hash text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_challenge_id uuid;
  v_user_id uuid;
begin
  select c.id, c.user_id
  into v_challenge_id, v_user_id
  from public.auth_mfa_login_challenges c
  join public.users u on u.id = c.user_id
  where c.token_hash = p_token_hash
    and p_token_hash ~ '^[a-f0-9]{64}$'
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5
    and u.mfa_enabled = true
    and u.mfa_secret_encrypted is not null
  for update of c;

  if not found then return null; end if;

  update public.auth_mfa_login_challenges
  set consumed_at = clock_timestamp()
  where id = v_challenge_id
    and consumed_at is null
    and expires_at > clock_timestamp()
    and locked_at is null
    and failed_attempts < 5;

  if not found then return null; end if;
  return v_user_id;
end;
$$;

create or replace function public.auth_consume_mfa_login_recovery(
  p_token_hash text,
  p_code_hash text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_challenge_id uuid;
  v_user_id uuid;
  v_code_id uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
     or p_code_hash is null or p_code_hash !~ '^[a-f0-9]{64}$'
  then
    return null;
  end if;

  select c.id, c.user_id
  into v_challenge_id, v_user_id
  from public.auth_mfa_login_challenges c
  join public.users u on u.id = c.user_id
  where c.token_hash = p_token_hash
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5
    and u.mfa_enabled = true
    and u.mfa_secret_encrypted is not null
  for update of c;

  if not found then return null; end if;

  select id into v_code_id
  from public.mfa_recovery_codes
  where user_id = v_user_id
    and code_hash = p_code_hash
    and used_at is null
  order by created_at, id
  limit 1
  for update skip locked;

  if not found then
    update public.auth_mfa_login_challenges
    set failed_attempts = least(failed_attempts + 1, 5),
        locked_at = case when failed_attempts + 1 >= 5 then clock_timestamp() else locked_at end
    where id = v_challenge_id and consumed_at is null;
    return null;
  end if;

  update public.mfa_recovery_codes
  set used_at = clock_timestamp()
  where id = v_code_id and used_at is null;
  if not found then return null; end if;

  update public.auth_mfa_login_challenges
  set consumed_at = clock_timestamp()
  where id = v_challenge_id and consumed_at is null
    and expires_at > clock_timestamp()
    and locked_at is null
    and failed_attempts < 5;
  if not found then
    raise exception using errcode = '40001', message = 'MFA challenge state changed';
  end if;

  return v_user_id;
end;
$$;

revoke all on function public.auth_create_mfa_login_challenge(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.auth_get_mfa_login_challenge(text) from public, anon, authenticated;
revoke all on function public.auth_record_mfa_login_failure(text) from public, anon, authenticated;
revoke all on function public.auth_consume_mfa_login_challenge(text) from public, anon, authenticated;
revoke all on function public.auth_consume_mfa_login_recovery(text, text) from public, anon, authenticated;

grant execute on function public.auth_create_mfa_login_challenge(uuid, text, timestamptz) to service_role;
grant execute on function public.auth_get_mfa_login_challenge(text) to service_role;
grant execute on function public.auth_record_mfa_login_failure(text) to service_role;
grant execute on function public.auth_consume_mfa_login_challenge(text) to service_role;
grant execute on function public.auth_consume_mfa_login_recovery(text, text) to service_role;
