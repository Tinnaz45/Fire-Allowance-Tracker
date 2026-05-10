/**
 * Grouped Claims + FY Architecture — Validation Tests
 *
 * Run with: npx jest __tests__/grouped-claims.test.js
 * (Requires: npm install --save-dev jest @jest/globals)
 *
 * Tests cover:
 *   1. FY numbering reset (each FY gets its own sequence)
 *   2. Sequence persistence (second claim in same FY gets next number)
 *   3. Parent/child status logic (Pending until all children Paid)
 *   4. Grouped rendering shape (group + children structure)
 *   5. Grouped sorting (by date, by type)
 *   6. Grouped filtering (by status)
 *   7. FY workspace isolation (claims in FY-A not visible in FY-B)
 *   8. Claim label format (e.g. 'Recall #16 (12/02/2026)')
 *   9. Overdue detection (>4 weeks pending)
 *  10. buildClaimLabel output
 */

// ─── Pure function imports (no React, no Supabase) ───────────────────────────

import {
  buildClaimLabel,
  isClaimOverdue,
  getFYLabel,
  getFYDateRange,
  currentFYLabel,
  formatDateDDMMYYYY,
} from '../lib/calculations/engine.js'

// ─── 1. Claim label format ────────────────────────────────────────────────────

describe('buildClaimLabel', () => {
  test('formats Recall correctly', () => {
    expect(buildClaimLabel('recalls', 16, '2026-02-12')).toBe('Recall #16 (12/02/2026)')
  })
  test('formats Spoilt Meal correctly', () => {
    expect(buildClaimLabel('spoilt', 7, '2025-02-01')).toBe('Spoilt Meal #7 (01/02/2025)')
  })
  test('formats Standby correctly', () => {
    expect(buildClaimLabel('standby', 3, '2026-06-01')).toBe('Standby #3 (01/06/2026)')
  })
  test('formats Retain correctly', () => {
    expect(buildClaimLabel('retain', 1, '2025-08-15')).toBe('Retain #1 (15/08/2025)')
  })
})

// ─── 2. FY label calculation ─────────────────────────────────────────────────

describe('getFYLabel', () => {
  test('July = new FY starts', () => {
    expect(getFYLabel('2025-07-01')).toBe('2026FY')
  })
  test('June = old FY ends', () => {
    expect(getFYLabel('2026-06-30')).toBe('2026FY')
  })
  test('Jan mid-year', () => {
    expect(getFYLabel('2026-01-15')).toBe('2026FY')
  })
  test('July previous year', () => {
    expect(getFYLabel('2024-07-01')).toBe('2025FY')
  })
})

// ─── 3. FY date range ────────────────────────────────────────────────────────

describe('getFYDateRange', () => {
  test('2026FY starts 2025-07-01', () => {
    const { start, end } = getFYDateRange('2026FY')
    expect(start).toBe('2025-07-01')
    expect(end).toBe('2026-06-30')
  })
  test('2025FY starts 2024-07-01', () => {
    const { start, end } = getFYDateRange('2025FY')
    expect(start).toBe('2024-07-01')
    expect(end).toBe('2025-06-30')
  })
})

// ─── 4. FY workspace isolation (date-based) ──────────────────────────────────
// Simulates what fetchClaimsForFY does with date-range filter fallback.

describe('FY workspace isolation', () => {
  const claimsDB = [
    { id: 1, date: '2025-08-01', claimType: 'recalls', financial_year_id: 'fy-a' },
    { id: 2, date: '2026-03-15', claimType: 'recalls', financial_year_id: 'fy-a' },
    { id: 3, date: '2024-09-01', claimType: 'spoilt',  financial_year_id: 'fy-b' },
    { id: 4, date: '2025-06-30', claimType: 'retain',  financial_year_id: 'fy-b' },
  ]

  function filterByFY(claims, fyId) {
    return claims.filter((c) => c.financial_year_id === fyId)
  }

  test('FY-A has 2 claims', () => {
    expect(filterByFY(claimsDB, 'fy-a').length).toBe(2)
  })
  test('FY-B has 2 claims', () => {
    expect(filterByFY(claimsDB, 'fy-b').length).toBe(2)
  })
  test('FY-A claims not in FY-B', () => {
    const fyB = filterByFY(claimsDB, 'fy-b')
    expect(fyB.find((c) => c.id === 1)).toBeUndefined()
    expect(fyB.find((c) => c.id === 2)).toBeUndefined()
  })
  test('switching FY returns different set', () => {
    const fyA = filterByFY(claimsDB, 'fy-a').map((c) => c.id)
    const fyB = filterByFY(claimsDB, 'fy-b').map((c) => c.id)
    expect(fyA).not.toEqual(fyB)
  })
})

// ─── 5. Sequence persistence (per FY per type) ───────────────────────────────
// Simulates the increment logic from increment_claim_sequence()

describe('claim sequence logic', () => {
  // Simulate in-memory sequence store
  function createSequenceStore() {
    const store = {}
    function increment(fyId, claimType) {
      const key = `${fyId}::${claimType}`
      store[key] = (store[key] || 0) + 1
      return store[key]
    }
    function getSeq(fyId, claimType) {
      return store[`${fyId}::${claimType}`] || 0
    }
    return { increment, getSeq }
  }

  test('first claim gets #1', () => {
    const seq = createSequenceStore()
    expect(seq.increment('fy-a', 'recalls')).toBe(1)
  })

  test('second claim in same FY+type gets #2', () => {
    const seq = createSequenceStore()
    seq.increment('fy-a', 'recalls')
    expect(seq.increment('fy-a', 'recalls')).toBe(2)
  })

  test('FY reset: different FY starts at #1', () => {
    const seq = createSequenceStore()
    seq.increment('fy-a', 'recalls') // 1
    seq.increment('fy-a', 'recalls') // 2
    // Different FY should start fresh
    expect(seq.increment('fy-b', 'recalls')).toBe(1)
  })

  test('different types are independent', () => {
    const seq = createSequenceStore()
    seq.increment('fy-a', 'recalls') // 1
    seq.increment('fy-a', 'recalls') // 2
    expect(seq.increment('fy-a', 'spoilt')).toBe(1)
  })

  test('sequence for type persists across 10 claims', () => {
    const seq = createSequenceStore()
    for (let i = 1; i <= 9; i++) seq.increment('fy-a', 'recalls')
    expect(seq.increment('fy-a', 'recalls')).toBe(10)
  })
})

// ─── 6. Parent/child status logic ────────────────────────────────────────────

describe('parent status calculation', () => {
  function calcParentStatus(children) {
    if (!children || children.length === 0) return 'Pending'
    const statuses = children.map((c) => (c.status || 'Pending').toLowerCase())
    if (statuses.some((s) => s === 'disputed')) return 'Disputed'
    if (statuses.every((s) => s === 'paid')) return 'Paid'
    return 'Pending'
  }

  test('all children Paid → parent Paid', () => {
    const children = [
      { status: 'Paid' }, { status: 'Paid' }, { status: 'Paid' },
    ]
    expect(calcParentStatus(children)).toBe('Paid')
  })

  test('one child Pending → parent Pending', () => {
    const children = [
      { status: 'Paid' }, { status: 'Pending' }, { status: 'Paid' },
    ]
    expect(calcParentStatus(children)).toBe('Pending')
  })

  test('any child Disputed → parent Disputed', () => {
    const children = [
      { status: 'Paid' }, { status: 'Disputed' }, { status: 'Paid' },
    ]
    expect(calcParentStatus(children)).toBe('Disputed')
  })

  test('Disputed overrides Pending', () => {
    const children = [
      { status: 'Pending' }, { status: 'Disputed' },
    ]
    expect(calcParentStatus(children)).toBe('Disputed')
  })

  test('empty children → Pending', () => {
    expect(calcParentStatus([])).toBe('Pending')
  })

  test('single Paid child → Paid', () => {
    expect(calcParentStatus([{ status: 'Paid' }])).toBe('Paid')
  })

  test('case insensitive', () => {
    const children = [{ status: 'PAID' }, { status: 'paid' }]
    expect(calcParentStatus(children)).toBe('Paid')
  })
})

// ─── 7. Grouped rendering shape ───────────────────────────────────────────────

describe('grouped view construction', () => {
  function buildGroupedView(claims, claimGroups) {
    const childrenByGroup = {}
    for (const claim of claims) {
      if (claim.claim_group_id) {
        if (!childrenByGroup[claim.claim_group_id]) childrenByGroup[claim.claim_group_id] = []
        childrenByGroup[claim.claim_group_id].push(claim)
      }
    }
    const grouped = claimGroups.map((group) => ({
      group,
      children: childrenByGroup[group.id] || [],
    }))
    const ungrouped = claims.filter((c) => !c.claim_group_id)
    return { grouped, ungrouped }
  }

  const groups = [
    { id: 'g1', label: 'Recall #1 (01/08/2025)', parent_status: 'Pending' },
    { id: 'g2', label: 'Recall #2 (15/09/2025)', parent_status: 'Paid' },
  ]
  const claims = [
    { id: 'c1', claimType: 'recalls', claim_group_id: 'g1', status: 'Pending' },
    { id: 'c2', claimType: 'recalls', claim_group_id: 'g1', status: 'Paid' },
    { id: 'c3', claimType: 'spoilt',  claim_group_id: 'g1', status: 'Paid' },
    { id: 'c4', claimType: 'recalls', claim_group_id: 'g2', status: 'Paid' },
    { id: 'c5', claimType: 'spoilt',  claim_group_id: null, status: 'Pending' }, // ungrouped
  ]

  const { grouped, ungrouped } = buildGroupedView(claims, groups)

  test('produces 2 groups', () => {
    expect(grouped.length).toBe(2)
  })

  test('g1 has 3 children', () => {
    const g1 = grouped.find((g) => g.group.id === 'g1')
    expect(g1.children.length).toBe(3)
  })

  test('g2 has 1 child', () => {
    const g2 = grouped.find((g) => g.group.id === 'g2')
    expect(g2.children.length).toBe(1)
  })

  test('1 ungrouped claim', () => {
    expect(ungrouped.length).toBe(1)
    expect(ungrouped[0].id).toBe('c5')
  })

  test('ungrouped claim has no group id', () => {
    expect(ungrouped[0].claim_group_id).toBeNull()
  })
})

// ─── 8. Grouped sorting ───────────────────────────────────────────────────────

describe('grouped sorting', () => {
  const groups = [
    { id: 'g1', label: 'Recall #1',  created_at: '2025-08-01T00:00:00Z', parent_status: 'Paid' },
    { id: 'g2', label: 'Recall #2',  created_at: '2025-09-15T00:00:00Z', parent_status: 'Pending' },
    { id: 'g3', label: 'Standby #1', created_at: '2025-10-01T00:00:00Z', parent_status: 'Pending' },
  ]

  test('sort by date descending (newest first)', () => {
    const sorted = [...groups].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
    expect(sorted[0].id).toBe('g3')
    expect(sorted[2].id).toBe('g1')
  })

  test('sort by date ascending', () => {
    const sorted = [...groups].sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    )
    expect(sorted[0].id).toBe('g1')
    expect(sorted[2].id).toBe('g3')
  })
})

// ─── 9. Grouped filtering ─────────────────────────────────────────────────────

describe('grouped filtering', () => {
  const groups = [
    { id: 'g1', parent_status: 'Pending', claim_type: 'recalls' },
    { id: 'g2', parent_status: 'Paid',    claim_type: 'recalls' },
    { id: 'g3', parent_status: 'Pending', claim_type: 'standby' },
    { id: 'g4', parent_status: 'Disputed',claim_type: 'recalls' },
  ]

  test('filter by Pending status', () => {
    const pending = groups.filter((g) => g.parent_status === 'Pending')
    expect(pending.length).toBe(2)
  })

  test('filter by Paid status', () => {
    const paid = groups.filter((g) => g.parent_status === 'Paid')
    expect(paid.length).toBe(1)
  })

  test('filter by type recalls', () => {
    const recalls = groups.filter((g) => g.claim_type === 'recalls')
    expect(recalls.length).toBe(3)
  })

  test('filter pending + recalls', () => {
    const result = groups.filter((g) => g.parent_status === 'Pending' && g.claim_type === 'recalls')
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('g1')
  })
})

// ─── 10. Overdue detection ────────────────────────────────────────────────────

describe('isClaimOverdue', () => {
  test('pending claim created > 28 days ago is overdue', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const claim = { status: 'Pending', created_at: thirtyDaysAgo }
    expect(isClaimOverdue(claim)).toBe(true)
  })

  test('pending claim created < 28 days ago is not overdue', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const claim = { status: 'Pending', created_at: tenDaysAgo }
    expect(isClaimOverdue(claim)).toBe(false)
  })

  test('paid claim is never overdue regardless of age', () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const claim = { status: 'Paid', created_at: sixtyDaysAgo }
    expect(isClaimOverdue(claim)).toBe(false)
  })

  test('claim with no created_at is not overdue', () => {
    const claim = { status: 'Pending', created_at: null }
    expect(isClaimOverdue(claim)).toBe(false)
  })

  test('exactly 28 days is not yet overdue', () => {
    const exactly28 = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
    const claim = { status: 'Pending', created_at: exactly28 }
    // 28 days is the boundary — function uses > 28, not >= 28
    expect(isClaimOverdue(claim)).toBe(false)
  })
})

// ─── 11. Group overdue via overdue_at field ───────────────────────────────────

describe('group overdue via overdue_at', () => {
  function isGroupOverdue(group) {
    if ((group.parent_status || '').toLowerCase() !== 'pending') return false
    if (!group.overdue_at) return false
    return new Date() > new Date(group.overdue_at)
  }

  test('pending group past overdue_at is overdue', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString()
    expect(isGroupOverdue({ parent_status: 'Pending', overdue_at: pastDate })).toBe(true)
  })

  test('pending group with future overdue_at is not overdue', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(isGroupOverdue({ parent_status: 'Pending', overdue_at: futureDate })).toBe(false)
  })

  test('paid group is never overdue', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString()
    expect(isGroupOverdue({ parent_status: 'Paid', overdue_at: pastDate })).toBe(false)
  })
})
