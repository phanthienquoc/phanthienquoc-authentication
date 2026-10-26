-- UM-1B: append-only, server-only audit persistence for legacy admin operations.
-- Applied to the connected Supabase project on 2026-10-26 as ledger version
-- 20261026035340. The SQL below matches the migration that was applied.

create table public.auth_admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  target_user_id uuid references public.users(id) on delete set null,
  actor_provider text not null default 'LEGACY'
    check (actor_provider = 'LEGACY'),
  action text not null check (action in (
    'USER_ROLE_CHANGED',
    'USER_SUSPENDED',
    'USER_REACTIVATED',
    'USER_SESSIONS_REVOKED',
    'ADMIN_ACCESS_DENIED',
    'ADMIN_MUTATION_FAILED'
  )),
  outcome text not null check (outcome in ('SUCCESS', 'DENIED', 'FAILED')),
  before_role text check (before_role in ('USER', 'ADMIN')),
  after_role text check (after_role in ('USER', 'ADMIN')),
  before_status text check (before_status in ('ACTIVE', 'SUSPENDED')),
  after_status text check (after_status in ('ACTIVE', 'SUSPENDED')),
  reason_code text check (reason_code in (
    'ADMIN_REQUEST',
    'SECURITY_REVIEW',
    'COMPROMISED_ACCOUNT',
    'POLICY_VIOLATION',
    'OTHER'
  )),
  request_id text check (
    request_id is null or request_id ~ '^[A-Za-z0-9._:-]{1,128}$'
  ),
  created_at timestamptz not null default now(),
  constraint auth_admin_audit_events_success_shape check (
    outcome <> 'SUCCESS'
    or (
      actor_user_id is not null
      and target_user_id is not null
      and (
        (
          action = 'USER_ROLE_CHANGED'
          and before_role is not null
          and after_role is not null
          and before_role <> after_role
          and before_status is null
          and after_status is null
        )
        or (
          action = 'USER_SUSPENDED'
          and before_status = 'ACTIVE'
          and after_status = 'SUSPENDED'
          and before_role is null
          and after_role is null
        )
        or (
          action = 'USER_REACTIVATED'
          and before_status = 'SUSPENDED'
          and after_status = 'ACTIVE'
          and before_role is null
          and after_role is null
        )
        or (
          action = 'USER_SESSIONS_REVOKED'
          and before_role is null
          and after_role is null
          and before_status is null
          and after_status is null
        )
      )
    )
  )
);

create index auth_admin_audit_events_actor_created_idx
  on public.auth_admin_audit_events (actor_user_id, created_at desc);
create index auth_admin_audit_events_target_created_idx
  on public.auth_admin_audit_events (target_user_id, created_at desc);

alter table public.auth_admin_audit_events enable row level security;

revoke all privileges on table public.auth_admin_audit_events
  from public, anon, authenticated;

create or replace function public.auth_record_admin_audit_event(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_outcome text,
  p_before_role text,
  p_after_role text,
  p_before_status text,
  p_after_status text,
  p_reason_code text,
  p_request_id text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_action is null or p_action not in (
    'USER_ROLE_CHANGED',
    'USER_SUSPENDED',
    'USER_REACTIVATED',
    'USER_SESSIONS_REVOKED',
    'ADMIN_ACCESS_DENIED',
    'ADMIN_MUTATION_FAILED'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported audit action';
  end if;

  if p_outcome is null or p_outcome not in ('SUCCESS', 'DENIED', 'FAILED') then
    raise exception using errcode = '22023', message = 'Unsupported audit outcome';
  end if;

  if p_reason_code is not null and p_reason_code not in (
    'ADMIN_REQUEST', 'SECURITY_REVIEW', 'COMPROMISED_ACCOUNT',
    'POLICY_VIOLATION', 'OTHER'
  ) then
    raise exception using errcode = '22023', message = 'Unsupported audit reason';
  end if;

  if p_request_id is not null and p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$' then
    raise exception using errcode = '22023', message = 'Invalid audit request id';
  end if;

  if p_outcome = 'SUCCESS' then
    if not exists (
      select 1 from public.users
      where id = p_actor_user_id and role = 'ADMIN'
    ) then
      raise exception using errcode = '42501', message = 'Administrator actor required';
    end if;
    if p_action not in (
      'USER_ROLE_CHANGED', 'USER_SUSPENDED', 'USER_REACTIVATED',
      'USER_SESSIONS_REVOKED'
    ) then
      raise exception using errcode = '22023', message = 'Invalid successful audit action';
    end if;
  elsif p_before_role is not null
     or p_after_role is not null
     or p_before_status is not null
     or p_after_status is not null then
    raise exception using errcode = '22023', message = 'Failed audit events cannot include before/after state';
  end if;

  insert into public.auth_admin_audit_events (
    actor_user_id, target_user_id, actor_provider, action, outcome,
    before_role, after_role, before_status, after_status, reason_code, request_id
  ) values (
    p_actor_user_id, p_target_user_id, 'LEGACY', p_action, p_outcome,
    p_before_role, p_after_role, p_before_status, p_after_status, p_reason_code, p_request_id
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.auth_record_admin_audit_event(
  uuid, uuid, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.auth_record_admin_audit_event(
  uuid, uuid, text, text, text, text, text, text, text, text
) to service_role;
