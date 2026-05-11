// Claim Type Definitions
// Single source of truth for claim table names and display labels.
// Amount resolution: lib/calculations/engine.js -> resolveStoredAmount()
// LEGACY: Historical records may have meal_type = 'Spoilt / Meal' - handled by LEGACY_MEAL_TYPE_MAP in engine.js
// DB table 'spoilt' and claimType key 'spoilt' are unchanged - only the display label changed.

export const CLAIM_TABLES = ['recalls', 'retain', 'standby', 'spoilt']

export const CLAIM_TYPE_LABELS = {
    recalls: 'Recall',
    retain:  'Retain',
    standby: 'Standby',
    spoilt:  'Spoilt Meal',
}

// Dropdown order: Recall, Retain, Standby, Spoilt Meal, Delayed Meal
// (Delayed Meal is a meal_type within the spoilt table, not a separate claimType)
export const CLAIM_TYPE_ORDER = ['recalls', 'retain', 'standby', 'spoilt']
