# Friend System & Claim-Draft Replication — Architecture

## Mission constraints (recap)

This feature is **not** a shared-claim system. Replication produces fully
independent claim rows owned by the recipient. Once a draft is replicated:

- The source and replica are decoupled. No FK links the rows.
- Editing one user’s claim never affects another’s.
- No live sync, no shared mutable state, no cross-user claim ownership.
- The audit table `fat.claim_replication_events` is observational only —
  it is never consulted to drive UI state changes between users.

---

## Schema (additive)

All new tables live in the existing `fat` schema. Nothing in the public
schema or the existing claim tables was modified.

### `fat.friend_requests`

| col                 | type          | notes                                                              |
| ------------------- | ------------- | ------------------------------------------------------------------ |
| id                  | uuid PK       | default `gen_random_uuid()`                                        |
| sender_user_id      | uuid FK       | `auth.users(id)` on delete cascade                                 |
| recipient_user_id   | uuid FK       | `auth.users(id)` on delete cascade                                 |
| status              | text          | check: `pending`/`accepted`/`rejected`/`cancelled`                 |
| created_at          | timestamptz   | default `now()`                                                    |
| responded_at        | timestamptz   |                                                                    |
| **constraint**      | no_self_friend | `sender_user_id <> recipient_user_id`                              |
| **partial UQ idx**  | pending-only  | one *pending* row per (sender, recipient)                          |

### `fat.friendships` (bidirectional)

Two rows per friendship pair — one with each user as `user_id`. Cleaner
RLS (`user_id = auth.uid()`) and simpler list queries.

| col            | type        | notes                              |
| -------------- | ----------- | ---------------------------------- |
| id             | uuid PK     |                                    |
| user_id        | uuid FK     | owner of the row                   |
| friend_user_id | uuid FK     | the other user                     |
| created_at     | timestamptz | default `now()`                    |
| **UQ**         | (user_id, friend_user_id)                                       |
| **constraint** | no_self_friend                                                  |

### `fat.claim_replication_events` (audit only)

| col                     | type        |
| ----------------------- | ----------- |
| id                      | uuid PK     |
| source_claim_table      | text (one of: `recalls`, `retain`, `standby`, `spoilt_meals`) |
| source_claim_id         | uuid        |
| source_user_id          | uuid FK     |
| recipient_user_id       | uuid FK     |
| replicated_claim_id     | uuid        |
| replicated_claim_table  | text        |
| claim_type              | text        |
| created_at              | timestamptz |
| seen_at                 | timestamptz (set when recipient dismisses banner) |

`replicated_claim_id` is **not** a foreign key. The audit row outlives any
deletion of either claim and never causes cascading behaviour.

---

## RLS

All three new tables have RLS enabled. **No client SQL ever mutates them.**
Every mutation goes through a `SECURITY DEFINER` RPC that re-checks ownership.

| table                       | SELECT policy                                                |
| --------------------------- | ------------------------------------------------------------ |
| `fat.friend_requests`       | sender OR recipient is `auth.uid()`                          |
| `fat.friendships`           | `user_id = auth.uid()`                                       |
| `fat.claim_replication_events` | sender OR recipient is `auth.uid()`                       |

No INSERT/UPDATE/DELETE policies — direct writes blocked by default.

---

## RPC surface

| function                                            | does                                              |
| --------------------------------------------------- | ------------------------------------------------- |
| `fat.search_user_by_email(p_email text)`            | exact (case-insensitive) email lookup, excludes self |
| `fat.send_friend_request(p_recipient_user_id uuid)` | dedupe + no-self + no-already-friends             |
| `fat.accept_friend_request(p_request_id uuid)`      | only the recipient; creates bidirectional friendship rows |
| `fat.reject_friend_request(p_request_id uuid)`      | only the recipient                                |
| `fat.cancel_friend_request(p_request_id uuid)`      | only the sender                                   |
| `fat.remove_friend(p_friend_user_id uuid)`          | deletes both bidirectional rows                   |
| `fat.list_friends_with_profile()`                   | self’s friends + display label                    |
| `fat.list_friend_requests_with_profile()`           | pending requests (incoming + outgoing)            |
| `fat.replicate_claim_to_friends(table, id, uuid[])` | independent draft copies; skips non-friends and self |
| `fat.mark_replication_events_seen(uuid[])`          | dismisses incoming-draft banner                   |

All RPCs are `SECURITY DEFINER` with `set search_path = fat, ...`. They
re-verify `auth.uid()` and ownership inside the function body.

---

## Replication semantics

`fat.replicate_claim_to_friends(p_source_table, p_source_claim_id, p_recipient_ids[])`

For each recipient in `p_recipient_ids`:

1. Skip if recipient is the caller.
2. Verify caller has the recipient as a friend (count check on
   `fat.friendships`). Non-friends are silently skipped — no privilege
   escalation, no information leak.
3. Insert a new row into the same claim table, owned by the recipient,
   with a fresh `gen_random_uuid()`.
4. Append an audit row to `fat.claim_replication_events`.

### Fields copied vs not copied

**Copied (operational metadata):**

| table          | fields                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------- |
| `recalls`      | date, rostered/recall station ids and labels, shift, arrived, notes, incident_number     |
| `retain`       | date, station_id, shift, booked_off_time, rmss_number, is_firecall                       |
| `standby`      | date, standby_type, rostered/standby stn ids, shift, arrived, arrived_time, notes        |
| `spoilt_meals` | date, meal_type, station_id, claim_stn_id, shift, call_time, call_number, incident_time, meal_interrupted, return_to_stn, claim_date |

All replicas start as `status = 'Pending'` (the existing draft equivalent
— no new status was added; check constraints untouched).

**Not copied (per mission constraints):**

- `user_id` → set to recipient
- `id`, `created_at`, `updated_at` → fresh
- `total_amount`, `travel_amount`, `mealie_amount`, `meal_amount`,
  `retain_amount`, `overnight_cash`, `night_mealie`, `adjusted_amount`
- All `*_snapshot`, `calculation_inputs`, `home_address_snap`
- `dist_home_km`, `dist_stn_km`, `dist_km`, `total_km`
- `attachment_url`, `ocr_source`
- `payslip_pay_nbr`, `pay_number`, `payment_status`, `payment_date`
- `claim_number`, `financial_year_id`, `claim_group_id`
- `platoon` (recipient’s platoon is theirs — the source platoon is not
  relevant to the recipient’s calculation)

When the recipient opens the replicated draft and saves it, the existing
`ClaimsContext` flow re-runs the calculation engine against the
**recipient’s** rates, address, station — producing genuinely independent
financial figures.

---

## UI surface

- `app/friends/page.js` — full friend management (search/add/accept/reject/remove)
- `components/friends/FriendPickerModal.js` — post-create flow on the
  dashboard. Skippable.
- `components/friends/IncomingDraftsBanner.js` — dashboard banner that
  lists unseen incoming drafts, with a "Dismiss all" action. The drafts
  themselves are already in the recipient’s claim list as Pending claims.
- Link in `app/profile/page.js` → `/friends`.
- `lib/friends/friendsApi.js` — thin client wrappers.

`ClaimsContext.addClaim()` now returns `{ claimId, claimTable, claimType }`.
The dashboard uses that to pop the picker. `app/new-claim` was left
unchanged (the dashboard NewClaimModal is the active path; `/new-claim`
remains as a secondary entry point and does not yet hook the picker).

---

## Security model

- All client writes blocked by RLS; mutations only via `SECURITY DEFINER` RPCs.
- Each RPC re-authenticates and re-authorises with `auth.uid()` checks.
- Replication explicitly verifies sender ownership of the source claim
  **and** the existence of a friendship row in the caller’s direction.
- `public.profiles` remains locked to self-reads — no policy change. Friend
  discovery happens through `fat.search_user_by_email`, which returns at
  most one row and never enables enumeration.
- The audit table is read-only to the involved parties; never used for
  cross-user side effects.

---

## Known limitations / future improvements

1. **`/new-claim` route** does not yet show the friend picker; only the
   dashboard NewClaimModal does. Trivial follow-up if needed.
2. **No email/push notification** to the recipient. The dashboard banner
   is the only surface — they must open the app to see incoming drafts.
3. **No bulk friend import** (e.g. from a CSV of platoon-mates).
4. **No "remove also removes pending request"** — if A is friends with B,
   A removes B, then sends a fresh request, the partial unique index
   allows that fine. But cancelled/rejected requests linger until manually
   cleaned (acceptable: small data, useful as history).
5. **Profile lookup gap.** `IncomingDraftsBanner` tries `public.profiles`
   directly to label the sender, but RLS will reject other users' rows,
   so the label falls back to "A friend" until we add a
   `fat.lookup_user_display_names(uuid[])` RPC. Cosmetic only.
6. **No undo** for replication. Replicas are independent the moment they
   are created.
7. **Pay-number / employee_id**, address book, and platoon are
   intentionally *never* copied — recipients always provide their own.
