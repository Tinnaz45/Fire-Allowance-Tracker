// Claim Type Definitions
// Single source of truth for claim table names and display labels.
// Amount resolution: lib/calculations/engine.js -> resolveStoredAmount()
//
// ARCHITECTURE:
//   'spoilt' and 'delayed_meal' are VIRTUAL top-level claim types that both
//   write to the same DB table ('spoilt'), differentiated by meal_type column:
//     claimType 'spoilt'       → DB table 'spoilt', meal_type = 'Spoilt'
//     claimType 'delayed_meal' → DB table 'spoilt', meal_type = 'Delayed'
//
// LEGACY: Historical records may have meal_type = 'Spoilt / Meal'
//   - handled by LEGACY_MEAL_TYPE_MAP in engine.js
//   - legacy rows with meal_type = 'Spoilt / Meal' are normalised to claimType = 'spoilt'

// DB tables actually queried. 'delayed_meal' is NOT a table — it maps to 'spoilt'.
export const CLAIM_TABLES = ['recalls', 'retain', 'standby', 'spoilt']

// Display labels for all claim types including virtual ones
export const CLAIM_TYPE_LABELS = {
  recalls:      'Recall',
  retain:       'Retain',
  standby:      'Standby',
  spoilt:       'Spoilt Meal',
  delayed_meal: 'Delayed Meal',
}

// Top-level dropdown order — 5 options visible to user
export const CLAIM_TYPE_ORDER = ['recalls', 'retain', 'standby', 'spoilt', 'delayed_meal']

// Maps virtual claimTypes that share a DB table to their actual table + meal_type value.
// Used by ClaimsContext when reading/writing rows.
export const VIRTUAL_CLAIM_TYPES = {
  delayed_meal: { table: 'spoilt', mealType: 'Delayed' },
  spoilt:       { table: 'spoilt', mealType: 'Spoilt'  },
}

// Resolve the DB table name for any claimType (real or virtual)
export function resolveClaimTable(claimType) {
  return VIRTUAL_CLAIM_TYPES[claimType]?.table ?? claimType
}

// Resolve the forced meal_type value for a given claimType (null = user can choose)
export function resolveClaimMealType(claimType) {
  return VIRTUAL_CLAIM_TYPES[claimType]?.mealType ?? null
}
