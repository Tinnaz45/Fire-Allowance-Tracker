-- ═════════════════════════════════════════════════════════════════════════════
-- FAT MIGRATION v4 — Move Fire Allowance Tracker tables to dedicated `fat` schema
-- ═════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
--   Relocate all `public.fat_*` objects into a dedicated `fat` schema and drop
--   the now-redundant `fat_` name prefix.
--
--   BEFORE                              AFTER
--   ─────────────────────────────────   ────────────────────────────────────
--   public.fat_financial_years          fat.financial_years
--   public.fat_claim_sequences          fat.claim_sequences
--   public.fat_claim_groups             fat.claim_groups
--   public.fat_stations                 fat.stations
--   public.fat_profile_ext              fat.profile_ext
--   public.fat_distance_cache           fat.distance_cache
--   public.fat_payment_components       fat.payment_components
--   public.fat_payment_summary (view)   fat.payment_summary
--   public.fat_set_updated_at()         fat.set_updated_at()
--   public.fat_increment_claim_sequence fat.increment_claim_sequence()
--   public.fat_derive_parent_payment_status  fat.derive_parent_payment_status()
--
--   Shared public tables (profiles, recalls, retain, standby, spoilt,
--   station_distances, fire_allowance_user_rates) STAY in `public`. They
--   are not FAT-owned.
--
-- PRESERVATION GUARANTEES
--   ▸ All data preserved — ALTER TABLE ... SET SCHEMA is a metadata-only move.
--   ▸ All foreign keys preserved — they reference targets by OID, not name.
--   ▸ All RLS policies move with each table automatically.
--   ▸ All triggers, indexes, sequences, defaults, generated columns preserved.
--   ▸ Function bodies are rewritten to reference the new schema names.
--
-- IDEMPOTENCY
--   Each step is wrapped in a DO block with EXISTS guards. Running this script
--   more than once is safe and produces no changes after the first successful
--   run.
--
-- POSTREST / SUPABASE EXPOSURE
--   For the Supabase JS client to be able to call `.schema('fat')`, the `fat`
--   schema MUST be added to the project's exposed schemas:
--     Supabase Dashboard → Project Settings → API → "Exposed schemas"
--   Add `fat` to the comma-separated list (e.g. "public, storage,
--   graphql_public, fat") and save. A pg_notify is issued at the end of this
--   script which prompts PostgREST to reload if it's already in the list.
--
-- ROLLBACK
--   To roll back, see the matching reverse script comment block at the
--   bottom of this file.
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CREATE SCHEMA AND GRANT PRIVILEGES
-- ─────────────────────────────────────────────────────────────────────────────

create schema if not exists fat;

-- Allow PostgREST roles to access the schema namespace itself
grant usage on schema fat to anon, authenticated, service_role;

-- Privileges on objects already in the schema (covers re-runs after moves)
grant all on all tables    in schema fat to anon, authenticated, service_role;
grant all on all sequences in schema fat to anon, authenticated, service_role;
grant all on all functions in schema fat to anon, authenticated, service_role;
grant all on all routines  in schema fat to anon, authenticated, service_role;

-- Default privileges for any objects created later in this schema
alter default privileges in schema fat
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema fat
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema fat
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema fat
  grant all on routines to anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. MOVE TRIGGER FUNCTION  public.fat_set_updated_at()  →  fat.set_updated_at()
-- Triggers reference functions by OID, so existing triggers continue to work
-- after the move/rename.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fat_set_updated_at'
  ) then
    alter function public.fat_set_updated_at() set schema fat;
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'fat' and p.proname = 'fat_set_updated_at'
  ) then
    alter function fat.fat_set_updated_at() rename to set_updated_at;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MOVE AND RENAME TABLES
-- Order matters only when dropping; ALTER ... SET SCHEMA does not drop, so
-- foreign keys stay intact regardless of order.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  -- financial_years
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fat_financial_years') then
    alter table public.fat_financial_years set schema fat;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'fat' and tablename = 'fat_financial_years') then
    alter table fat.fat_financial_years rename to financial_years;
  end if;

  -- claim_sequences
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fat_claim_sequences') then
    alter table public.fat_claim_sequences set schema fat;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'fat' and tablename = 'fat_claim_sequences') then
    alter table fat.fat_claim_sequences rename to claim_sequences;
  end if;

  -- claim_groups
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fat_claim_groups') then
    alter table public.fat_claim_groups set schema fat;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'fat' and tablename = 'fat_claim_groups') then
    alter table fat.fat_claim_groups rename to claim_groups;
  end if;

  -- stations
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fat_stations') then
    alter table public.fat_stations set schema fat;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'fat' and tablename = 'fat_stations') then
    alter table fat.fat_stations rename to stations;
  end if;

  -- profile_ext
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fat_profile_ext') then
    alter table public.fat_profile_ext set schema fat;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'fat' and tablename = 'fat_profile_ext') then
    alter table fat.fat_profile_ext rename to profile_ext;
  end if;

  -- distance_cache
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fat_distance_cache') then
    alter table public.fat_distance_cache set schema fat;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'fat' and tablename = 'fat_distance_cache') then
    alter table fat.fat_distance_cache rename to distance_cache;
  end if;

  -- payment_components
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'fat_payment_components') then
    alter table public.fat_payment_components set schema fat;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'fat' and tablename = 'fat_payment_components') then
    alter table fat.fat_payment_components rename to payment_components;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RENAME TRIGGERS (drop the redundant fat_ prefix)
-- Trigger renames are pure metadata; the trigger's function binding (via OID)
-- is unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  r record;
begin
  for r in
    select tgname, tgrelid::regclass::text as relname
    from pg_trigger
    where not tgisinternal
      and tgname like 'fat\_set\_%' escape '\'
      and tgrelid in (
        'fat.claim_groups'::regclass,
        'fat.stations'::regclass,
        'fat.profile_ext'::regclass,
        'fat.payment_components'::regclass
      )
  loop
    -- fat_set_claim_groups_updated_at → set_claim_groups_updated_at  (etc.)
    execute format(
      'alter trigger %I on %s rename to %I',
      r.tgname,
      r.relname,
      regexp_replace(r.tgname, '^fat_', '')
    );
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. MOVE / RECREATE THE VIEW  fat_payment_summary → fat.payment_summary
-- Views track underlying tables by OID, so a SET SCHEMA on the view continues
-- to work transparently. To keep the source SQL aligned with the new names,
-- we drop and recreate.
-- ─────────────────────────────────────────────────────────────────────────────

drop view if exists public.fat_payment_summary;
drop view if exists fat.fat_payment_summary;
drop view if exists fat.payment_summary;

create view fat.payment_summary as
select
  user_id,
  financial_year_id,
  tax_year_label,
  count(*)                                                            as total_components,
  sum(component_amount)                                               as total_amount,
  sum(component_amount) filter (where payment_status = 'Paid')        as paid_amount,
  sum(component_amount) filter (where payment_status = 'Pending')     as pending_amount,
  count(*)              filter (where payment_method = 'Payslip')     as payslip_component_count,
  sum(component_amount) filter (where payment_method = 'Payslip')     as payslip_amount,
  count(*)              filter (where payment_method = 'Petty Cash')  as petty_cash_component_count,
  sum(component_amount) filter (where payment_method = 'Petty Cash')  as petty_cash_amount,
  count(*)              filter (where payment_status = 'Pending')     as pending_component_count,
  count(*)              filter (where payment_status = 'Paid')        as paid_component_count,
  min(created_at)                                                     as earliest_component_at,
  max(payment_date)                                                   as latest_payment_date
from fat.payment_components
group by user_id, financial_year_id, tax_year_label;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RECREATE RPC FUNCTIONS IN  fat  SCHEMA
-- Function bodies contain hard-coded schema-qualified table names, so we drop
-- the old public.fat_* variants entirely and define fresh fat.* versions.
-- ─────────────────────────────────────────────────────────────────────────────

drop function if exists public.fat_increment_claim_sequence(uuid, uuid, text);
drop function if exists fat.fat_increment_claim_sequence(uuid, uuid, text);
drop function if exists fat.increment_claim_sequence(uuid, uuid, text);

create or replace function fat.increment_claim_sequence(
  p_user_id           uuid,
  p_financial_year_id uuid,
  p_claim_type        text
)
returns integer
language plpgsql
security definer
set search_path = fat, public
as $$
declare
  v_seq integer;
begin
  insert into fat.claim_sequences (user_id, financial_year_id, claim_type, next_seq)
  values (p_user_id, p_financial_year_id, p_claim_type, 2)
  on conflict (user_id, financial_year_id, claim_type)
  do update set next_seq = fat.claim_sequences.next_seq + 1
  returning next_seq - 1 into v_seq;

  if v_seq is null then
    v_seq := 1;
  end if;

  return v_seq;
end;
$$;

grant execute on function fat.increment_claim_sequence(uuid, uuid, text)
  to anon, authenticated, service_role;


drop function if exists public.fat_derive_parent_payment_status(uuid);
drop function if exists fat.fat_derive_parent_payment_status(uuid);
drop function if exists fat.derive_parent_payment_status(uuid);

create or replace function fat.derive_parent_payment_status(
  p_group_id uuid
)
returns text
language sql
stable
security definer
set search_path = fat, public
as $$
  select
    case
      when count(*) = 0                                          then 'Pending'
      when count(*) filter (where payment_status = 'Pending') = 0 then 'Paid'
      else                                                            'Pending'
    end
  from fat.payment_components
  where claim_group_id = p_group_id;
$$;

grant execute on function fat.derive_parent_payment_status(uuid)
  to anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RE-APPLY GRANTS ON RELOCATED TABLES
-- ALTER ... SET SCHEMA preserves existing privileges, but rerunning the grants
-- guarantees PostgREST can read the relocated objects via the standard roles.
-- ─────────────────────────────────────────────────────────────────────────────

grant all on all tables    in schema fat to anon, authenticated, service_role;
grant all on all sequences in schema fat to anon, authenticated, service_role;
grant all on all functions in schema fat to anon, authenticated, service_role;
grant all on all routines  in schema fat to anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ASK POSTGREST TO RELOAD ITS SCHEMA CACHE
-- This is a no-op if `fat` has not yet been added to the project's exposed
-- schemas list, but ensures the new objects appear immediately once it has.
-- ─────────────────────────────────────────────────────────────────────────────

notify pgrst, 'reload schema';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. POST-MIGRATION VALIDATION
-- Run these in the SQL editor after applying:
--
--   -- All FAT tables are now in `fat`:
--   select schemaname, tablename from pg_tables
--    where tablename in ('financial_years','claim_sequences','claim_groups',
--                        'stations','profile_ext','distance_cache',
--                        'payment_components')
--    order by tablename;
--   -- Expected: 7 rows, all schemaname = 'fat'
--
--   -- No stray fat_* tables remain in public:
--   select tablename from pg_tables
--    where schemaname='public' and tablename like 'fat\_%' escape '\';
--   -- Expected: 0 rows
--
--   -- RLS policies present on each fat table:
--   select schemaname, tablename, policyname from pg_policies
--    where schemaname='fat' order by tablename, policyname;
--   -- Expected: at least one policy per table
--
--   -- Functions live in fat:
--   select routine_schema, routine_name from information_schema.routines
--    where routine_schema='fat' order by routine_name;
--   -- Expected: derive_parent_payment_status, increment_claim_sequence,
--   --           set_updated_at
--
--   -- View exists in fat:
--   select table_schema, table_name from information_schema.views
--    where table_schema='fat';
--   -- Expected: payment_summary
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (manual; only run if you need to revert)
--
--   alter table fat.financial_years    set schema public;
--   alter table public.financial_years rename to fat_financial_years;
--   alter table fat.claim_sequences    set schema public;
--   alter table public.claim_sequences rename to fat_claim_sequences;
--   alter table fat.claim_groups       set schema public;
--   alter table public.claim_groups    rename to fat_claim_groups;
--   alter table fat.stations           set schema public;
--   alter table public.stations        rename to fat_stations;
--   alter table fat.profile_ext        set schema public;
--   alter table public.profile_ext     rename to fat_profile_ext;
--   alter table fat.distance_cache     set schema public;
--   alter table public.distance_cache  rename to fat_distance_cache;
--   alter table fat.payment_components set schema public;
--   alter table public.payment_components rename to fat_payment_components;
--   drop view if exists fat.payment_summary;
--   -- Recreate functions in public from supabase-migration-v2.sql / v3.
--   -- Re-rename triggers back to the fat_ prefix if desired.
--   drop schema if exists fat;
--   notify pgrst, 'reload schema';
--
-- ─────────────────────────────────────────────────────────────────────────────
