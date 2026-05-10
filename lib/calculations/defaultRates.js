// ─── Default Allowance Rates ───────────────────────────────────────────────────
// Single source of truth for all financial rates used in the app.
//
// These are the fallback rates used when a user has not saved their own overrides.
// Source: FRV / FBEU Enterprise Agreement (review annually).
//
// IMPORTANT: Do NOT hardcode these values anywhere else in the app.
// All calculations must import rates from this file OR from the active user
// rates via useRates(). See lib/calculations/RatesContext.js.
//
// ── Rate change history ────────────────────────────────────────────────────────
// 2025-06  Initial values set (ATO-sourced km rate, estimated meal rates)
// 2025-06  CORRECTED: kilometreRate 0.99 → 1.20 (user-confirmed award rate)
//          CORRECTED: smallMealAllowance 16.55 → 10.90 (user-confirmed award rate)
//          DERIVED:   largeMealAllowance 33.10 → 21.80 (2× small; UNCONFIRMED — flag)
//          DERIVED:   standbyNightMealAllowance 16.55 → 10.90 (= small; UNCONFIRMED — flag)
// 2026-05  CORRECTED: largeMealAllowance 21.80 → 20.55 (confirmed from FRV historical allowance sheets)
//          ADDED:     doubleMealAllowance 31.45 (confirmed from FRV historical allowance sheets)
//          CORRECTED: spoiltMealAllowance 22.80 → 10.90 (confirmed from FRV historical allowance sheets)
//          FLAGGED:   delayedMealAllowance remains UNRESOLVED — no evidence found in FRV records
//          SOURCE:    FRV Allowances 2023FY, FRV Allowances 2025FY, FRV Allowances - Current
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_RATES = {
  // ── Travel ────────────────────────────────────────────────────────────────
  // Per-kilometre reimbursement rate paid on recall and standby claims.
  // Applied to dist_home_km and dist_stn_km fields.
  // SOURCE: User-confirmed award rate. Review annually.
  kilometreRate: 1.20, // $ per km — confirmed award rate 2025

  // ── Meals ─────────────────────────────────────────────────────────────────
  // Standard meal allowance paid when a meal break is missed or disrupted.
  // "Small"  = one disrupted meal (e.g. early recall cutting into a meal break).
  // "Large"  = full meal allowance for extended shifts.
  // "Double" = double meal allowance (confirmed from FRV historical records).
  // SOURCE: All three values confirmed from FRV Allowances 2023FY, 2025FY, and Current sheets.
  // largeMealAllowance is a flat confirmed amount — NOT derived from smallMealAllowance.
  smallMealAllowance:  10.90, // $ — single disrupted meal; confirmed FRV award rate
  largeMealAllowance:  20.55, // $ — full meal allowance; confirmed FRV award rate (NOT 2× small)
  doubleMealAllowance: 31.45, // $ — double meal allowance; confirmed FRV award rate

  // ── Spoilt / Delayed Meals ────────────────────────────────────────────────
  // Paid when a rostered meal break is interrupted by a fire call or recall.
  // spoiltMealAllowance: confirmed at $10.90 from FRV Allowances 2023FY, 2025FY, and Current.
  // delayedMealAllowance: UNRESOLVED — no evidence found in FRV historical records.
  //   Current value ($10.90) is a placeholder only. Do not rely on this for compliance.
  spoiltMealAllowance:  10.90, // $ — spoilt meal (fire call interrupts meal break); confirmed FRV award rate
  delayedMealAllowance: 10.90, // $ — delayed meal (held past meal break); UNRESOLVED — no FRV evidence found; treat as unconfirmed

  // ── Overnight ─────────────────────────────────────────────────────────────
  // Cash allowance paid when a recall requires overnight stay away from home station.
  // Default is 0 — users must set their own value in Settings.
  // ASSUMPTION: overnight amount is user-confirmed per claim; no universal default.
  overnightAllowance: 0.00, // $ — user-set in Settings; 0 = not applicable by default

  // ── Recall ────────────────────────────────────────────────────────────────
  // Non-monetary recall thresholds. Not used in dollar calculations directly,
  // but reserved for future auto-entitlement logic.
  recallMinimumHours: 3,    // hours — minimum engagement on recall (UNCONFIRMED)
  recallMealieThreshold: 4, // hours — meal allowance threshold (UNCONFIRMED)

  // ── Retain ────────────────────────────────────────────────────────────────
  // UNRESOLVED: retain hourly allowance formula not confirmed from award.
  // Until confirmed, retain_amount is user-entered. See CALCULATION_RULES.md §5.
  retainAllowancePerHour: 0.00, // $ — UNRESOLVED; do not use in auto-calc

  // ── Standby ───────────────────────────────────────────────────────────────
  // Night meal allowance on standby (paid when working a night standby shift).
  // ASSUMPTION: equals smallMealAllowance. Updated to match confirmed small meal.
  // Must be confirmed separately against the enterprise agreement.
  standbyNightMealAllowance: 10.90, // $ — assumed equal to smallMealAllowance; UNCONFIRMED

  // ── Rounding ──────────────────────────────────────────────────────────────
  // All monetary values are rounded to 2 decimal places.
  // See engine.js roundMoney() for implementation.
  decimalPlaces: 2,
}

// ─── Rate field metadata (used by Settings UI) ────────────────────────────────
// Drives the labels, help text, and validation in the Rates Settings page.

export const RATE_FIELDS = [
  {
    key: 'kilometreRate',
    label: 'Kilometre Rate',
    unit: '$/km',
    help: 'Per-kilometre reimbursement rate paid on recall and standby claims. Current confirmed award rate: $1.20/km. Review annually.',
    min: 0.01,
    max: 5.00,
    step: 0.01,
  },
  {
    key: 'smallMealAllowance',
    label: 'Small Meal Allowance',
    unit: '$',
    help: 'Paid when one meal break is disrupted (e.g. recall cutting into a meal break). Current confirmed award rate: $10.90.',
    min: 0.01,
    max: 200,
    step: 0.01,
  },
  {
    key: 'largeMealAllowance',
    label: 'Large Meal Allowance',
    unit: '$',
    help: 'Full meal allowance for extended shifts. Confirmed FRV award rate: $20.55. This is a flat rate — it is NOT derived as 2× small meal.',
    min: 0.01,
    max: 200,
    step: 0.01,
  },
  {
    key: 'doubleMealAllowance',
    label: 'Double Meal Allowance',
    unit: '$',
    help: 'Double meal allowance. Confirmed FRV award rate: $31.45. Source: FRV Allowances 2023FY, 2025FY, and Current sheets.',
    min: 0.01,
    max: 200,
    step: 0.01,
  },
  {
    key: 'spoiltMealAllowance',
    label: 'Spoilt Meal Allowance',
    unit: '$',
    help: 'Paid when a rostered meal break is interrupted by a fire call. Confirmed FRV award rate: $10.90. Source: FRV Allowances 2023FY, 2025FY, and Current sheets.',
    min: 0.01,
    max: 200,
    step: 0.01,
  },
  {
    key: 'delayedMealAllowance',
    label: 'Delayed Meal Allowance',
    unit: '$',
    help: 'Paid when a meal break is held past the rostered time due to operational demands. UNRESOLVED — no confirmed FRV evidence found. Current value is a placeholder. Verify against your enterprise agreement before relying on this.',
    min: 0.01,
    max: 200,
    step: 0.01,
  },
  {
    key: 'overnightAllowance',
    label: 'Overnight Allowance',
    unit: '$',
    help: 'Cash allowance for overnight stays at a non-home station. Set to 0 if not applicable to you.',
    min: 0,
    max: 1000,
    step: 0.01,
  },
  {
    key: 'standbyNightMealAllowance',
    label: 'Standby Night Meal Allowance',
    unit: '$',
    help: 'Meal allowance paid on night standby shifts. Currently assumed equal to small meal allowance ($10.90). Verify against your enterprise agreement.',
    min: 0.01,
    max: 200,
    step: 0.01,
  },
]
