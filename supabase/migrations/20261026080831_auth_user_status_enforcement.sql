-- UM-2A: additive account status and suspension enforcement.
-- Source only in this PR. Do not apply until the Supabase target is explicitly
-- classified as safe non-production and migration-history drift is reconciled.

alter table public.users
  add column if not exists status text not null default 'ACTIVE';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_status_check'
  ) then
    alter table public.users
      add constraint users_status_check check (status in ('ACTIVE', 'SUSPENDED'));
  end if;
end;
$$;

comment on column public.users.status is
  'Legacy NestJS account lifecycle state; ACTIVE permits authentication, SUSPENDED denies authentication.';

create index if not exists users_active_admin_idx
  on public.users (id)
  where role = 'ADMIN' and status = 'ACTIVE';

create or replace function public.auth_create_refresh_session(
  p_session_id uuid,
  p_user_id uuid,
  p_family_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_ip text,
  p_user_agent text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_status text;
begin
  select u.status
  into v_status
  from public.users u
  where u.id = p_user_id
  for update;

  if not found or v_status <> 'ACTIVE' then
    return false;
  end if;

  insert into public.refresh_sessions (
    id, user_id, family_id, token_hash, expires_at, ip, user_agent
  ) values (
    p_session_id, p_user_id, p_family_id, p_token_hash, p_expires_at, nullif(p_ip, '')::inet, p_user_agent
  );

  return true;
end;
$$;

create or replace function public.auth_replace_mfa_recovery_codes(
  p_user_id uuid,
  p_code_hashes text[]
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  perform 1 from public.users u
  where u.id = p_user_id and u.status = 'ACTIVE'
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'Inactive account';
  end if;

  delete from public.mfa_recovery_codes
  where user_id = p_user_id and used_at is null;

  insert into public.mfa_recovery_codes (user_id, code_hash)
  select p_user_id, item
  from unnest(coalesce(p_code_hashes, array[]::text[])) as item;
end;
$$;

create or replace function public.auth_consume_mfa_recovery_code(
  p_user_id uuid,
  p_code_hash text
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
begin
  perform 1 from public.users u
  where u.id = p_user_id and u.status = 'ACTIVE'
  for update;
  if not found then return false; end if;

  select id into v_id
  from public.mfa_recovery_codes
  where user_id = p_user_id and code_hash = p_code_hash and used_at is null
    and exists (
      select 1 from public.users u
      where u.id = p_user_id and u.status = 'ACTIVE'
    )
  order by created_at, id
  limit 1
  for update skip locked;

  if v_id is null then return false; end if;

  update public.mfa_recovery_codes
  set used_at = now()
  where id = v_id and used_at is null;

  return found;
end;
$$;

create or replace function public.auth_consume_passkey_challenge(
  p_challenge text,
  p_purpose text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_row public.auth_passkey_challenges%rowtype;
begin
  delete from public.auth_passkey_challenges c
  where c.id = (
    select c2.id
    from public.auth_passkey_challenges c2
    where c2.challenge = p_challenge
      and c2.purpose = p_purpose
      and c2.expires_at > now()
      and (
        c2.purpose <> 'registration'
        or exists (
          select 1 from public.users u
          where u.id = c2.user_id and u.status = 'ACTIVE'
        )
      )
    order by c2.created_at desc
    limit 1
    for update skip locked
  )
  returning c.* into v_row;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_row.id,
    'user_id', v_row.user_id,
    'challenge', v_row.challenge,
    'purpose', v_row.purpose,
    'expires_at', v_row.expires_at
  );
end;
$$;

create or replace function public.auth_rotate_refresh_session(
  p_token_hash text,
  p_next_session_id uuid,
  p_next_token_hash text,
  p_next_expires_at timestamptz,
  p_ip text default null,
  p_user_agent text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid;
  v_session public.refresh_sessions%rowtype;
  v_user public.users%rowtype;
begin
  -- Lock order is user first, then session, matching the future lifecycle mutation RPC.
  select user_id into v_user_id
  from public.refresh_sessions
  where token_hash = p_token_hash;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_user
  from public.users
  where id = v_user_id
  for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_user.status <> 'ACTIVE' then
    update public.refresh_sessions
    set revoked_at = coalesce(revoked_at, now())
    where user_id = v_user_id and revoked_at is null;
    return jsonb_build_object('status', 'invalid');
  end if;

  select * into v_session
  from public.refresh_sessions
  where token_hash = p_token_hash
  for update;

  if not found or v_session.user_id <> v_user_id then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v_session.expires_at <= now() then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_session.revoked_at is not null or v_session.replaced_by is not null then
    update public.refresh_sessions
    set revoked_at = coalesce(revoked_at, now())
    where family_id = v_session.family_id and revoked_at is null;

    return jsonb_build_object(
      'status', 'reuse-detected',
      'family_id', v_session.family_id
    );
  end if;

  insert into public.refresh_sessions
    (id, user_id, token_hash, family_id, expires_at, ip, user_agent)
  values
    (p_next_session_id, v_session.user_id, p_next_token_hash, v_session.family_id,
     p_next_expires_at, nullif(p_ip, '')::inet, p_user_agent);

  update public.refresh_sessions
  set replaced_by = p_next_session_id, revoked_at = now(), last_used_at = now()
  where id = v_session.id
    and revoked_at is null
    and replaced_by is null
    and expires_at > now();

  if not found then
    delete from public.refresh_sessions where id = p_next_session_id;
    update public.refresh_sessions
    set revoked_at = coalesce(revoked_at, now())
    where family_id = v_session.family_id and revoked_at is null;

    return jsonb_build_object(
      'status', 'reuse-detected',
      'family_id', v_session.family_id
    );
  end if;

  return jsonb_build_object(
    'status', 'rotated',
    'family_id', v_session.family_id,
    'user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'role', v_user.role,
      'mfa_enabled', v_user.mfa_enabled,
      'status', v_user.status,
      'mfa_secret_encrypted', null
    )
  );
end;
$$;

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

  perform 1
  from public.users
  where id = p_user_id
    and mfa_enabled = true
    and mfa_secret_encrypted is not null
    and status = 'ACTIVE'
  for update;
  if not found then
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
    and u.status = 'ACTIVE'
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
        and u.status = 'ACTIVE'
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
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  -- Lock order is user first, then challenge, matching account lifecycle changes.
  select c.user_id into v_user_id
  from public.auth_mfa_login_challenges c
  where c.token_hash = p_token_hash
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5;

  if not found then return null; end if;

  perform 1
  from public.users u
  where u.id = v_user_id
    and u.status = 'ACTIVE'
    and u.mfa_enabled = true
    and u.mfa_secret_encrypted is not null
  for update;

  if not found then return null; end if;

  select c.id into v_challenge_id
  from public.auth_mfa_login_challenges c
  where c.token_hash = p_token_hash
    and c.user_id = v_user_id
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5
  for update;

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

  select c.user_id into v_user_id
  from public.auth_mfa_login_challenges c
  where c.token_hash = p_token_hash
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5;

  if not found then return null; end if;

  -- Keep user -> challenge -> recovery-code lock ordering consistent.
  perform 1
  from public.users u
  where u.id = v_user_id
    and u.status = 'ACTIVE'
    and u.mfa_enabled = true
    and u.mfa_secret_encrypted is not null
  for update;

  if not found then return null; end if;

  select c.id into v_challenge_id
  from public.auth_mfa_login_challenges c
  where c.token_hash = p_token_hash
    and c.user_id = v_user_id
    and c.expires_at > clock_timestamp()
    and c.consumed_at is null
    and c.locked_at is null
    and c.failed_attempts < 5
  for update;

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

revoke all on function public.auth_create_refresh_session(uuid, uuid, uuid, text, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.auth_replace_mfa_recovery_codes(uuid, text[]) from public, anon, authenticated;
revoke all on function public.auth_consume_mfa_recovery_code(uuid, text) from public, anon, authenticated;
revoke all on function public.auth_consume_passkey_challenge(text, text) from public, anon, authenticated;
revoke all on function public.auth_rotate_refresh_session(text, uuid, text, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.auth_create_mfa_login_challenge(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.auth_get_mfa_login_challenge(text) from public, anon, authenticated;
revoke all on function public.auth_record_mfa_login_failure(text) from public, anon, authenticated;
revoke all on function public.auth_consume_mfa_login_challenge(text) from public, anon, authenticated;
revoke all on function public.auth_consume_mfa_login_recovery(text, text) from public, anon, authenticated;

grant execute on function public.auth_create_refresh_session(uuid, uuid, uuid, text, timestamptz, text, text) to service_role;
grant execute on function public.auth_replace_mfa_recovery_codes(uuid, text[]) to service_role;
grant execute on function public.auth_consume_mfa_recovery_code(uuid, text) to service_role;
grant execute on function public.auth_consume_passkey_challenge(text, text) to service_role;
grant execute on function public.auth_rotate_refresh_session(text, uuid, text, timestamptz, text, text) to service_role;
grant execute on function public.auth_create_mfa_login_challenge(uuid, text, timestamptz) to service_role;
grant execute on function public.auth_get_mfa_login_challenge(text) to service_role;
grant execute on function public.auth_record_mfa_login_failure(text) to service_role;
grant execute on function public.auth_consume_mfa_login_challenge(text) to service_role;
grant execute on function public.auth_consume_mfa_login_recovery(text, text) to service_role;

notify pgrst, 'reload schema';
