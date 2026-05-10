// ─── Claim Type Definitions ───────────────────────────────────────────────────
// Single source of truth for claim table names and display labels.
//
// NOTE: Amount resolution has moved to lib/calculations/engine.js → resolveStoredAmount().
// Do NOT add financial logic to this file.

export const CLAIM_TABLES = ['recalls', 'retain', 'standby', 'spoilt']

export const CLAIM_TYPE_LABELS = {
  recalls: 'Recall',
  retain:  'Retain',
  standby: 'Standby',
  spoilt:  'Spoilt / Meal',
}
