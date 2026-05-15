# FAT Schema Migration (v4)

Migration of all Fire Allowance Tracker tables, functions, and views from the
`public` schema (with redundant `fat_` prefix) into a dedicated `fat` schema.

Applied via `supabase-migration-v4-fat-schema.sql`.

---

## Renamed resources

### Tables

| Before                              | After                       |
| ----------------------------------- | --------------------------- |
| `public.fat_financial_years`        | `fat.financial_years`       |
| `public.fat_claim_sequences`        | `fat.claim_sequences`       |
| `public.fat_claim_groups`           | `fat.claim_groups`          |
| `public.fat_stations`               | `fat.stations`              |
| `public.fat_profile_ext`            | `fat.profile_ext`           |
| `public.fat_distance_cache`         | `fat.distance_cache`        |
| `public.fat_payment_components`     | `fat.payment_components`    |

### Views

| Before                              | After                       |
| ----------------------------------- | --------------------------- |
| `public.fat_payment_summary`        | `fat.payment_summary`       |

### Functions

| Before                                       | After                                  |
| -------------------------------------------- | -------------------------------------- |
| `public.fat_set_updated_at()`                | `fat.set_updated_at()`                 |
| `public.fat_increment_claim_sequence(...)`   | `fat.increment_claim_sequence(...)`    |
| `public.fat_derive_parent_payment_status()`  | `fat.derive_parent_payment_status()`   |

### Triggers

All `fat_set_*_updated_at` triggers were renamed to `set_*_updated_at` on
their relocated tables.

### Unchanged (shared public tables)

These tables remain in `public` because they are not FAT-owned:

- `public.profiles`
- `public.recalls`
- `public.retain`
- `public.standby`
- `public.spoilt`
- `public.station_distances`
- `public.fire_allowance_user_rates`

Foreign keys from these tables to the moved FAT tables continue to work — they
are tracked by OID and are unaffected by `ALTER ... SET SCHEMA`.

---

## Required Supabase config change

For the Supabase JS client to reach the new schema, the project must expose
`fat` to PostgREST.

**Supabase Dashboard → Project Settings → API → Exposed schemas**

Add `fat` to the comma-separated list. Example after change:

```
public, storage, graphql_public, fat
```

Click **Save**. PostgREST reloads its schema cache automatically. The
migration script also issues `NOTIFY pgrst, 'reload schema'` as a belt-and-
braces measure.

Without this config change, `supabase.schema('fat')` calls will fail with
"schema must be one of the following" errors.

---

## Client code pattern

`lib/supabaseClient.js` now exports both clients:

```js
import { supabase, fatDb } from '@/lib/supabaseClient'

// Shared/public tables — use `supabase` as before
supabase.from('profiles').select('*')
supabase.from('recalls').select('*')

// FAT-owned tables — use `fatDb`
fatDb.from('claim_groups').insert({ ... })
fatDb.rpc('increment_claim_sequence', { ... })
```

`fatDb` is just `supabase.schema('fat')`.

---

## Apply order

1. Apply `supabase-migration-v4-fat-schema.sql` in the Supabase SQL editor (or
   via the CLI).
2. Update the dashboard "Exposed schemas" list to include `fat`.
3. Deploy the app code in this branch. The client now points at `fat.*`.

If you flip step 3 before step 1, every FAT request will 404 because
`fat.claim_groups` does not yet exist.

---

## Rollback

See the commented rollback block at the bottom of
`supabase-migration-v4-fat-schema.sql`. Reverting is metadata-only and
preserves data.
