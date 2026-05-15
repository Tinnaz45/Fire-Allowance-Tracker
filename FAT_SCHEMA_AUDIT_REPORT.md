# FAT Schema Runtime Migration — Audit Report

**Date:** 2026-05-15
**Branch:** `claude/jovial-aryabhata-f9461c` (sourced from `dev`, intended for merge → `dev`)
**Merge source:** `origin/claude/migrate-fat-schema-0ravY` (commit `cf2fdf9`)
**Merge method:** Cherry-pick onto `dev` HEAD (`092d988`) with manual conflict resolution.

---

## Status

| Area                              | Status                          |
| --------------------------------- | ------------------------------- |
| `fat.*` DB migration (DEV)        | Already applied (pre-merge)     |
| Runtime client refactor           | **APPLIED to branch**           |
| `next build`                      | **Succeeds** (compiled in ~1s)  |
| Domain isolation (auth/profiles)  | Preserved                       |
| JSX truncation fixes              | Preserved                       |
| Distance-system feature           | Preserved + migrated to `fat.*` |
| Ready for DEV deployment          | YES                             |

---

## Migration approach

Two candidate runtime-refactor commits existed:

| SHA       | Branch                                | Scope                                                                                 |
| --------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `572ebc0` | `claude/migrate-db-schema-KKoIR`      | Earlier, narrower migration (7 tables; left recalls/retain/standby/spoilt in public). |
| `cf2fdf9` | `claude/migrate-fat-schema-0ravY`     | **Canonical superset** — full domain isolation under `fat.*` including claim tables.  |

Both branched from the same parent (`06650dd`). `cf2fdf9` is a complete refactor that
supersedes `572ebc0` (it includes every change from `572ebc0` plus additional tables).
Only `cf2fdf9` was cherry-picked. Applying `572ebc0` afterwards would conflict with no
useful delta.

---

## Conflict resolution log

Cherry-picking `cf2fdf9` onto `dev` HEAD (`092d988`) produced **2 conflicts** (and 2
clean auto-merges) where the dev branch had already moved files for unrelated work:

### `app/profile/page.js` — CONFLICT (resolved)
- **Dev side:** added `home_dist_km` to the `select(...)` list, kept `supabase.from('fat_profile_ext')`.
- **cf2fdf9 side:** switched to `fat.from('profile_ext')` but did not select `home_dist_km`.
- **Resolution:** kept the `fat.from('profile_ext')` schema-scoped client **and** the
  `home_dist_km` column. Both fixes preserved.

### `components/claims/ClaimForm.js` — CONFLICT (resolved)
- **Dev side:** introduced async profile loader with cancellation + `profileLoading` state,
  also fetched station name from `supabase.from('fat_stations')`, plus added
  `StationDistanceField` import.
- **cf2fdf9 side:** simple `.then()` profile loader using `fat.from('profile_ext')`.
- **Resolution:** kept the more robust dev-side async loader **and** the `StationDistanceField`
  import, but switched both DB calls to `fat.from('profile_ext')` and `fat.from('stations')`.
- Import block merged: `import { fat } from '@/lib/supabaseClient'` + `import StationDistanceField from ...`.

### `components/claims/ExpandableClaimList.js` — auto-merged cleanly
### `lib/claims/ClaimsContext.js` — auto-merged cleanly

### Additional runtime fix (beyond `cf2fdf9`):

`lib/distance/addressCache.js` was **not** updated by `cf2fdf9` (the distance system was
added to `dev` after `cf2fdf9` was authored, so the cherry-pick had nothing to update
there). It was still calling:

- `supabase.from('fat_home_address')`
- `supabase.from('fat_station_distances')`

Migrated in-place during this merge to:

- `fat.from('home_address')`
- `fat.from('station_distances')`

This was committed as part of the cherry-pick commit since it is part of the same runtime
refactor logically.

---

## Runtime call-site audit

### `from('fat_*')` residual references

`grep -rn "from\('fat_"` across runtime code (`app/`, `components/`, `lib/`):
**0 hits.** All FAT queries now use the schema-scoped client.

### `public.fat_*` residual references in runtime code

`grep -rn "public\.fat_"` across `app/`, `components/`, `lib/`: **0 hits**.

(Note: `docs/FAT_SCHEMA_ARCHITECTURE.md` references `public.fat_*` once in an explanatory
sentence describing the PROD legacy layout — this is documentation, not a runtime call.
`DISTANCE-SYSTEM-DEPLOY-REPORT.md` and the legacy `supabase-migration-v4-distance-tables.sql`
also contain stale `fat_*` table-name references in their commentary; those are
non-runtime artefacts and the `supabase/fat-schema.sql` file is the authoritative DDL.)

### Per-domain client routing

| Domain             | Client      | Reason                                                  |
| ------------------ | ----------- | ------------------------------------------------------- |
| auth (sign-in/up)  | `supabase`  | `auth.users` lives in the shared `auth` schema          |
| `profiles`         | `supabase`  | shared public table (first/last name only)              |
| `profile_ext`      | `fat`       | FAT-owned profile extension (home, station, platoon)   |
| `stations`         | `fat`       | FAT seed data                                           |
| `home_address`     | `fat`       | FAT distance system                                     |
| `station_distances`| `fat`       | FAT distance system                                     |
| `financial_years`  | `fat`       | FAT financial-year management                           |
| `claim_groups`     | `fat`       | FAT grouped-claim parent                                |
| `recalls`          | `fat`       | FAT claim table                                         |
| `retain`           | `fat`       | FAT claim table                                         |
| `standby`          | `fat`       | FAT claim table                                         |
| `spoilt_meals`     | `fat`       | FAT claim table (handles spoilt + delayed_meal)         |
| `user_rates`       | `fat`       | FAT per-user rate overrides                             |
| `payment_components` | `fat`     | FAT per-component payment ledger                        |
| RPC `increment_claim_sequence` | `fat` | FAT atomic claim-number generator             |

`lib/supabaseClient.js` exports both: `supabase` (default schema: `public`) and
`fat = supabase.schema('fat')`.

---

## Feature subsystem verification (static / compile-time)

Subsystems exercised by the build (route compilation, type-check pass equivalent — note
project has no ESLint installed; TypeScript not used):

| Subsystem            | Compiled? | Notes                                                    |
| -------------------- | --------- | -------------------------------------------------------- |
| auth (login/signup)  | Yes       | Still on `supabase.auth.*` — no change                   |
| profile              | Yes       | Conflict resolved — uses `fat.profile_ext` + `fat.stations` |
| recalls              | Yes       | `fat.recalls` via `CLAIM_TABLES`                         |
| retain               | Yes       | `fat.retain`                                             |
| standby              | Yes       | `fat.standby`                                            |
| spoilt meals         | Yes       | `fat.spoilt_meals` (meal_type='Spoilt')                  |
| delayed meals        | Yes       | `fat.spoilt_meals` (meal_type='Delayed') — virtual type  |
| user rates           | Yes       | `fat.user_rates`                                         |
| FY switching         | Yes       | `fat.financial_years` (load, switch, create)             |
| reconciliation       | Yes       | `lib/reconciliation/*` uses claim shape, schema-agnostic |
| distance estimator   | Yes       | `fat.home_address` + `fat.station_distances`             |
| grouped claims       | Yes       | `fat.claim_groups` + child rows                          |
| station lookups      | Yes       | `fat.stations`                                           |

All routes generated: 14/14 static pages. `Compiled successfully in ~1s.`

**Runtime in-browser behaviour was NOT executed as part of this audit** — that
verification belongs to the DEV deployment. No fake claims of runtime success are made.

---

## Build status

```
> next build
   ▲ Next.js 15.5.15
   Environments: .env.local

 ✓ Compiled successfully in 1018ms
 ✓ Generating static pages (14/14)
```

Benign noise (pre-existing, unrelated):
- `themeColor` metadata-export warning across multiple pages — Next.js 15 prefers it in
  the `viewport` export. Not caused by this migration.
- `sharp-linuxmusl-x64` JSON parse warning — missing Linux .json on Windows host. Cosmetic.
- `ESLint must be installed` — project has no ESLint dep; this is a long-standing config
  state, not a regression introduced here.

---

## Preserved invariants (verified by diff)

- `app/page.js` — outer column wrapper preserved (no regression to the JSX truncation fix at
  `9ebc9fc` / `aeb3249`). Dev branch's version retained intact through cherry-pick.
- Claim list components (`ExpandableClaimList`, `GroupedClaimList`) — distance/grouping logic
  preserved; only DB-call schema scoping changed.
- Distance system (Phase 4) — fully preserved; `addressCache.js` and `StationDistanceField`
  unchanged in shape, only DB client switched.
- Supabase **auth** infrastructure — unchanged (still uses `supabase.auth.*`).
- Supabase **profiles** table (shared `public.profiles`) — unchanged (still `supabase.from('profiles')`).
- `fat.*` schema migration on the DEV Supabase project — not touched. Manual config
  ("Exposed schemas: add `fat`") assumed already in place (this is the same precondition
  that the DB migration imposed).

---

## Out of scope (explicitly NOT done)

- **Merge to `main`** — explicitly excluded.
- **Reverting `fat.*` DB migration** — DB is the authoritative state and remains.
- **PROD deployment** — DEV only. PROD still has legacy `public.fat_*` layout per
  `cf2fdf9` commit message; runtime cannot be promoted to PROD until that schema move is
  applied to the PROD database.
- **Live-browser feature smoke test** — requires a running dev environment with a real
  Supabase session. Not executed here. **No fake "verified in browser" claims.**

---

## Open items for DEV testing

These need an authenticated session to validate end-to-end:

1. Profile load + save round-trip (`fat.profile_ext`).
2. Station picker (`fat.stations`).
3. Create one claim of each type: Recall, Retain, Standby, Spoilt, Delayed Meal.
4. FY switcher: switch between FYs and confirm claims re-load filtered by `financial_year_id`.
5. Distance estimator: a Recall with a station that has no cached `fat.station_distances` row.
6. Grouped-claim reconciliation: mark sub-claim Paid, observe parent `parent_status` recompute.
7. Settings → user rates round-trip (`fat.user_rates`).

---

## Commits on this branch (vs `origin/dev`)

```
8efce33 refactor(db): move FAT-owned resources to dedicated `fat` schema
        └─ cherry-picked from cf2fdf9, with addressCache.js distance-system migration
           folded in, and conflicts in app/profile/page.js + components/claims/ClaimForm.js
           resolved to preserve dev's JSX/feature fixes.
```

`572ebc0` (the narrower earlier migration) intentionally **not** cherry-picked — `cf2fdf9`
is a strict superset.

---

## How to merge into `dev`

```bash
# From a clean working tree on dev:
git checkout dev
git merge --ff-only claude/jovial-aryabhata-f9461c
```

Fast-forwards `dev` by exactly one commit. No additional merge commit needed.
