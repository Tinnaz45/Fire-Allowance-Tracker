import { useState, useMemo } from 'react'
import { useClaims } from '../hooks/useClaims'
import { useAuth } from '../hooks/useAuth'
import { ClaimRow, ClaimDetailSheet, EmptyState, LoadingScreen, fmtAUD } from '../components/UI'

const TAX_SMALL_MEAL = 10.90
const TAX_LARGE_MEAL = 20.55
const TAX_KM_RATE    = 1.20

// Australian financial year: July 1 – June 30
// Returns the start year of the FY (e.g. 2024 for FY 2024-25)
function getFY(dateStr) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1 // 1-12
  return month >= 7 ? d.getFullYear() : d.getFullYear() - 1
}

function fyLabel(startYear) {
  return `${startYear}–${String(startYear + 1).slice(-2)}`
}

function TaxInformation({ recalls, retain, standby, spoilt }) {
  const years = useMemo(() => {
    const all = [
      ...recalls.map(c => c.date),
      ...retain.map(c => c.date),
      ...standby.map(c => c.date),
      ...spoilt.map(c => c.date),
    ].filter(Boolean)
    const set = new Set(all.map(getFY))
    return [...set].sort((a, b) => b - a)
  }, [recalls, retain, standby, spoilt])

  const defaultFY = useMemo(() => {
    const cur = getFY(new Date().toISOString())
    return years.includes(cur) ? cur : years[0]
  }, [years])

  const [selectedFY, setSelectedFY] = useState(null)
  const activeFY = selectedFY ?? defaultFY

  if (years.length === 0) return null

  const inYear = d => getFY(d) === activeFY

  // ── Meals ──────────────────────────────────────────────────────
  // Small ($10.90): spoilt/delayed meal claims
  const smallCount = spoilt.filter(c => inYear(c.date)).length

  // Large ($20.55): recall mealies + all retain + standby night mealies
  const largeMealCount =
    recalls.filter(c => inYear(c.date) && c.mealie_amount > 0).length +
    retain.filter(c => inYear(c.date)).length +
    standby.filter(c => inYear(c.date) && c.night_mealie > 0).length

  const totalMeals  = smallCount + largeMealCount
  const smallTotal  = +(smallCount    * TAX_SMALL_MEAL).toFixed(2)
  const largeTotal  = +(largeMealCount * TAX_LARGE_MEAL).toFixed(2)
  const mealTotal   = +(smallTotal + largeTotal).toFixed(2)

  // ── Travel ─────────────────────────────────────────────────────
  // Recalls: dist_home_km + dist_stn_km are already return distances
  const recallKm  = recalls.filter(c => inYear(c.date))
    .reduce((s, c) => s + (c.dist_home_km || 0) + (c.dist_stn_km || 0), 0)
  // Standby/M&D: dist_km is one-way → ×2 for return
  const standbyKm = standby.filter(c => inYear(c.date))
    .reduce((s, c) => s + (c.dist_km || 0) * 2, 0)
  const totalKm    = Math.round(recallKm + standbyKm)
  const travelTotal = +(totalKm * TAX_KM_RATE).toFixed(2)

  const th = (right) => ({
    padding: '8px 12px',
    textAlign: right ? 'right' : 'left',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--text-2)',
    borderBottom: '2px solid var(--border)',
    whiteSpace: 'nowrap',
  })
  const td = (right, stripe, bold) => ({
    padding: '8px 12px',
    textAlign: right ? 'right' : 'left',
    borderBottom: '1px solid var(--border)',
    background: stripe ? 'rgba(0,0,0,0.02)' : 'transparent',
    fontWeight: bold ? 600 : 400,
    fontSize: '0.8125rem',
  })

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Tax Information</h3>
        <select
          value={activeFY}
          onChange={e => setSelectedFY(Number(e.target.value))}
          style={{
            fontSize: '0.8125rem', padding: '4px 8px',
            borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-1)', cursor: 'pointer',
          }}
        >
          {years.map(fy => <option key={fy} value={fy}>{fyLabel(fy)}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th(false)}>Type</th>
              <th style={{ ...th(true) }}>Count</th>
              <th style={{ ...th(true) }}>Rate</th>
              <th style={{ ...th(true) }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td(false, false)}>Small Meal Allowance</td>
              <td style={td(true, false)}>{smallCount}</td>
              <td style={td(true, false)}>{fmtAUD(TAX_SMALL_MEAL)}</td>
              <td style={td(true, false)}>{fmtAUD(smallTotal)}</td>
            </tr>
            <tr>
              <td style={td(false, true)}>Large Meal Allowance</td>
              <td style={td(true, true)}>{largeMealCount}</td>
              <td style={td(true, true)}>{fmtAUD(TAX_LARGE_MEAL)}</td>
              <td style={td(true, true)}>{fmtAUD(largeTotal)}</td>
            </tr>
            <tr>
              <td style={{ ...td(false, false, true), borderBottomWidth: 2 }}>Total Meals</td>
              <td style={{ ...td(true, false, true), borderBottomWidth: 2 }}>{totalMeals}</td>
              <td style={{ ...td(true, false, true), borderBottomWidth: 2 }}></td>
              <td style={{ ...td(true, false, true), borderBottomWidth: 2 }}>{fmtAUD(mealTotal)}</td>
            </tr>
            <tr>
              <td style={{ ...td(false, false), borderBottom: 'none' }}>Travel</td>
              <td style={{ ...td(true, false), borderBottom: 'none' }}>{totalKm} km</td>
              <td style={{ ...td(true, false), borderBottom: 'none' }}>${TAX_KM_RATE.toFixed(2)}/km</td>
              <td style={{ ...td(true, false), borderBottom: 'none' }}>{fmtAUD(travelTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 10 }}>
        ATO reasonable allowance rates · FY {fyLabel(activeFY)}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { recalls, retain, standby, spoilt, allClaims, stats, loading, markPaid, deleteClaim } = useClaims()
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  const firstName = profile?.first_name || 'there'
  const initials = ((profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '')).toUpperCase() || '?'

  const filtered = filter === 'all'
    ? allClaims.slice(0, 30)
    : allClaims.filter(c => c.status?.toLowerCase() === filter).slice(0, 30)

  if (loading) return <LoadingScreen />

  return (
    <div className="page">
      {/* greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div className="avatar">{initials}</div>
        <div>
          <h2 style={{ fontSize: '1.125rem' }}>Hey, {firstName}</h2>
          <p style={{ fontSize: '0.8125rem' }}>
            {profile?.station_id
              ? `Station ${profile.station_id} · Platoon ${profile.platoon || '—'}`
              : 'Set up your profile to get started'
            }
          </p>
        </div>
      </div>

      {/* stats */}
      <div className="grid-2" style={{ gap: 10 }}>
        <div className="stat">
          <div className="stat-label">Pending</div>
          <div className="stat-value warning">{stats.pending}</div>
          <div className="stat-sub">claims awaiting payslip</div>
        </div>
        <div className="stat">
          <div className="stat-label">Est. owed</div>
          <div className="stat-value accent">{fmtAUD(stats.pendingAmount)}</div>
          <div className="stat-sub">unpaid total</div>
        </div>
        <div className="stat">
          <div className="stat-label">Paid this year</div>
          <div className="stat-value success">{stats.paid}</div>
          <div className="stat-sub">confirmed on payslip</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total claims</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">across all types</div>
        </div>
      </div>

      {/* filter tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'paid', label: 'Paid' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`btn btn-sm ${filter === key ? 'btn-primary' : ''}`}
            style={{ flexShrink: 0 }}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* claims list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '12px 16px' }}>
          <h3>Recent claims</h3>
        </div>
        {filtered.length > 0
          ? filtered.map(c => (
              <ClaimRow
                key={`${c.type}-${c.id}`}
                claim={c}
                type={c.type}
                onClick={() => setSelected(c)}
              />
            ))
          : <EmptyState
              icon="📋"
              message={filter === 'all' ? 'No claims yet. Tap + to add your first.' : `No ${filter} claims.`}
            />
        }
      </div>

      {/* tax information */}
      <TaxInformation
        recalls={recalls}
        retain={retain}
        standby={standby}
        spoilt={spoilt}
      />

      {/* detail sheet */}
      {selected && (
        <ClaimDetailSheet
          claim={selected}
          type={selected.type}
          table={selected.table}
          onClose={() => setSelected(null)}
          onMarkPaid={markPaid}
          onDelete={deleteClaim}
        />
      )}
    </div>
  )
}
