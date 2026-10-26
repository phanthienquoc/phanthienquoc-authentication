-- AUTH-UM-002B: audit-atomic legacy account lifecycle mutations.
-- Source only. Do not apply until the connected Supabase target is explicitly
-- confirmed safe non-production and migration-history drift is reconciled.
-- All mutation RPCs share one advisory lock, then lock actor -> target -> sessions.
-- Audit writes occur in the same transaction; any audit failure rolls back mutation.

create or replace function public.auth_admin_update_user_role(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_new_role text,
  p_reason_code text,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor public.users%rowtype;
  v_target public.users%rowtype;
  v_before_role text;
  v_active_admin_count integer;
begin
  perform pg_advisory_xact_lock(782345123, 1400923);

  select * into v_actor from public.users where id = p_actor_user_id for update;
  if not found or v_actor.role <> 'ADMIN' or v_actor.status <> 'ACTIVE' then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_ACCESS_DENIED', 'DENIED',
      null, null, null, null, 'POLICY_VIOLATION', p_request_id
    );
    return jsonb_build_object('status', 'denied');
  end if;

  if p_new_role is null or p_new_role not in ('USER', 'ADMIN') then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'POLICY_VIOLATION', p_request_id
    );
    return jsonb_build_object('status', 'invalid_role');
  end if;

  if p_target_user_id is null then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'OTHER', p_request_id
    );
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_target from public.users where id = p_target_user_id for update;
  if not found then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'OTHER', p_request_id
    );
    return jsonb_build_object('status', 'not_found');
  end if;

  if p_actor_user_id = p_target_user_id then
    perform public.auth_record_admin_audit_event(
      v_actor.id, v_target.id, 'ADMIN_MUTATION_FAILED', 'DENIED',
      null, null, null, null, 'POLICY_VIOLATION', p_request_id
    );
    return jsonb_build_object('status', 'self_change');
  end if;

  if v_target.role = p_new_role then
    perform public.auth_record_admin_audit_event(
      v_actor.id, v_target.id, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, p_reason_code, p_request_id
    );
    return jsonb_build_object(
      'status', 'no_change',
      'user', jsonb_build_object(
        'id', v_target.id, 'email', v_target.email, 'role', v_target.role,
        'status', v_target.status, 'mfa_enabled', v_target.mfa_enabled
      )
    );
  end if;

  if v_target.role = 'ADMIN' and v_target.status = 'ACTIVE' and p_new_role = 'USER' then
    select count(*) into v_active_admin_count
    from public.users where role = 'ADMIN' and status = 'ACTIVE';
    if v_active_admin_count <= 1 then
      perform public.auth_record_admin_audit_event(
        v_actor.id, v_target.id, 'ADMIN_MUTATION_FAILED', 'DENIED',
        null, null, null, null, 'POLICY_VIOLATION', p_request_id
      );
      return jsonb_build_object('status', 'last_admin');
    end if;
  end if;

  v_before_role := v_target.role;
  update public.users set role = p_new_role, updated_at = now()
  where id = v_target.id
  returning * into v_target;

  perform public.auth_record_admin_audit_event(
    v_actor.id, v_target.id, 'USER_ROLE_CHANGED', 'SUCCESS',
    v_before_role, v_target.role, null, null, p_reason_code, p_request_id
  );

  return jsonb_build_object(
    'status', 'updated',
    'user', jsonb_build_object(
      'id', v_target.id, 'email', v_target.email, 'role', v_target.role,
      'status', v_target.status, 'mfa_enabled', v_target.mfa_enabled
    )
  );
end;
$$;

create or replace function public.auth_admin_update_user_status(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_new_status text,
  p_reason_code text,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor public.users%rowtype;
  v_target public.users%rowtype;
  v_active_admin_count integer;
  v_revoked_count integer := 0;
  v_action text;
begin
  perform pg_advisory_xact_lock(782345123, 1400923);

  select * into v_actor from public.users where id = p_actor_user_id for update;
  if not found or v_actor.role <> 'ADMIN' or v_actor.status <> 'ACTIVE' then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_ACCESS_DENIED', 'DENIED',
      null, null, null, null, 'POLICY_VIOLATION', p_request_id
    );
    return jsonb_build_object('status', 'denied');
  end if;

  if p_new_status is null or p_new_status not in ('ACTIVE', 'SUSPENDED') then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'POLICY_VIOLATION', p_request_id
    );
    return jsonb_build_object('status', 'invalid_status');
  end if;

  if p_target_user_id is null then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'OTHER', p_request_id
    );
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_target from public.users where id = p_target_user_id for update;
  if not found then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'OTHER', p_request_id
    );
    return jsonb_build_object('status', 'not_found');
  end if;

  if p_actor_user_id = p_target_user_id and p_new_status = 'SUSPENDED' then
    perform public.auth_record_admin_audit_event(
      v_actor.id, v_target.id, 'ADMIN_MUTATION_FAILED', 'DENIED',
      null, null, null, null, 'POLICY_VIOLATION', p_request_id
    );
    return jsonb_build_object('status', 'self_change');
  end if;

  if v_target.status = p_new_status then
    perform public.auth_record_admin_audit_event(
      v_actor.id, v_target.id, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, p_reason_code, p_request_id
    );
    return jsonb_build_object(
      'status', 'no_change',
      'user', jsonb_build_object(
        'id', v_target.id, 'email', v_target.email, 'role', v_target.role,
        'status', v_target.status, 'mfa_enabled', v_target.mfa_enabled
      ),
      'revoked_sessions', 0
    );
  end if;

  if v_target.role = 'ADMIN' and v_target.status = 'ACTIVE' and p_new_status = 'SUSPENDED' then
    select count(*) into v_active_admin_count
    from public.users where role = 'ADMIN' and status = 'ACTIVE';
    if v_active_admin_count <= 1 then
      perform public.auth_record_admin_audit_event(
        v_actor.id, v_target.id, 'ADMIN_MUTATION_FAILED', 'DENIED',
        null, null, null, null, 'POLICY_VIOLATION', p_request_id
      );
      return jsonb_build_object('status', 'last_admin');
    end if;
  end if;

  update public.users set status = p_new_status, updated_at = now()
  where id = v_target.id
  returning * into v_target;

  if p_new_status = 'SUSPENDED' then
    update public.refresh_sessions
    set revoked_at = coalesce(revoked_at, now())
    where user_id = v_target.id and revoked_at is null;
    get diagnostics v_revoked_count = row_count;
    v_action := 'USER_SUSPENDED';
  else
    v_action := 'USER_REACTIVATED';
  end if;

  perform public.auth_record_admin_audit_event(
    v_actor.id, v_target.id, v_action, 'SUCCESS',
    null, null, case when v_action = 'USER_SUSPENDED' then 'ACTIVE' else 'SUSPENDED' end,
    p_new_status, p_reason_code, p_request_id
  );

  return jsonb_build_object(
    'status', 'updated',
    'user', jsonb_build_object(
      'id', v_target.id, 'email', v_target.email, 'role', v_target.role,
      'status', v_target.status, 'mfa_enabled', v_target.mfa_enabled
    ),
    'revoked_sessions', v_revoked_count
  );
end;
$$;

create or replace function public.auth_admin_revoke_user_sessions(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_reason_code text,
  p_request_id text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor public.users%rowtype;
  v_target public.users%rowtype;
  v_revoked_count integer := 0;
begin
  perform pg_advisory_xact_lock(782345123, 1400923);

  select * into v_actor from public.users where id = p_actor_user_id for update;
  if not found or v_actor.role <> 'ADMIN' or v_actor.status <> 'ACTIVE' then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_ACCESS_DENIED', 'DENIED',
      null, null, null, null, 'POLICY_VIOLATION', p_request_id
    );
    return jsonb_build_object('status', 'denied');
  end if;

  if p_target_user_id is null then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'OTHER', p_request_id
    );
    return jsonb_build_object('status', 'not_found');
  end if;

  select * into v_target from public.users where id = p_target_user_id for update;
  if not found then
    perform public.auth_record_admin_audit_event(
      v_actor.id, null, 'ADMIN_MUTATION_FAILED', 'FAILED',
      null, null, null, null, 'OTHER', p_request_id
    );
    return jsonb_build_object('status', 'not_found');
  end if;

  update public.refresh_sessions
  set revoked_at = coalesce(revoked_at, now())
  where user_id = v_target.id and revoked_at is null;
  get diagnostics v_revoked_count = row_count;

  perform public.auth_record_admin_audit_event(
    v_actor.id, v_target.id, 'USER_SESSIONS_REVOKED', 'SUCCESS',
    null, null, null, null, p_reason_code, p_request_id
  );

  return jsonb_build_object(
    'status', 'revoked',
    'user', jsonb_build_object('id', v_target.id, 'email', v_target.email),
    'revoked_sessions', v_revoked_count
  );
end;
$$;

revoke all on function public.auth_admin_update_user_role(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.auth_admin_update_user_status(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.auth_admin_revoke_user_sessions(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.auth_admin_update_user_role(uuid, uuid, text, text, text) to service_role;
grant execute on function public.auth_admin_update_user_status(uuid, uuid, text, text, text) to service_role;
grant execute on function public.auth_admin_revoke_user_sessions(uuid, uuid, text, text) to service_role;

notify pgrst, 'reload schema';
