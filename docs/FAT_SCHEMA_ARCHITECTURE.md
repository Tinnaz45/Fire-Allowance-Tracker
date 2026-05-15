# Fire Allowance Tracker — Schema Architecture

> Authoritative reference for FAT's PostgreSQL surface in Supabase.
> Every FAT-owned table, function, RPC, trigger and policy lives in the
> `fat` schema. Only Supabase auth and other apps' shared resources remain
> in `public`.

## Schema ownership map

| Schema   | Ownership                                                           |
|----------|---------------------------------------------------------------------|
| `auth`   | Supabase-managed authentication (do not touch).                     |
| `public` | Cross-app shared resources only (`profiles`, other tenants' tables).|
| `fat`    | **Everything Fire Allowance Tracker owns.**                          |

The Supabase project hosts multiple apps in one database (FAT, MICA,
CAB, …). The `fat` schema is the FAT app boundary.

## FAT-owned resources

All in the `fat` schema:

### Tables

| Table                     | Purpose                                                       |
|---------------------------|---------------------------------------------------------------|
| `fat.financial_years`     | Per-user FY workspaces (one row marked active).               |
| `fat.claim_sequences`     | Atomic per-FY, per-claim-type sequence counters.              |
| `fat.claim_groups`        | Parent claim group rows (one per user-initiated claim).       |
| `fat.stations`            | Station reference data (48 rows seed; read-only for users).   |
| `fat.profile_ext`         | FAT-specific per-user profile (station, platoon, address …).  |
| `fat.distance_cache`      | v1 per-user home→station distance cache.                      |
| `fat.home_address`        | v4 geocoded home address (one row per user).                  |
| `fat.station_distances`   | v4 user-specific home→station distance estimates.             |
| `fat.recalls`             | Recall claim rows (parent + auto-generated child components). |
| `fat.retain`              | Retain (maint stn N/N) claim rows.                            |
| `fat.standby`             | Standby and M&D claim rows.                                   |
| `fat.spoilt_meals`        | Spoilt + Delayed meal rows (`meal_type` discriminator).       |
| `fat.user_rates`          | Per-user allowance rate overrides (defaults in `defaultRates.js`). |

### Functions

| Function                                                       | Purpose                                                |
|----------------------------------------------------------------|--------------------------------------------------------|
| `fat.set_updated_at()`                                         | Trigger function bumping `updated_at` on UPDATE.       |
| `fat.increment_claim_sequence(user_id, fy_id, claim_type)`     | Atomic next-claim-number issuer (RPC).                 |

### Triggers

`set_updated_at BEFORE UPDATE` on every FAT table that has an
`updated_at` column.

### RLS Policies

* `users_manage_own` — `FOR ALL USING (auth.uid() = user_id) WITH CHECK (...)` —
  applied to every per-user FAT table.
* `fat.stations.authenticated_read` — `FOR SELECT USING (auth.role() = 'authenticated')`.
* `fat.stations.service_role_manage` — `FOR ALL` for the service role only.

RLS is enabled on every FAT table.

## Public / shared resources used by FAT

| Resource           | Notes                                                                    |
|--------------------|--------------------------------------------------------------------------|
| `auth.users`       | Supabase auth source-of-truth for `user_id` FKs.                         |
| `public.profiles`  | Shared cross-app profile (first/last name). FAT-specific fields live in `fat.profile_ext`. |

Nothing else in `public` is touched by FAT.

## Naming conventions

* All table, column, function, trigger and policy names are `snake_case`.
* No table or function carries a `fat_` prefix — schema namespacing
  replaces the redundant prefix.
* Junction discriminators use a `_type` suffix (`meal_type`,
  `claim_type`, …).
* Triggers maintaining `updated_at` are uniformly named `set_updated_at`.
* Per-user RLS policies are uniformly named `users_manage_own`.

## Client access pattern

All FAT queries go through a schema-scoped Supabase client:

```js
import { supabase, fat } from '@/lib/supabaseClient'

// Auth + cross-app tables — public schema
await supabase.from('profiles').select(...)

// Every FAT table — fat schema, no fat_ prefix on names
await fat.from('claim_groups').select(...)
await fat.from('spoilt_meals').insert(...)
await fat.rpc('increment_claim_sequence', { ... })
```

Source: [`lib/supabaseClient.js`](../lib/supabaseClient.js).

## Spoilt vs Delayed meals

The app exposes `spoilt` and `delayed_meal` as separate top-level claim
types in the UI dropdown, but they share `fat.spoilt_meals` with a
`meal_type` discriminator (`'Spoilt' | 'Delayed'`). The mapping is
centralised in [`lib/claims/claimTypes.js`](../lib/claims/claimTypes.js):

```js
spoilt       → fat.spoilt_meals, meal_type = 'Spoilt'
delayed_meal → fat.spoilt_meals, meal_type = 'Delayed'
```

This is a single-table single-write architecture. Splitting into
two separate physical tables was considered and rejected — it would
add an unnecessary union read on every claim load with no row-level
benefit.

## PostgREST exposure

Supabase PostgREST must expose the `fat` schema for client queries to
reach it. **This is a one-time manual step:**

* **Dashboard → Project Settings → API → Exposed schemas**
  → add `fat` alongside `public`.

After saving, PostgREST hot-reloads automatically; no app restart
needed. If a query against `fat.*` returns *“The schema must be one of
the following: public, …”*, the schema has not been added.

## Migration notes

* The migration was applied to the **DEV** Supabase project
  (`kctctvpobbizhkiqkgqw`) via MCP migration `fat_schema_migration` and
  follow-up `fat_function_bodies_fix`.
* No data was lost — every FAT table was moved with `ALTER TABLE … SET
  SCHEMA fat` and renamed cleanly. FK constraints, indexes and triggers
  followed automatically; index/constraint names were renamed for
  consistency and triggers were recreated against `fat.set_updated_at`.
* `public.station_distances` (v1 inter-station cache, 0 rows, no code
  references) was dropped — `fat.distance_cache` and
  `fat.station_distances` superseded it.
* `public.set_updated_at()` was dropped — it had no callers outside the
  FAT triggers we replaced.
* The migration has **not** been applied to PROD
  (`wgcqzamuspuqpedqasbc`). PROD still uses the legacy `public.fat_*`
  layout. Re-run [`supabase/fat-schema.sql`](../supabase/fat-schema.sql)
  manually or replay the MCP migration when promoting.
* The earlier file
  `supabase-migration-v3-payment-components.sql` (multi-component
  payments, `fat_payment_components` ledger, `fat_payment_summary` view)
  was never applied. The columns it introduced on the claim tables
  (`payment_status`, `payment_date`, `parent_claim_id`,
  `payment_method`, `component_type`, `component_amount`) are present
  in the live schema; the ledger table itself is not. The ledger
  references in `lib/claims/ClaimsContext.js#updatePaymentStatus` are
  defensively try/catch-wrapped and silently skip when the table is
  absent.
