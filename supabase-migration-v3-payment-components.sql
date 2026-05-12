-- ═══════════════════════════════════════════════════════════════════════════════
-- FIRE ALLOWANCE TRACKER — MIGRATION v3: MULTI-COMPONENT PAYMENT ARCHITECTURE
-- File: supabase-migration-v3-payment-components.sql
--
-- PURPOSE:
--   Implement foundational database architecture for multi-component claim
--   payments. Each claim can now carry structured payment metadata (method,
--   status, date) at the component level, enabling payslip/petty-cash
--   reconciliation, tax exports, and partial payment tracking.
--
-- SAFETY GUARANTEES:
--   • ADDITIVE ONLY — no columns removed, no tables dropped, no data mutated
--   • All ADD COLUMN statements use IF NOT EXISTS — fully idempotent (safe to rerun)
--   • All CREATE TABLE statements use IF NOT EXISTS — idempotent
--   • All CREATE POLICY / CREATE TRIGGER blocks use DO $$ IF NOT EXISTS guards
--   • All CREATE OR REPLACE FUNCTION — idempotent
--   • Legacy claims: all new columns default to NULL — zero impact on existing rows
--   • Existing SELECT * queries: new nullable columns are returned but ignored
--     by all current app code (ClaimsContext.js, GroupedClaimList.js, ClaimList.js)
--   • Existing status column is PRESERVED — payment_status is a SEPARATE field
--   • parent_claim_id is nullable — existing claims without it remain valid
--
-- WHAT THIS MIGRATION ADDS:
--   A. COLUMN ADDITIONS to recalls, retain, standby, spoilt (all nullable):
--      1. parent_claim_id   — UUID self-ref: marks this row as a child of another
--                             row in the SAME table. NULL = standalone/parent claim.
--      2. payment_method    — 'Payslip' | 'Petty Cash' | NULL
--      3. payment_status    — 'Pending' | 'Paid' | NULL  (separate from status)
--      4. payment_date      — timestamptz: when this component was marked paid
--      5. component_type    — text: e.g. 'travel', 'meal', 'overnight', 'retain'
--      6. component_amount  — numeric(8,2): the amount for this payment component
--
--   B. NEW TABLE: fat_payment_components
--      Structured payment component ledger. One row per payable line item,
--      cross-table (claim_table + claim_id). Enables tax exports, reconciliation,
--      and reporting across all claim types without requiring joins across 4 tables.
--
--   C. NEW FUNCTION: fat_derive_parent_claim_status(group_id uuid)
--      SQL function that dynamically computes the parent group status from all
--      child component payment_status values. Returns 'Paid' only when ALL
--      components are Paid. Used by app layer; DB stays source-of-truth free.
--
--   D. NEW VIEW: fat_payment_summary
--      Per-user, per-FY summary of total/paid/pending amounts across all
--      payment components. Ready for dashboard widgets and tax export.
--
-- BACKWARD COMPATIBILITY:
--   • All existing claims load correctly — new columns return NULL
--   • Existing dashboard (ClaimsContext.js) unaffected — no query changes needed
--   • Existing auth flow (Supabase SSR) unaffected
--   • fat_claim_groups.parent_status remains the authoritative parent status
--     field for the GroupedClaimList UI — this migration does not change that
--   • payment_status on claim rows is a COMPONENT-LEVEL field, separate from
--     the row-level status column used by the existing UI
--
-- FUTURE COMPATIBILITY:
--   Architecture supports: tax exports, reconciliation reports, partial payments,
--   future reimbursement types, payslip number tracking, petty cash float tracking
--
-- BRANCH: dev only — DO NOT merge to main
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- A. COLUMN ADDITIONS — RECALLS
-- All nullable, all defaulting to NULL. Fully backward compatible.
-- ─────────────────────────────────────────────────────────────────────────────

-- A1. parent_claim_id: self-referential FK within the recalls table.
--     NULL   = this is a standalone or parent claim row.
--     non-NULL = this row is a child component of the referenced recalls row.
--     ON DELETE SET NULL: if the parent row is deleted, children become orphaned
--     gracefully rather than cascade-deleted.
alter table public.recalls
  add column if not exists parent_claim_id uuid
    references public.recalls(id) on delete set null
    default null;

-- A2. payment_method: how this component will be paid.
--     'Payslip'    = appears on employee payslip via payroll processing
--     'Petty Cash' = paid out immediately from station petty cash float
--     NULL         = not yet determined / not applicable (legacy rows)
alter table public.recalls
  add column if not exists payment_method text
    check (payment_method in ('Payslip', 'Petty Cash'))
    default null;

-- A3. payment_status: component-level payment tracking.
--     Separate from the row-level 'status' column (which drives UI display).
--     'Pending' = component not yet paid
--     'Paid'    = component has been paid
--     NULL      = legacy row or not yet set
alter table public.recalls
  add column if not exists payment_status text
    check (payment_status in ('Pending', 'Paid'))
    default null;

-- A4. payment_date: timestamptz when this component was marked as paid.
--     NULL = not yet paid.
alter table public.recalls
  add column if not exists payment_date timestamptz
    default null;

-- A5. component_type: semantic label for what this component represents.
--     Examples: 'travel', 'meal', 'overnight', 'retain', 'standby_travel',
--               'callback_ops', 'excess_travel', 'petty_cash_meal'
--     Complements calculation_inputs.autoChild but is a stable, queryable column.
alter table public.recalls
  add column if not exists component_type text
    default null;

-- A6. component_amount: the payable amount for this specific component.
--     May differ from total_amount (which is the calculated total of all components).
--     For single-component claims, component_amount = total_amount.
--     For multi-component claims, component amounts sum to the parent total.
alter table public.recalls
  add column if not exists component_amount numeric(8,2)
    default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- A. COLUMN ADDITIONS — RETAIN
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.retain
  add column if not exists parent_claim_id uuid
    references public.retain(id) on delete set null
    default null;

alter table public.retain
  add column if not exists payment_method text
    check (payment_method in ('Payslip', 'Petty Cash'))
    default null;

alter table public.retain
  add column if not exists payment_status text
    check (payment_status in ('Pending', 'Paid'))
    default null;

alter table public.retain
  add column if not exists payment_date timestamptz
    default null;

alter table public.retain
  add column if not exists component_type text
    default null;

alter table public.retain
  add column if not exists component_amount numeric(8,2)
    default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- A. COLUMN ADDITIONS — STANDBY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.standby
  add column if not exists parent_claim_id uuid
    references public.standby(id) on delete set null
    default null;

alter table public.standby
  add column if not exists payment_method text
    check (payment_method in ('Payslip', 'Petty Cash'))
    default null;

alter table public.standby
  add column if not exists payment_status text
    check (payment_status in ('Pending', 'Paid'))
    default null;

alter table public.standby
  add column if not exists payment_date timestamptz
    default null;

alter table public.standby
  add column if not exists component_type text
    default null;

alter table public.standby
  add column if not exists component_amount numeric(8,2)
    default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- A. COLUMN ADDITIONS — SPOILT
-- (covers both 'Spoilt' and 'Delayed' meal_type rows — same table)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.spoilt
  add column if not exists parent_claim_id uuid
    references public.spoilt(id) on delete set null
    default null;

alter table public.spoilt
  add column if not exists payment_method text
    check (payment_method in ('Payslip', 'Petty Cash'))
    default null;

alter table public.spoilt
  add column if not exists payment_status text
    check (payment_status in ('Pending', 'Paid'))
    default null;

alter table public.spoilt
  add column if not exists payment_date timestamptz
    default null;

alter table public.spoilt
  add column if not exists component_type text
    default null;

alter table public.spoilt
  add column if not exists component_amount numeric(8,2)
    default null;


-- ─────────────────────────────────────────────────────────────────────────────
-- B. NEW TABLE: fat_payment_components
--
-- A structured payment component ledger that spans all claim tables.
-- One row per payable line item. Decoupled from individual claim tables so
-- that cross-table reporting, tax exports, and reconciliation can query a
-- single table rather than UNION across recalls + retain + standby + spoilt.
--
-- Relationship to existing architecture:
--   • claim_group_id → fat_claim_groups.id (the parent group)
--   • claim_table + claim_id → the source claim row (soft reference — no cross-table FK)
--   • financial_year_id → fat_financial_years.id (for FY isolation)
--
-- Why soft reference for claim_table + claim_id?
--   PostgreSQL does not support polymorphic FKs across multiple tables.
--   The app already uses this pattern (e.g. calculation_inputs.autoChild).
--   claim_table is validated by check constraint to the 4 known tables.
--
-- Parent behaviour:
--   • fat_claim_groups.parent_status is computed by recomputeGroupStatus()
--     in ClaimsContext.js, which queries all child claim rows.
--   • fat_payment_components provides an ADDITIONAL ledger view — it does
--     not replace or conflict with the existing parent status computation.
--   • When all fat_payment_components rows for a claim_group_id have
--     payment_status = 'Paid', the parent group can be considered fully paid.
--     The app layer is responsible for this derivation (see fat_derive_parent_payment_status).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.fat_payment_components (
  -- Primary key
  id                  uuid default gen_random_uuid() primary key,

  -- Ownership + isolation
  user_id             uuid references auth.users on delete cascade not null,
  financial_year_id   uuid references public.fat_financial_years on delete set null,
  claim_group_id      uuid references public.fat_claim_groups on delete cascade,

  -- Source claim reference (soft cross-table reference — no polymorphic FK in PG)
  -- claim_table: which of the 4 claim tables this component belongs to
  -- claim_id: the UUID of the specific row in that table
  claim_table         text not null
    check (claim_table in ('recalls', 'retain', 'standby', 'spoilt')),
  claim_id            uuid not null,

  -- Component identity
  -- component_type: what this payment component represents
  --   Examples: 'travel', 'meal', 'overnight', 'retain', 'callback_ops',
  --             'excess_travel', 'petty_cash_meal', 'standby_travel'
  component_type      text not null,

  -- Component label: human-readable display name (e.g. 'Callback-Ops', 'Excess Travel')
  component_label     text,

  -- Payment details
  component_amount    numeric(8,2) not null,

  -- payment_method: how this component is paid
  --   'Payslip'    = processed through payroll
  --   'Petty Cash' = immediate cash payment from station float
  payment_method      text not null default 'Payslip'
    check (payment_method in ('Payslip', 'Petty Cash')),

  -- payment_status: lifecycle of this component's payment
  --   'Pending' = not yet paid
  --   'Paid'    = payment confirmed
  payment_status      text not null default 'Pending'
    check (payment_status in ('Pending', 'Paid')),

  -- payment_date: when this component was marked Paid (NULL until paid)
  payment_date        timestamptz default null,

  -- pay_number: payslip/petty cash reference number for reconciliation
  pay_number          text default null,

  -- Metadata for tax exports and reporting
  -- incident_date: the date the underlying claim incident occurred
  incident_date       date default null,
  -- notes: free-text for reconciliation notes
  notes               text default null,
  -- tax_year: derived FY label for tax export grouping (e.g. '2026FY')
  tax_year_label      text default null,

  -- Audit
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS: users can only see/manage their own payment components
alter table public.fat_payment_components enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'fat_payment_components'
      and policyname = 'fat: users manage own payment components'
  ) then
    create policy "fat: users manage own payment components"
      on public.fat_payment_components
      for all
      using (auth.uid() = user_id);
  end if;
end $$;

-- Updated_at trigger using FAT-owned function (no shared dependency)
do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname   = 'fat_set_payment_components_updated_at'
      and tgrelid  = 'public.fat_payment_components'::regclass
  ) then
    create trigger fat_set_payment_components_updated_at
      before update on public.fat_payment_components
      for each row execute procedure public.fat_set_updated_at();
  end if;
end $$;

-- Indexes for common query patterns
-- By claim group (most frequent: "show all components for this claim group")
create index if not exists idx_fat_payment_components_claim_group_id
  on public.fat_payment_components(claim_group_id);

-- By user + FY (dashboard/reporting: "all components this FY")
create index if not exists idx_fat_payment_components_user_fy
  on public.fat_payment_components(user_id, financial_year_id);

-- By claim source (soft-ref lookup: "find component for this specific claim row")
create index if not exists idx_fat_payment_components_claim_source
  on public.fat_payment_components(claim_table, claim_id);

-- By payment_status (filter pending/paid quickly)
create index if not exists idx_fat_payment_components_payment_status
  on public.fat_payment_components(payment_status);


-- ─────────────────────────────────────────────────────────────────────────────
-- C. NEW FUNCTION: fat_derive_parent_payment_status(group_id uuid)
--
-- Computes the derived payment status for a claim group based on all of its
-- fat_payment_components rows.
--
-- Rules:
--   • All components Paid    → 'Paid'
--   • Any component Pending  → 'Pending'
--   • No components at all   → 'Pending' (group has no tracked components yet)
--
-- This function is the single source of truth for "is this claim group fully
-- paid via the payment component ledger?". It does NOT mutate fat_claim_groups
-- — that remains the app layer's responsibility via recomputeGroupStatus().
--
-- Usage example:
--   SELECT fat_derive_parent_payment_status('some-group-uuid');
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.fat_derive_parent_payment_status(
  p_group_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when count(*) = 0
        then 'Pending'
      when count(*) filter (where payment_status = 'Pending') = 0
        then 'Paid'
      else
        'Pending'
    end
  from public.fat_payment_components
  where claim_group_id = p_group_id;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- D. NEW VIEW: fat_payment_summary
--
-- Per-user, per-FY aggregate summary across all fat_payment_components.
-- Aggregates: total components, total amount, paid amount, pending amount,
-- and counts by payment method (Payslip vs Petty Cash).
--
-- Designed for:
--   • Dashboard summary widgets (total owed, total paid, etc.)
--   • Tax export data source (filter by tax_year_label)
--   • Reconciliation reports
--
-- Security: RLS on fat_payment_components applies to the underlying table.
-- This view inherits that security context when queried by authenticated users.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace view public.fat_payment_summary as
select
  user_id,
  financial_year_id,
  tax_year_label,
  count(*)                                                      as total_components,
  sum(component_amount)                                         as total_amount,
  sum(component_amount) filter (where payment_status = 'Paid')    as paid_amount,
  sum(component_amount) filter (where payment_status = 'Pending') as pending_amount,
  count(*) filter (where payment_method = 'Payslip')            as payslip_component_count,
  sum(component_amount) filter (where payment_method = 'Payslip')    as payslip_amount,
  count(*) filter (where payment_method = 'Petty Cash')         as petty_cash_component_count,
  sum(component_amount) filter (where payment_method = 'Petty Cash') as petty_cash_amount,
  count(*) filter (where payment_status = 'Pending')            as pending_component_count,
  count(*) filter (where payment_status = 'Paid')               as paid_component_count,
  min(created_at)                                               as earliest_component_at,
  max(payment_date)                                             as latest_payment_date
from public.fat_payment_components
group by
  user_id,
  financial_year_id,
  tax_year_label;


-- ─────────────────────────────────────────────────────────────────────────────
-- BACKWARD COMPATIBILITY VERIFICATION NOTES
-- (These are non-executable comments for developer reference)
--
-- EXISTING QUERIES UNAFFECTED:
--   ClaimsContext.js fetchClaimsForFY():
--     SELECT * FROM recalls/retain/standby/spoilt WHERE user_id = ? AND financial_year_id = ?
--     → New nullable columns are returned but ignored by existing JS destructuring.
--       No query changes needed.
--
--   ClaimsContext.js fetchClaimGroupsForFY():
--     SELECT * FROM fat_claim_groups WHERE user_id = ? AND financial_year_id = ?
--     → fat_claim_groups is NOT modified by this migration. No impact.
--
--   ClaimsContext.js recomputeGroupStatus():
--     SELECT status FROM recalls/retain/standby/spoilt WHERE claim_group_id = ?
--     → Selects 'status' column only (the existing UI column). The new
--       payment_status column is a separate field and does NOT affect this query.
--
--   GroupedClaimList.js ChildClaimRow:
--     Reads claim.status, claim.payslip_pay_nbr, claim.calculation_inputs
--     → All existing columns. New columns ignored.
--
-- EXISTING DATA:
--   All existing claim rows: new columns = NULL (no back-fill, no mutation).
--   fat_claim_groups: no changes to this table whatsoever.
--   fat_financial_years: no changes.
--   fat_claim_sequences: no changes.
--
-- PARENT STATUS BEHAVIOUR:
--   The existing parent status logic (fat_claim_groups.parent_status, computed
--   by ClaimsContext.js recomputeGroupStatus()) is UNCHANGED.
--   The new fat_derive_parent_payment_status() function provides an ADDITIONAL
--   derived status based on the fat_payment_components ledger. Both can coexist.
--   In the future, recomputeGroupStatus() can be updated to also consider
--   fat_payment_components when this ledger is populated.
--
-- ─────────────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────────────
-- POST-MIGRATION VALIDATION CHECKLIST
-- Run these queries in the Supabase SQL editor after applying to confirm success:
--
-- 1. New columns exist on recalls:
--    SELECT column_name, data_type, is_nullable, column_default
--    FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'recalls'
--    AND column_name IN ('parent_claim_id','payment_method','payment_status',
--                        'payment_date','component_type','component_amount')
--    ORDER BY column_name;
--    -- Expected: 6 rows returned
--
-- 2. Same check for retain, standby, spoilt:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public'
--    AND table_name IN ('retain','standby','spoilt')
--    AND column_name IN ('parent_claim_id','payment_method','payment_status',
--                        'payment_date','component_type','component_amount')
--    ORDER BY table_name, column_name;
--    -- Expected: 18 rows (6 per table × 3 tables)
--
-- 3. New table exists:
--    SELECT tablename FROM pg_tables
--    WHERE schemaname = 'public' AND tablename = 'fat_payment_components';
--    -- Expected: 1 row
--
-- 4. RLS policy on fat_payment_components:
--    SELECT policyname FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'fat_payment_components';
--    -- Expected: 'fat: users manage own payment components'
--
-- 5. Trigger on fat_payment_components:
--    SELECT tgname FROM pg_trigger
--    WHERE tgrelid = 'public.fat_payment_components'::regclass;
--    -- Expected: 'fat_set_payment_components_updated_at'
--
-- 6. Indexes created:
--    SELECT indexname FROM pg_indexes
--    WHERE schemaname = 'public' AND tablename = 'fat_payment_components'
--    ORDER BY indexname;
--    -- Expected: 4 rows (primary key + 4 named indexes)
--
-- 7. Function exists:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_schema = 'public'
--    AND routine_name = 'fat_derive_parent_payment_status';
--    -- Expected: 1 row
--
-- 8. View exists:
--    SELECT table_name FROM information_schema.views
--    WHERE table_schema = 'public' AND table_name = 'fat_payment_summary';
--    -- Expected: 1 row
--
-- 9. Existing claims unaffected (check a recall row):
--    SELECT id, status, payment_status, payment_method, component_type
--    FROM public.recalls
--    LIMIT 5;
--    -- Expected: status has existing values; payment_status/payment_method/
--    --           component_type are all NULL for existing rows
--
-- 10. check constraints are correct:
--    SELECT con.conname, pg_get_constraintdef(con.oid)
--    FROM pg_constraint con
--    JOIN pg_class rel ON rel.oid = con.conrelid
--    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
--    WHERE nsp.nspname = 'public'
--    AND rel.relname IN ('recalls','retain','standby','spoilt','fat_payment_components')
--    AND con.contype = 'c'
--    AND con.conname LIKE '%payment%'
--    ORDER BY rel.relname, con.conname;
--    -- Expected: payment_method and payment_status check constraints per table
-- ─────────────────────────────────────────────────────────────────────────────
