/**
 * validate-grouped-claims.mjs
 *
 * Standalone validation script for grouped claims + FY architecture.
 * Runs with: node scripts/validate-grouped-claims.mjs
 *
 * Tests pure logic functions (no Supabase, no React).
 * Exit 0 = all passed. Exit 1 = one or more failed.
 */

// ─── Inline pure function copies (mirrors lib/calculations/engine.js) ─────────

function getFYLabel(date) {
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return month >= 7 ? `${year + 1}FY` : `${year}FY`
}

function getFYDateRange(label) {
  const year = parseInt(label.replace('FY', ''), 10)
  return { start: `${year - 1}-07-01`, end: `${year}-06-30` }
}

function formatDateDDMMYYYY(date) {
  if (!date) return '—'
  const d = date instanceof Date ? date : new Date(date + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

const CLAIM_TYPE_SHORT = { recalls: 'Recall', retain: 'Retain', standby: 'Standby', spoilt: 'Spoilt Meal' }

function buildClaimLabel(claimType, number, date) {
  const typeName = CLAIM_TYPE_SHORT[claimType] || claimType
  return `${typeName} #${number} (${formatDateDDMMYYYY(date)})`
}

function isClaimOverdue(claim) {
  if ((claim.status || '').toLowerCase() !== 'pending') return false
  if (!claim.created_at) return false
  const diffDays = (new Date() - new Date(claim.created_at)) / (1000 * 60 * 60 * 24)
  return diffDays > 28
}

function calcParentStatus(children) {
  if (!children || children.length === 0) return 'Pending'
  const statuses = children.map((c) => (c.status || 'Pending').toLowerCase())
  if (statuses.some((s) => s === 'disputed')) return 'Disputed'
  if (statuses.every((s) => s === 'paid')) return 'Paid'
  return 'Pending'
}

function buildGroupedView(claims, claimGroups) {
  const childrenByGroup = {}
  for (const claim of claims) {
    if (claim.claim_group_id) {
      if (!childrenByGroup[claim.claim_group_id]) childrenByGroup[claim.claim_group_id] = []
      childrenByGroup[claim.claim_group_id].push(claim)
    }
  }
  const grouped = claimGroups.map((group) => ({ group, children: childrenByGroup[group.id] || [] }))
  const ungrouped = claims.filter((c) => !c.claim_group_id)
  return { grouped, ungrouped }
}

function createSequenceStore() {
  const store = {}
  return {
    increment(fyId, claimType) {
      const key = `${fyId}::${claimType}`
      store[key] = (store[key] || 0) + 1
      return store[key]
    }
  }
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (e) {
    console.error(`  ✗ ${name}: ${e.message}`)
    failed++
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}

function assertTrue(v, msg) {
  if (!v) throw new Error(msg || `Expected truthy, got ${v}`)
}

function assertFalse(v, msg) {
  if (v) throw new Error(msg || `Expected falsy, got ${v}`)
}

// ─── Test suites ──────────────────────────────────────────────────────────────

console.log('\n▶ buildClaimLabel')
test('Recall #16 format', () => {
  assertEqual(buildClaimLabel('recalls', 16, '2026-02-12'), 'Recall #16 (12/02/2026)')
})
test('Spoilt Meal #7 format', () => {
  assertEqual(buildClaimLabel('spoilt', 7, '2025-02-01'), 'Spoilt Meal #7 (01/02/2025)')
})
test('Standby #3 format', () => {
  assertEqual(buildClaimLabel('standby', 3, '2026-06-01'), 'Standby #3 (01/06/2026)')
})

console.log('\n▶ getFYLabel')
test('July → new FY', () => { assertEqual(getFYLabel('2025-07-01'), '2026FY') })
test('June → current FY', () => { assertEqual(getFYLabel('2026-06-30'), '2026FY') })
test('January mid-FY', () => { assertEqual(getFYLabel('2026-01-15'), '2026FY') })

console.log('\n▶ getFYDateRange')
test('2026FY start/end', () => {
  const { start, end } = getFYDateRange('2026FY')
  assertEqual(start, '2025-07-01')
  assertEqual(end, '2026-06-30')
})

console.log('\n▶ Claim sequence logic')
test('first claim is #1', () => {
  const s = createSequenceStore()
  assertEqual(s.increment('fy-a', 'recalls'), 1)
})
test('second claim in same FY+type is #2', () => {
  const s = createSequenceStore()
  s.increment('fy-a', 'recalls')
  assertEqual(s.increment('fy-a', 'recalls'), 2)
})
test('different FY resets to #1', () => {
  const s = createSequenceStore()
  s.increment('fy-a', 'recalls')
  s.increment('fy-a', 'recalls')
  assertEqual(s.increment('fy-b', 'recalls'), 1)
})
test('different types are independent', () => {
  const s = createSequenceStore()
  s.increment('fy-a', 'recalls')
  s.increment('fy-a', 'recalls')
  assertEqual(s.increment('fy-a', 'spoilt'), 1)
})
test('sequence persists to #10', () => {
  const s = createSequenceStore()
  for (let i = 0; i < 9; i++) s.increment('fy-a', 'recalls')
  assertEqual(s.increment('fy-a', 'recalls'), 10)
})

console.log('\n▶ Parent/child status logic')
test('all Paid → Paid', () => {
  assertEqual(calcParentStatus([{ status: 'Paid' }, { status: 'Paid' }]), 'Paid')
})
test('one Pending → Pending', () => {
  assertEqual(calcParentStatus([{ status: 'Paid' }, { status: 'Pending' }]), 'Pending')
})
test('any Disputed → Disputed', () => {
  assertEqual(calcParentStatus([{ status: 'Paid' }, { status: 'Disputed' }]), 'Disputed')
})
test('Disputed overrides Pending', () => {
  assertEqual(calcParentStatus([{ status: 'Pending' }, { status: 'Disputed' }]), 'Disputed')
})
test('empty → Pending', () => {
  assertEqual(calcParentStatus([]), 'Pending')
})
test('case insensitive', () => {
  assertEqual(calcParentStatus([{ status: 'PAID' }, { status: 'paid' }]), 'Paid')
})

console.log('\n▶ Grouped rendering')
const testGroups = [
  { id: 'g1', label: 'Recall #1 (01/08/2025)', parent_status: 'Pending' },
  { id: 'g2', label: 'Recall #2 (15/09/2025)', parent_status: 'Paid' },
]
const testClaims = [
  { id: 'c1', claimType: 'recalls', claim_group_id: 'g1', status: 'Pending' },
  { id: 'c2', claimType: 'recalls', claim_group_id: 'g1', status: 'Paid' },
  { id: 'c3', claimType: 'spoilt',  claim_group_id: 'g1', status: 'Paid' },
  { id: 'c4', claimType: 'recalls', claim_group_id: 'g2', status: 'Paid' },
  { id: 'c5', claimType: 'spoilt',  claim_group_id: null, status: 'Pending' },
]
const { grouped, ungrouped } = buildGroupedView(testClaims, testGroups)

test('2 groups produced', () => { assertEqual(grouped.length, 2) })
test('g1 has 3 children', () => { assertEqual(grouped.find((g) => g.group.id === 'g1').children.length, 3) })
test('g2 has 1 child', () => { assertEqual(grouped.find((g) => g.group.id === 'g2').children.length, 1) })
test('1 ungrouped claim', () => { assertEqual(ungrouped.length, 1) })
test('ungrouped is c5', () => { assertEqual(ungrouped[0].id, 'c5') })

console.log('\n▶ Grouped sorting')
const sortGroups = [
  { id: 'g1', created_at: '2025-08-01T00:00:00Z' },
  { id: 'g2', created_at: '2025-09-15T00:00:00Z' },
  { id: 'g3', created_at: '2025-10-01T00:00:00Z' },
]
test('sort newest first → g3 first', () => {
  const sorted = [...sortGroups].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  assertEqual(sorted[0].id, 'g3')
})
test('sort oldest first → g1 first', () => {
  const sorted = [...sortGroups].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  assertEqual(sorted[0].id, 'g1')
})

console.log('\n▶ Grouped filtering')
const filterGroups = [
  { id: 'g1', parent_status: 'Pending', claim_type: 'recalls' },
  { id: 'g2', parent_status: 'Paid',    claim_type: 'recalls' },
  { id: 'g3', parent_status: 'Pending', claim_type: 'standby' },
  { id: 'g4', parent_status: 'Disputed',claim_type: 'recalls' },
]
test('2 Pending groups', () => {
  assertEqual(filterGroups.filter((g) => g.parent_status === 'Pending').length, 2)
})
test('1 Paid group', () => {
  assertEqual(filterGroups.filter((g) => g.parent_status === 'Paid').length, 1)
})
test('3 recalls groups', () => {
  assertEqual(filterGroups.filter((g) => g.claim_type === 'recalls').length, 3)
})

console.log('\n▶ FY workspace isolation')
const allClaims = [
  { id: 1, financial_year_id: 'fy-2026' },
  { id: 2, financial_year_id: 'fy-2026' },
  { id: 3, financial_year_id: 'fy-2025' },
]
test('FY-2026 has 2 claims', () => {
  assertEqual(allClaims.filter((c) => c.financial_year_id === 'fy-2026').length, 2)
})
test('FY-2025 has 1 claim', () => {
  assertEqual(allClaims.filter((c) => c.financial_year_id === 'fy-2025').length, 1)
})
test('FY sets are disjoint', () => {
  const a = allClaims.filter((c) => c.financial_year_id === 'fy-2026').map((c) => c.id)
  const b = allClaims.filter((c) => c.financial_year_id === 'fy-2025').map((c) => c.id)
  assertFalse(a.some((id) => b.includes(id)))
})

console.log('\n▶ Overdue detection')
test('claim >28 days old is overdue', () => {
  const t = new Date(Date.now() - 30 * 86400000).toISOString()
  assertTrue(isClaimOverdue({ status: 'Pending', created_at: t }))
})
test('claim <28 days old is not overdue', () => {
  const t = new Date(Date.now() - 10 * 86400000).toISOString()
  assertFalse(isClaimOverdue({ status: 'Pending', created_at: t }))
})
test('Paid claim is never overdue', () => {
  const t = new Date(Date.now() - 60 * 86400000).toISOString()
  assertFalse(isClaimOverdue({ status: 'Paid', created_at: t }))
})
test('null created_at is not overdue', () => {
  assertFalse(isClaimOverdue({ status: 'Pending', created_at: null }))
})

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`  Results: ${passed} passed, ${failed} failed`)
console.log(`${'─'.repeat(50)}\n`)

process.exit(failed > 0 ? 1 : 0)
