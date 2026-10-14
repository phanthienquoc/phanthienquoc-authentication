-- Stores only application-side identity metadata for verified Keycloak users.
-- Keycloak remains the source of truth for credentials, MFA, sessions and roles.
-- Never store access tokens, refresh tokens, ID tokens, passwords or client secrets.

create table if not exists public.auth_keycloak_identities (
  id uuid primary key default gen_random_uuid(),
  issuer text not null,
  subject text not null,
  email text,
  preferred_username text,
  email_verified boolean,
  last_authenticated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_keycloak_identities_issuer_subject_key unique (issuer, subject)
);

create index if not exists auth_keycloak_identities_email_idx
  on public.auth_keycloak_identities (lower(email))
  where email is not null;

alter table public.auth_keycloak_identities enable row level security;

-- The NestJS backend uses the server-only service-role key. Browser-facing roles
-- must not read or mutate identity metadata directly.
revoke all on table public.auth_keycloak_identities from anon, authenticated;
grant select, insert, update on table public.auth_keycloak_identities to service_role;

comment on table public.auth_keycloak_identities is
  'Minimal metadata for identities authenticated by Keycloak; not a credential or session store.';
