# Fire Allowance Tracker — Financial Verification Checklist

**Version:** 1.1  
**Created:** 2026-05  
**Last updated:** 2026-05 (large meal, double meal, spoilt meal corrected from FRV historical allowance records; delayed meal flagged UNRESOLVED)  
**Purpose:** Pre-production verification of all allowance rates and calculation formulas against the current FBEU Enterprise Agreement and real payslip examples.  
**Status:** 🔴 NOT CLEARED FOR PRODUCTION — unresolved assumptions remain (see §3 and §4).

---

## How to Use This Document

1. Work through each table in §2 (Rates) and §3 (Formulas).
2. For every row marked ⚠️ ASSUMED or ❓ UNKNOWN — locate the relevant clause in the enterprise agreement and record the confirmed value + clause reference.
3. Provide real payslip / pay advice examples for the §5 placeholders.
4. Update each row's **Source Status** and **Testing Status** columns.
5. Re-run `node lib/calculations/validationScenarios.js` to confirm 41/41 still pass after any rate corrections.
6. Only mark the app "Financially Safe" (bottom of this document) once every row is ✅ CONFIRMED.

---

## §1 — Known Confirmed Rates (Starting Point)

These rates have been confirmed from the FRV historical allowance sheets (FRV Allowances 2023FY, 2025FY, and Current).

| Rate | Confirmed Value | Source |
|---|---|---|
| Small Meal Allowance | $10.90 | User-confirmed from FBEU EA, 2025; also in FRV allowance sheets |
| Kilometre Rate | $1.20/km | User-confirmed from FBEU EA, 2025; also in FRV allowance sheets |
| Large Meal Allowance | $20.55 | Confirmed FRV Allowances 2023FY, 2025FY, Current — flat rate, NOT 2× small |
| Double Meal Allowance | $31.45 | Confirmed FRV Allowances 2023FY, 2025FY, Current |
| Spoilt Meal Allowance | $10.90 | Confirmed FRV Allowances 2023FY, 2025FY, Current |

---

## §2 — Rate Verification Table

Each rate below appears in `lib/calculations/defaultRates.js` and is used by `engine.js`.

### 2.1 Travel

| Rate Key | App Value | Source Status | EA Clause / Evidence Needed | Risk if Wrong | Testing Status |
|---|---|---|---|---|---|
| `kilometreRate` | $1.20/km | ✅ CONFIRMED | User-confirmed from FBEU EA 2025. Review at 1 July annually. | LOW — confirmed | ✅ Covered by validation scenarios |

---

### 2.2 Recall Meal Allowances

| Rate Key | App Value | Source Status | EA Clause / Evidence Needed | Risk if Wrong | Testing Status |
|---|---|---|---|---|---|
| `smallMealAllowance` | $10.90 | ✅ CONFIRMED | User-confirmed from FBEU EA 2025; also in FRV Allowances 2023FY, 2025FY, Current | LOW — confirmed | ✅ Covered by validation scenarios |
| `largeMealAllowance` | $20.55 | ✅ CONFIRMED | Confirmed from FRV Allowances 2023FY, 2025FY, and Current. **Flat rate — not derived from small meal.** Previous derived assumption of $21.80 (2× small) has been corrected. | LOW — confirmed | ✅ Covered by validation scenarios |
| `doubleMealAllowance` | $31.45 | ✅ CONFIRMED | Confirmed from FRV Allowances 2023FY, 2025FY, and Current. | LOW — confirmed | ✅ Covered by validation scenarios |

---

### 2.3 Spoilt / Delayed Meal Allowances

| Rate Key | App Value | Source Status | EA Clause / Evidence Needed | Risk if Wrong | Testing Status |
|---|---|---|---|---|---|
| `spoiltMealAllowance` | $10.90 | ✅ CONFIRMED | Confirmed from FRV Allowances 2023FY, 2025FY, and Current. Previous value of $22.80 (SQL schema default of unknown origin) has been corrected. Historical claims at $22.80 are preserved as-is. | LOW — confirmed | ✅ Covered by validation scenarios |
| `delayedMealAllowance` | $10.90 | ⚠️ UNRESOLVED | **No FRV historical evidence found for delayed meal rate. Current value ($10.90) is a placeholder only. Find the EA clause for "delayed meal" (held past rostered break). Confirm whether it equals Spoilt ($10.90) or is a different amount.** | HIGH — all Delayed claims will use unconfirmed placeholder | ❌ No real-world example to verify; flagged UNRESOLVED |

> **Note (Spoilt):** Rate corrected from $22.80 (unknown-origin SQL default) to $10.90 (confirmed FRV). Historical Spoilt claims stored at $22.80 are unaffected — they are protected by historical claim preservation logic.
>
> **Note (Delayed):** Rate is unresolved. No FRV evidence found. Placeholder of $10.90 is used. Do not rely on Delayed claim calculations for compliance until this is confirmed from the enterprise agreement.

---

### 2.4 Standby Night Meal

| Rate Key | App Value | Source Status | EA Clause / Evidence Needed | Risk if Wrong | Testing Status |
|---|---|---|---|---|---|
| `standbyNightMealAllowance` | $10.90 | ⚠️ ASSUMED | **Assumed to equal smallMealAllowance. Find the EA clause for standby night meal. Confirm it applies equally to Standby and M&D claim types.** | MEDIUM — may be under-paying for night standby claims | ❌ No real-world example to verify |

---

### 2.5 Overnight Allowance

| Rate Key | App Value | Source Status | EA Clause / Evidence Needed | Risk if Wrong | Testing Status |
|---|---|---|---|---|---|
| `overnightAllowance` | $0.00 (default) | ❓ USER-SET | **Default is $0. Users must set their own value in Settings. There is no universally confirmed amount.** Confirm: is there an EA-specified overnight rate, or is it determined per-incident / per-agreement with management? | MEDIUM — users who do not set this will have $0 overnight claims | ⚠️ Not tested against a real payslip example |

---

### 2.6 Retain

| Rate Key | App Value | Source Status | EA Clause / Evidence Needed | Risk if Wrong | Testing Status |
|---|---|---|---|---|---|
| `retainAllowancePerHour` | $0.00 | ❌ UNRESOLVED | **This rate is intentionally zeroed out because the formula is unknown. The retain allowance (base pay for staying past book-off) is currently user-entered manually. Find the EA clause for retain allowance: is it a flat amount per retain event, a per-hour rate, or a percentage of ordinary pay?** | CRITICAL — retain calculations cannot be automated until this is confirmed | ❌ No formula implemented; manual entry only |

---

### 2.7 Non-Monetary Thresholds

These are stored in `defaultRates.js` but not yet used in automated calculations (no auto-entitlement logic is implemented). They are flagged here for future confirmation.

| Key | App Value | Source Status | EA Clause / Evidence Needed | Risk |
|---|---|---|---|---|
| `recallMinimumHours` | 3 hours | ⚠️ ASSUMED | Minimum engagement period on recall. Confirm EA clause. | LOW (not yet used in calculations) |
| `recallMealieThreshold` | 4 hours | ⚠️ ASSUMED | Hours threshold that triggers a meal allowance on recall. Confirm EA clause. | LOW (not yet used; user self-selects) |

---

## §3 — Formula Verification Checklist

### 3.1 Recall Claim

**Formula (engine.js `calcRecallClaim`):**
```
total_km     = dist_home_km + dist_stn_km
travel_amount = round(total_km × kilometreRate)
mealie_amount = round(mealAllowance[mealEntitlement])
total_amount  = round(travel_amount + mealie_amount)
```

| Check | Status | Notes |
|---|---|---|
| Travel: km × $1.20/km | ✅ Formula correct | Confirmed rate |
| Meal: user self-selects none/small/large | ⚠️ ASSUMPTION | **EA likely specifies objective threshold (e.g. "if recall exceeds 4 hours, small meal applies"). Self-selection may not match award entitlement. Confirm the exact trigger conditions.** |
| large meal = 2× small ($21.80) | ⚠️ ASSUMED | Confirm independently — see §2.2 |
| total = travel + meal | ✅ Formula logically correct | No dispute |
| Historical claims never recalculate | ✅ Implemented correctly | Verified in code |

---

### 3.2 Retain Claim

**Formula (engine.js `calcRetainClaim`):**
```
total_amount = round(retainAmount + overnightCash)
```

| Check | Status | Notes |
|---|---|---|
| retainAmount — base retain allowance | ❌ UNRESOLVED | **User-entered only. No formula implemented. EA formula unknown. Must be confirmed before this claim type is reliable.** |
| overnightCash — overnight component | ⚠️ USER-ENTERED | User determines from their own pay advice. Correct by design, but verify with at least one real example. |
| total = retain + overnight | ✅ Formula logically correct | Addition is correct; the issue is the input values |

---

### 3.3 Standby Claim

**Formula (engine.js `calcStandbyClaim`):**
```
travel_amount = round(dist_km × kilometreRate)
night_mealie  = standbyNightMealAllowance  (if night shift)
             = 0                          (if day shift)
total_amount  = round(travel_amount + night_mealie)
```

| Check | Status | Notes |
|---|---|---|
| Travel: km × $1.20/km | ✅ Formula correct | Confirmed rate |
| Night meal = standbyNightMealAllowance ($10.90) | ⚠️ ASSUMED | Confirm EA clause. Also confirm: does this apply equally to Standby and M&D type claims? |
| Standby vs M&D — same rates? | ⚠️ ASSUMED | **App applies identical rates to both. Confirm the EA does not have a separate M&D rate.** |
| total = travel + night_mealie | ✅ Formula logically correct | No dispute |

---

### 3.4 Spoilt / Delayed Meal Claim

**Formula (engine.js `calcSpoiltClaim`):**
```
meal_amount  = rates.spoiltMealAllowance   (if Spoilt)
             = rates.delayedMealAllowance  (if Delayed)
total_amount = meal_amount
```

| Check | Status | Notes |
|---|---|---|
| Spoilt = $22.80 | ⚠️ ASSUMED | Confirm EA clause — origin was a SQL schema default |
| Delayed = $22.80 | ⚠️ ASSUMED | Same — confirm separately; may or may not equal Spoilt |
| No travel component on spoilt/delayed | ✅ Appears correct | Spoilt/Delayed are meal-only claims |
| total = meal only | ✅ Formula logically correct | No dispute |

---

### 3.5 Overnight Allowance (Recall sub-component)

**Note:** In the current UI, overnight on recall is handled via the retain claim's `overnightCash` field (user-entered) and `calcOvernightAllowance()` in the engine. The `calcOvernightAllowance` function is implemented but not wired into recall directly — it's available for future use.

| Check | Status | Notes |
|---|---|---|
| overnight = rates.overnightAllowance (if hasOvernight) | ✅ Formula correct | |
| Default rate = $0.00 | ⚠️ USER-SET | User must configure. Verify against at least one real example. |

---

### 3.6 Rounding

| Check | Status | Notes |
|---|---|---|
| All amounts rounded to 2dp half-up | ✅ Verified | `roundMoney()` uses `Math.round((v + Number.EPSILON) × 100) / 100` |
| Float drift prevented | ✅ Verified | `Number.EPSILON` guard in place |
| Historical totals read from DB, not recalculated | ✅ Verified | `resolveStoredAmount()` reads stored columns only |

---

## §4 — Unresolved Assumptions Summary

This is the consolidated list of everything that must be confirmed before the app is financially safe for production use.

| # | Item | Current Value | Status | Priority | What to Provide |
|---|---|---|---|---|---|
| 1 | Large meal allowance | $20.55 | ✅ CONFIRMED | — | Confirmed from FRV Allowances 2023FY, 2025FY, Current. No further action needed. |
| 2 | Double meal allowance | $31.45 | ✅ CONFIRMED | — | Confirmed from FRV Allowances 2023FY, 2025FY, Current. No further action needed. |
| 3 | Spoilt meal allowance | $10.90 | ✅ CONFIRMED | — | Confirmed from FRV Allowances 2023FY, 2025FY, Current. No further action needed. |
| 4 | Delayed meal allowance | $10.90 (placeholder) | ⚠️ UNRESOLVED | HIGH | No FRV evidence found. Find the EA clause for "delayed meal." Confirm whether it differs from Spoilt ($10.90). |
| 5 | Standby night meal | $10.90 (= small) | ⚠️ ASSUMED | MEDIUM | EA clause + confirm Standby vs M&D |
| 6 | Retain allowance formula | User-entered; no auto-calc | ❌ UNRESOLVED | CRITICAL | EA clause describing the formula (hourly rate? flat? % of pay?) |
| 7 | Overnight allowance default | $0.00 user-set | ❓ USER-SET | MEDIUM | Confirm whether EA specifies a standard rate |
| 8 | Recall meal entitlement trigger | User self-selects none/small/large/double | ⚠️ ASSUMED | HIGH | EA clause defining hours threshold for none/small/large/double |
| 9 | Standby vs M&D same rates? | Same rates applied | ⚠️ ASSUMED | MEDIUM | Confirm EA has no separate M&D rate |
| 10 | Recall minimum hours | 3 hours (stored, unused) | ⚠️ ASSUMED | LOW | EA clause (not yet in calculations) |
| 11 | Recall meal threshold hours | 4 hours (stored, unused) | ⚠️ ASSUMED | LOW | EA clause (not yet in calculations) |

---

## §5 — Real-World Validation Cases (Placeholders)

These placeholders must be filled with actual values from payslips or pay advice before the app can be signed off. Do not invent amounts.

Instructions for each placeholder:
- Retrieve the actual claim from payroll / pay advice.
- Enter the exact inputs and the exact amount paid.
- Run the app with those inputs and compare.
- Record whether the app result matches.

---

### Payslip Example 1

> **Purpose:** General cross-check of the most common claim type against a real pay record.

| Field | Value |
|---|---|
| Claim type | _[to be provided]_ |
| Date of claim | _[to be provided]_ |
| Inputs (km, meal type, etc.) | _[to be provided]_ |
| Amount on payslip | _[to be provided]_ |
| App calculated amount | _[run app, record here]_ |
| Match? | _[Yes / No / Discrepancy: $X]_ |
| Notes | _[any differences or explanations]_ |

---

### Payslip Example 2

> **Purpose:** Second cross-check, ideally a different claim type from Example 1.

| Field | Value |
|---|---|
| Claim type | _[to be provided]_ |
| Date of claim | _[to be provided]_ |
| Inputs | _[to be provided]_ |
| Amount on payslip | _[to be provided]_ |
| App calculated amount | _[run app, record here]_ |
| Match? | _[Yes / No / Discrepancy: $X]_ |
| Notes | |

---

### Recall Example

> **Purpose:** Verify recall travel + meal calculation against a real recall claim.

| Field | Value |
|---|---|
| Date of recall | _[to be provided]_ |
| dist_home_km | _[to be provided]_ |
| dist_stn_km | _[to be provided]_ |
| Meal entitlement claimed | _[none / small / large]_ |
| Total paid by payroll (allowance portion only) | _[to be provided]_ |
| App travel amount | _[run app, record here]_ |
| App meal amount | _[run app, record here]_ |
| App total | _[run app, record here]_ |
| Match? | _[Yes / No / Discrepancy: $X]_ |
| Notes | _If mismatch, was it the km rate, meal rate, or threshold?_ |

---

### Meal Example (Spoilt or Delayed)

> **Purpose:** Confirm the Spoilt/Delayed allowance rate against a real claim.

| Field | Value |
|---|---|
| Meal type | _[Spoilt / Delayed]_ |
| Date | _[to be provided]_ |
| Amount on payslip | _[to be provided]_ |
| App calculated amount | _[run app — should match spoiltMealAllowance or delayedMealAllowance]_ |
| Match? | _[Yes / No / Discrepancy: $X]_ |
| Confirmed rate | _[update defaultRates.js if different from $22.80]_ |
| Notes | |

---

### Standby Example

> **Purpose:** Verify standby travel + night meal against a real standby claim.

| Field | Value |
|---|---|
| Claim type | _[Standby / M&D]_ |
| Date | _[to be provided]_ |
| dist_km | _[to be provided]_ |
| Was it a night shift? | _[Yes / No]_ |
| Amount on payslip | _[to be provided]_ |
| App travel amount | _[run app, record here]_ |
| App night meal | _[run app, record here]_ |
| App total | _[run app, record here]_ |
| Match? | _[Yes / No / Discrepancy: $X]_ |
| Notes | _If M&D — note whether rates differed from Standby_ |

---

### Retain Example

> **Purpose:** Understand how retain is currently paid and what inputs produce the correct total.

| Field | Value |
|---|---|
| Date of retain | _[to be provided]_ |
| Book-off time | _[to be provided]_ |
| Actual departure time | _[to be provided]_ |
| Hours retained | _[to be provided]_ |
| Retain allowance on payslip | _[to be provided]_ |
| Overnight cash on payslip (if any) | _[to be provided]_ |
| Total paid | _[to be provided]_ |
| App total (manual entry) | _[run app with same values, record here]_ |
| Match? | _[Yes / No / Discrepancy: $X]_ |
| EA formula discovered? | _[describe the formula — hourly rate? flat fee? — so it can be implemented]_ |
| Notes | |

---

## §6 — Validation Scenario Status

The automated validation suite (`lib/calculations/validationScenarios.js`) covers internal arithmetic correctness. It does **not** verify that the rates themselves are correct — only that the formulas apply the rates consistently.

| Scenario Group | Scenarios | Status | Notes |
|---|---|---|---|
| `roundMoney` | 5 | ✅ 5/5 passing | Unchanged |
| Travel (`calcTravelAmount`, `calcTotalKm`) | 6 | ✅ 6/6 passing | Unchanged |
| Meal allowances (`calcMealAllowance`, `calcSpoiltMealAmount`) | 8 | ✅ 8/8 passing | +1 new: double meal ($31.45); corrected expected values for large meal ($20.55) and spoilt ($10.90) |
| Overnight | 2 | ✅ 2/2 passing | Unchanged |
| Recall (`calcRecallClaim`) | 5 | ✅ 5/5 passing | +1 new: double meal recall scenario |
| Retain (`calcRetainClaim`) | 3 | ✅ 3/3 passing | Unchanged |
| Standby (`calcStandbyClaim`) | 3 | ✅ 3/3 passing | Unchanged |
| Spoilt/Delayed (`calcSpoiltClaim`) | 2 | ✅ 2/2 passing | Expected values corrected: Spoilt→$10.90, Delayed→$10.90 (placeholder) |
| `resolveStoredAmount` | 4 | ✅ 4/4 passing | Unchanged |
| Dashboard (`calcDashboardSummary`) | 2 | ✅ 2/2 passing | Unchanged |
| Rounding edge cases | 3 | ✅ 3/3 passing | Unchanged |
| **TOTAL** | **43** | ✅ **43/43 passing** | +2 new scenarios vs v1.0 (double meal allowance; double meal recall) |

> All 43 scenarios test formula correctness using the rates as configured. Passing all 43 does not mean all rates are correct — it means the formulas are internally consistent. Delayed meal allowance remains flagged UNRESOLVED.

---

## §7 — Production Readiness Assessment

| Area | Status | Blocker? |
|---|---|---|
| Calculation engine (formulas) | ✅ Implemented and tested | No |
| Rounding | ✅ Correct | No |
| Historical claim protection | ✅ Implemented correctly | No |
| Rate snapshot on each claim | ✅ Implemented | No |
| km rate ($1.20/km) | ✅ Confirmed | No |
| Small meal ($10.90) | ✅ Confirmed | No |
| Large meal ($20.55) | ✅ Confirmed (FRV records) | No — corrected from $21.80 |
| Double meal ($31.45) | ✅ Confirmed (FRV records) | No — newly added |
| Spoilt meal ($10.90) | ✅ Confirmed (FRV records) | No — corrected from $22.80 |
| Delayed meal ($10.90) | ⚠️ UNRESOLVED (placeholder) | **Yes — no FRV evidence; all Delayed claims use unconfirmed value** |
| Standby night meal ($10.90) | ⚠️ Unconfirmed | **Yes — used on every night standby** |
| Retain formula | ❌ Unresolved | **Yes — no auto-calc; manual entry only** |
| Overnight default | ❓ User-set | Partial — users must configure themselves |
| Real-world payslip verification | ❌ Not yet done | **Yes — no real examples tested** |

### Overall Status

> 🟡 **NOT CLEARED FOR PRODUCTION — Significantly improved; two blockers remain**
>
> The app is **mechanically correct** — formulas and rounding are sound, historical claims are protected, and 44/44 validation scenarios pass. Following confirmation from FRV historical allowance records, **4 of 7 dollar amounts are now confirmed** (small meal, large meal, double meal, spoilt meal, km rate). **Two rate-related blockers remain** (delayed meal and standby night meal).
>
> **Confirmed since last review (2026-05):**
> - Large meal: $21.80 → corrected to $20.55 (confirmed FRV flat rate — not 2× small)
> - Double meal: $31.45 added (confirmed FRV)
> - Spoilt meal: $22.80 → corrected to $10.90 (confirmed FRV)
>
> **Minimum required before production use:**
> 1. ~~Confirm large meal allowance~~ ✅ DONE — $20.55 confirmed
> 2. ~~Confirm spoilt meal allowance~~ ✅ DONE — $10.90 confirmed
> 3. Confirm delayed meal allowance from EA → update `defaultRates.js` (current placeholder: $10.90 — UNRESOLVED)
> 4. Confirm standby night meal allowance from EA → update `defaultRates.js` if different from $10.90
> 5. Complete at least one real-world payslip comparison for each claim type
> 6. Optionally: confirm retain formula so it can be auto-calculated

---

*Last updated: 2026-05 (v1.1) — rates corrected from FRV historical allowance records (2023FY, 2025FY, Current): large meal $20.55 confirmed, double meal $31.45 added, spoilt meal $10.90 confirmed, delayed meal flagged UNRESOLVED. 43/43 validation scenarios passing. — Danny Tinitali, Fire Allowance Tracker*
