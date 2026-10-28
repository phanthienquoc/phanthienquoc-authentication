-- Source recovery for migration already applied to project gtqovpusfyyvxpeezxlo.
-- This file matches remote ledger version 20261028014657.
-- The trigger functions were inspected before changing search_path. Their bodies use
-- NEW/OLD and public-qualified table names, so fixed search_path does not change
-- table resolution. The Media Generation trigger is intentionally outside scope.

ALTER FUNCTION public.tce_touch_updated_at()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.set_platform_credentials_updated_at()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.set_platform_configs_updated_at()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.set_telegram_debug_assignment_updated_at()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.sync_tce_account_external_account_no()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.sync_tce_position_user_id()
  SET search_path = pg_catalog, public, pg_temp;

ALTER FUNCTION public.sync_tce_positions_on_account_user_change()
  SET search_path = pg_catalog, public, pg_temp;
