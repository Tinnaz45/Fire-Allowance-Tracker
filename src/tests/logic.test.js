import { CLAIM_TYPES } from '../constants/claimTypes'

// ── CLAIM TYPES ───────────────────────────────────────────────
describe('CLAIM_TYPES', () => {
  it('contains the expected claim type keys', () => {
    expect(CLAIM_TYPES).toContain('recalls')
    expect(CLAIM_TYPES).toContain('retain')
    expect(CLAIM_TYPES).toContain('standby')
    expect(CLAIM_TYPES).toContain('md')
    expect(CLAIM_TYPES).toContain('meals')
  })

  it('is an array with 5 entries', () => {
    expect(Array.isArray(CLAIM_TYPES)).toBe(true)
    expect(CLAIM_TYPES).toHaveLength(5)
  })
})

// ── CURRENCY FORMAT HELPER ────────────────────────────────────
const fmtAUD = (n) => (n != null ? `$${Number(n).toFixed(2)}` : '—')

describe('fmtAUD', () => {
  it('formats a number as AUD', () => {
    expect(fmtAUD(42)).toBe('$42.00')
    expect(fmtAUD(0)).toBe('$0.00')
    expect(fmtAUD(17.85)).toBe('$17.85')
  })

  it('returns em-dash for null or undefined', () => {
    expect(fmtAUD(null)).toBe('—')
    expect(fmtAUD(undefined)).toBe('—')
  })
})
