-- Source-of-truth recovery for migration already applied to Supabase on 2026-10-27.
-- This file records the live function definitions and grants for ledger version
-- 20261027040648_auth_persistence_rpc_status_reconciliation.
-- Do not replay this migration against a database that does not already have this
-- ledger version without first reviewing the target's schema and migration history.

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

revoke all on function public.auth_replace_mfa_recovery_codes(uuid, text[]) from public, anon, authenticated;
revoke all on function public.auth_consume_mfa_recovery_code(uuid, text) from public, anon, authenticated;
revoke all on function public.auth_consume_passkey_challenge(text, text) from public, anon, authenticated;
revoke all on function public.auth_rotate_refresh_session(text, uuid, text, timestamptz, text, text) from public, anon, authenticated;

grant execute on function public.auth_replace_mfa_recovery_codes(uuid, text[]) to service_role;
grant execute on function public.auth_consume_mfa_recovery_code(uuid, text) to service_role;
grant execute on function public.auth_consume_passkey_challenge(text, text) to service_role;
grant execute on function public.auth_rotate_refresh_session(text, uuid, text, timestamptz, text, text) to service_role;
