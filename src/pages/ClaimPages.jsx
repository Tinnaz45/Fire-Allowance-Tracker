import { useState } from 'react'
import { useClaims } from '../hooks/useClaims'
import { RATES } from '../lib/supabase'
import { ClaimRow, ClaimDetailSheet, EmptyState, fmtAUD } from '../components/UI'
import { useAuth } from '../hooks/useAuth'
import DistrictStationSelect from '../components/DistrictStationSelect'

const PLATOONS = ['A', 'B', 'C', 'D', 'Z']

// ✅ LABEL MAP (NEW)
const CLAIM_TYPE_LABELS = {
"Standby": "Standby",
"M&D": "Muster & Dismiss"
}

// ── SHARED FORM WRAPPER ───────────────────────────────────────────────────────
function FormCard({ title, children, onSubmit, submitting }) {
return ( <form className="card" onSubmit={onSubmit}> <div className="card-header"><h3>{title}</h3></div>
<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
{children} <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
{submitting
? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
: 'Save claim'
} </button> </div> </form>
)
}

// ── CLAIM LIST SECTION ────────────────────────────────────────────────────────
function ClaimList({ claims, type, table, markPaid, deleteClaim }) {
const [selected, setSelected] = useState(null)
const pending = claims.filter(c => c.status === 'Pending')
const pendingAmt = pending.reduce((s, c) => {
const a = type === 'Spoilt' ? c.meal_amount : c.total_amount
return s + (a || 0)
}, 0)

const displayType = CLAIM_TYPE_LABELS[type] || type

return (
<>
{pendingAmt > 0 && ( <div className="amount-bar"> <span className="amount-bar-label">Pending {displayType.toLowerCase()} total</span> <span className="amount-bar-value">{fmtAUD(pendingAmt)}</span> </div>
)}

```
  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
    <div className="card-header" style={{ padding: '12px 16px' }}>
      <h3>{displayType} claims</h3>
      <span className="badge badge-gray">{claims.length}</span>
    </div>
    {claims.length > 0
      ? claims.map(c => (
          <ClaimRow key={c.id} claim={c} type={displayType} onClick={() => setSelected(c)} />
        ))
      : <EmptyState icon="📋" message={`No ${displayType.toLowerCase()} claims yet.`} />
    }
  </div>

  {selected && (
    <ClaimDetailSheet
      claim={selected}
      type={displayType}
      table={table}
      onClose={() => setSelected(null)}
      onMarkPaid={markPaid}
      onDelete={deleteClaim}
    />
  )}
</>
```

)
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STANDBY FORM
// ─────────────────────────────────────────────────────────────────────────────
function StandbyForm({ claimType }) {
const { standby, addStandby, markPaid, deleteClaim } = useClaims()
const { profile } = useAuth()

const label = CLAIM_TYPE_LABELS[claimType] || claimType
const stnLabel = `${label} station`

const [form, setForm] = useState({
date: '', standbyType: claimType, shift: 'Day',
rosteredStnId: profile?.station_id || '', standbyStnId: '',
arrived: '', distKm: '', notes: '', freeFromHome: 'no',
})

const [submitting, setSubmitting] = useState(false)
const [error, setError] = useState('')

const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
const km = parseFloat(form.distKm) || 0
const travel = +(km * 2 * RATES.kmRate).toFixed(2)
const nightMealie = form.shift === 'Night' ? RATES.nightStandbyMealie : 0
const estTotal = travel + nightMealie

const filteredClaims = standby.filter(c => c.standby_type === claimType)

async function handleSubmit(e) {
e.preventDefault(); setError('')
setSubmitting(true)
const { error } = await addStandby(form)
if (error) setError(error.message)
else setForm(f => ({ ...f, date: '', standbyStnId: '', arrived: '', distKm: '', notes: '' }))
setSubmitting(false)
}

return ( <div className="page">
<div className="info-box" style={{ fontSize: '0.8125rem' }}>
Distance is one-way — the app doubles it for the return trip. </div>

```
  <FormCard title={`New ${label} Claim`} onSubmit={handleSubmit} submitting={submitting}>
    {error && <div className="auth-error">{error}</div>}

    <div className="grid-2">
      <div className="field">
        <label>Date</label>
        <input type="date" value={form.date} onChange={set('date')} required />
      </div>
      <div className="field">
        <label>Shift</label>
        <select value={form.shift} onChange={set('shift')}>
          <option>Day</option><option>Night</option>
        </select>
      </div>
    </div>

    <div className="grid-2">
      <div className="field">
        <label>Arrival time (HHMM)</label>
        <input type="text" value={form.arrived} onChange={set('arrived')} placeholder="0905" maxLength={4} />
      </div>
      <div className="field">
        <label>Free from home?</label>
        <select value={form.freeFromHome} onChange={set('freeFromHome')}>
          <option value="no">No</option><option value="yes">Yes</option>
        </select>
      </div>
    </div>

    <DistrictStationSelect
      label="Rostered station"
      stationId={form.rosteredStnId ? Number(form.rosteredStnId) : ''}
      onChange={(val) => setForm(f => ({ ...f, rosteredStnId: val }))}
    />

    <DistrictStationSelect
      label={stnLabel}
      stationId={form.standbyStnId ? Number(form.standbyStnId) : ''}
      onChange={(val) => setForm(f => ({ ...f, standbyStnId: val }))}
    />

    <div className="field">
      <label>Distance to {stnLabel} (km, one way)</label>
      <input type="number" value={form.distKm} onChange={set('distKm')} placeholder="0" min="0" step="0.5" />
    </div>

    <div className="field">
      <label>Purpose / notes</label>
      <input type="text" value={form.notes} onChange={set('notes')} placeholder="e.g. Series 1 Pumper Course" />
    </div>

    {(km > 0 || form.shift === 'Night') && (
      <div className="info-box">
        Est. travel: {fmtAUD(travel)}
        {nightMealie > 0 && ` + night mealie: ${fmtAUD(nightMealie)}`}
        {' = '}<strong>{fmtAUD(estTotal)}</strong>
      </div>
    )}
  </FormCard>

  <ClaimList claims={filteredClaims} type={claimType} table="standby" markPaid={markPaid} deleteClaim={deleteClaim} />
</div>
```

)
}

export function StandbyPage() {
return <StandbyForm claimType="Standby" />
}

// ✅ IMPORTANT: keep internal value as M&D
export function MandPage() {
return <StandbyForm claimType="M&D" />
}
