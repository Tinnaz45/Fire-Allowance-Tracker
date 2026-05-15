// ─── Station Parser ──────────────────────────────────────────────────────────
// Robust free-text → station record parser.
//
// Recall claims accept a free-text "Recall Station" input; users type values
// like "FS44 - Sunshine", "FS 44", "44 - Sunshine", "Sunshine", or "44".
// This module extracts a normalised { id, name, abbreviation, label } tuple
// so downstream code can locate the station's coordinates and compute a
// rostered-to-recall driving distance.
//
// This module never makes a network call. It does pure text parsing plus an
// optional lookup against an already-loaded fat.stations list.
// ─────────────────────────────────────────────────────────────────────────────

// Regex breakdown:
//   ^\s*                  leading whitespace
//   (?:FS|F\.S\.?|STN)?   optional prefix ("FS", "F.S", "F.S.", "STN")
//   \s*                   optional space after prefix
//   (\d{1,3})             station number (1-3 digits)
//   \s*                   optional space
//   (?:[-–—:]\s*(.+))?    optional separator + name
//   \s*$                  trailing whitespace
const STATION_ID_REGEX = /^\s*(?:FS|F\.S\.?|STN)?\s*(\d{1,3})\s*(?:[-–—:]\s*(.+?))?\s*$/i

/**
 * Parse a free-text station input.
 *
 * Returns the most that can be inferred without a stations list. Callers can
 * pass the parsed result + a stations array to `resolveStation()` to upgrade
 * id-only or name-only matches into a full station record.
 *
 * @param {string} text
 * @returns {{ id: number|null, name: string|null, raw: string }}
 */
export function parseStationInput(text) {
  if (text == null) return { id: null, name: null, raw: '' }
  const trimmed = String(text).trim()
  if (!trimmed) return { id: null, name: null, raw: '' }

  const match = trimmed.match(STATION_ID_REGEX)
  if (match) {
    const id   = parseInt(match[1], 10)
    const name = (match[2] || '').trim() || null
    return { id: isFinite(id) ? id : null, name, raw: trimmed }
  }

  // No ID detected — treat the whole string as a name fragment
  return { id: null, name: trimmed, raw: trimmed }
}

/**
 * Resolve a parsed station against a stations list (from fat.stations).
 *
 * - Match by ID when available.
 * - Otherwise match by name (case-insensitive substring), preferring exact
 *   matches and shorter station names to avoid greedy matches.
 *
 * @param {{ id: number|null, name: string|null }} parsed
 * @param {Array<{ id: number, name: string, abbreviation: string|null }>} stations
 * @returns {{ id: number, name: string, abbreviation: string|null, label: string } | null}
 */
export function resolveStation(parsed, stations) {
  if (!parsed || !Array.isArray(stations) || stations.length === 0) return null

  // Prefer an explicit ID match
  if (parsed.id != null) {
    const byId = stations.find((s) => s.id === parsed.id)
    if (byId) {
      return {
        id:           byId.id,
        name:         byId.name,
        abbreviation: byId.abbreviation || `FS${byId.id}`,
        label:        `${byId.abbreviation || 'FS' + byId.id} - ${byId.name}`,
      }
    }
  }

  // Fallback: case-insensitive name match
  if (parsed.name) {
    const query = parsed.name.toLowerCase()
    const exact = stations.find((s) => (s.name || '').toLowerCase() === query)
    const target = exact
      || stations
          .filter((s) => (s.name || '').toLowerCase().includes(query))
          // Prefer shorter names — more specific matches first
          .sort((a, b) => (a.name || '').length - (b.name || '').length)[0]
    if (target) {
      return {
        id:           target.id,
        name:         target.name,
        abbreviation: target.abbreviation || `FS${target.id}`,
        label:        `${target.abbreviation || 'FS' + target.id} - ${target.name}`,
      }
    }
  }

  return null
}

/**
 * Convenience: parse + resolve in one call.
 * Returns the resolved station record or null.
 */
export function parseAndResolve(text, stations) {
  return resolveStation(parseStationInput(text), stations)
}
