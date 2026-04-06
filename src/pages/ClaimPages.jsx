import { useState } from 'react'
import { useClaims } from '../hooks/useClaims'
import { RATES } from '../lib/supabase'
import { ClaimRow, ClaimDetailSheet, EmptyState, fmtAUD, StationSelect } from '../components/UI'
import { useAuth } from '../hooks/useAuth'

const PLATOONS = ['A', 'B', 'C', 'D', 'Z']

// ── SHARED FORM WRAPPER ───────────────────────────────────────
function FormCard({ title, children, onSubmit, submitting }) {
  return (
    <form className="card" onSubmit={onSubmit}>
      <div className="card-header"><h3>{title}</h3></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
        <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
          {submitting
            ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            : 'Save claim'
          }
        </button>
      </div>
    </form>
  )
}

// ── CLAIM LIST SECTION ────────────────────────────────────────
function ClaimList({ claims, type, table, markPaid, deleteClaim }) {
  const [selected, setSelected] = useState(null)
  const pending = claims.filter(c => c.status === 'Pending')
  const pendingAmt = pending.reduce((s, c) => {
    const a = type === 'Spoilt' ? c.meal_amount : c.total_amount
    return s + (a || 0)
  }, 0)

  return (
    <>
      {pendingAmt > 0 && (
        <div className="amount-bar">
          <span className="amount-bar-label">Pending {type.toLowerCase()} total</span>
          <span className="amount-bar-value">{fmtAUD(pendingAmt)}</span>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '12px 16px' }}>
          <h3>{type} claims</h3>
          <span className="badge badge-gray">{claims.length}</span>
        </div>
        {claims.length > 0
          ? claims.map(c => (
              <ClaimRow key={c.id} claim={c} type={type} onClick={() => setSelected(c)} />
            ))
          : <EmptyState icon="📋" message={`No ${type.toLowerCase()} claims yet.`} />
        }
      </div>

      {selected && (
        <ClaimDetailSheet
          claim={selected}
          type={type}
          table={table}
          onClose={() => setSelected(null)}
          onMarkPaid={markPaid}
          onDelete={deleteClaim}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// RECALLS PAGE
// ─────────────────────────────────────────────────────────────
export function RecallsPage() {
  const { recalls, addRecall, markPaid, deleteClaim } = useClaims()
  const { profile } = useAuth()
  const [form, setForm] = useState({
    date: '', rosteredStnId: profile?.station_id || '', recallStnId: '',
    platoon: profile?.platoon || 'C', shift: 'Night', arrived: '',
    distHomeKm: profile?.home_dist_km || '', distStnKm: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const km = (parseFloat(form.distHomeKm) || 0) + (parseFloat(form.distStnKm) || 0)
  const travel = +(km * RATES.kmRate).toFixed(2)
  const mealie = form.shift === 'Night' ? RATES.nightMealie : RATES.dayMealie
  const estTotal = travel + mealie

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    setSubmitting(true)
    const { error } = await addRecall(form)
    if (error) setError(error.message)
    else setForm(f => ({ ...f, date: '', recallStnId: '', arrived: '', distStnKm: '', notes: '' }))
    setSubmitting(false)
  }

  return (
    <div className="page">
      <FormCard title="New recall claim" onSubmit={handleSubmit} submitting={submitting}>
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

        <StationSelect label="Rostered station" value={form.rosteredStnId} onChange={set('rosteredStnId')} />
        <StationSelect label="Recall station" value={form.recallStnId} onChange={set('recallStnId')} required />

        <div className="grid-2">
          <div className="field">
            <label>Platoon</label>
            <select value={form.platoon} onChange={set('platoon')}>
              {PLATOONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Arrival time (HHMM)</label>
            <input type="text" value={form.arrived} onChange={set('arrived')} placeholder="e.g. 1940" maxLength={4} />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Home → rostered stn (km return)</label>
            <input type="number" value={form.distHomeKm} onChange={set('distHomeKm')} placeholder="0" min="0" step="0.5" />
          </div>
          <div className="field">
            <label>Rostered → recall stn (km return)</label>
            <input type="number" value={form.distStnKm} onChange={set('distStnKm')} placeholder="0" min="0" step="0.5" />
          </div>
        </div>

        <div className="field">
          <label>Notes</label>
          <input type="text" value={form.notes} onChange={set('notes')} placeholder="Optional" />
        </div>

        {km > 0 && (
          <div className="info-box">
            Est. travel: {fmtAUD(travel)} + mealie: {fmtAUD(mealie)} = <strong>{fmtAUD(estTotal)}</strong>
          </div>
        )}
      </FormCard>

      <ClaimList claims={recalls} type="Recall" table="recalls" markPaid={markPaid} deleteClaim={deleteClaim} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RETAIN PAGE
// ─────────────────────────────────────────────────────────────
export function RetainPage() {
  const { retain, addRetain, markPaid, deleteClaim } = useClaims()
  const { profile } = useAuth()
  const [form, setForm] = useState({
    date: '', stationId: profile?.station_id || '',
    platoon: profile?.platoon || 'C', shift: 'Night',
    bookedOffTime: '', rmssNumber: '', isFirecall: 'no', overnightCash: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const retainAmt = form.shift === 'Night' ? RATES.retainNight : RATES.retainDay

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    setSubmitting(true)
    const { error } = await addRetain(form)
    if (error) setError(error.message)
    else setForm(f => ({ ...f, date: '', bookedOffTime: '', rmssNumber: '', isFirecall: 'no', overnightCash: '' }))
    setSubmitting(false)
  }

  return (
    <div className="page">
      <FormCard title="New retain claim" onSubmit={handleSubmit} submitting={submitting}>
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

        <StationSelect label="Station" value={form.stationId} onChange={set('stationId')} />

        <div className="grid-2">
          <div className="field">
            <label>Platoon</label>
            <select value={form.platoon} onChange={set('platoon')}>
              {PLATOONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Booked off time (HHMM)</label>
            <input type="text" value={form.bookedOffTime} onChange={set('bookedOffTime')} placeholder="1905" maxLength={4} />
          </div>
        </div>

        <div className="field">
          <label>RMSS / call number</label>
          <input type="text" value={form.rmssNumber} onChange={set('rmssNumber')} placeholder="e.g. 250700597" />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Retained due to firecall?</label>
            <select value={form.isFirecall} onChange={set('isFirecall')}>
              <option value="no">No</option>
              <option value="yes">Yes — firecall number above</option>
            </select>
          </div>
          <div className="field">
            <label>Overnight petty cash ($)</label>
            <input type="number" value={form.overnightCash} onChange={set('overnightCash')} placeholder="0.00" step="0.01" min="0" />
          </div>
        </div>

        <div className="info-box">
          Retain pay ({form.shift}): <strong>{fmtAUD(retainAmt)}</strong>
        </div>
      </FormCard>

      <ClaimList claims={retain} type="Retain" table="retain" markPaid={markPaid} deleteClaim={deleteClaim} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// STANDBY / M&D PAGE
// ─────────────────────────────────────────────────────────────
export function StandbyPage() {
  const { standby, addStandby, markPaid, deleteClaim } = useClaims()
  const { profile } = useAuth()
  const [form, setForm] = useState({
    date: '', standbyType: 'Standby', shift: 'Day',
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

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    setSubmitting(true)
    const { error } = await addStandby(form)
    if (error) setError(error.message)
    else setForm(f => ({ ...f, date: '', standbyStnId: '', arrived: '', distKm: '', notes: '' }))
    setSubmitting(false)
  }

  return (
    <div className="page">
      <div className="info-box" style={{ fontSize: '0.8125rem' }}>
        Distance is one-way — the app doubles it for the return trip.
      </div>

      <FormCard title="New standby / M&D claim" onSubmit={handleSubmit} submitting={submitting}>
        {error && <div className="auth-error">{error}</div>}

        <div className="grid-2">
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={set('date')} required />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.standbyType} onChange={set('standbyType')}>
              <option>Standby</option><option>M&D</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Shift</label>
            <select value={form.shift} onChange={set('shift')}>
              <option>Day</option><option>Night</option>
            </select>
          </div>
          <div className="field">
            <label>Arrival time (HHMM)</label>
            <input type="text" value={form.arrived} onChange={set('arrived')} placeholder="0905" maxLength={4} />
          </div>
        </div>

        <StationSelect label="Rostered station" value={form.rosteredStnId} onChange={set('rosteredStnId')} />
        <StationSelect label="Standby / M&D station" value={form.standbyStnId} onChange={set('standbyStnId')} required />

        <div className="grid-2">
          <div className="field">
            <label>Distance to standby stn (km, one way)</label>
            <input type="number" value={form.distKm} onChange={set('distKm')} placeholder="0" min="0" step="0.5" />
          </div>
          <div className="field">
            <label>Free from home?</label>
            <select value={form.freeFromHome} onChange={set('freeFromHome')}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
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

      <ClaimList claims={standby} type="Standby" table="standby" markPaid={markPaid} deleteClaim={deleteClaim} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SPOILT / DELAYED PAGE
// ─────────────────────────────────────────────────────────────
export function SpoiltPage() {
  const { spoilt, addSpoilt, markPaid, deleteClaim } = useClaims()
  const { profile } = useAuth()
  const [form, setForm] = useState({
    date: '', mealType: 'Spoilt', shift: 'Day',
    stationId: profile?.station_id || '', platoon: profile?.platoon || 'C',
    callTime: '', callNumber: '', claimStnId: profile?.station_id || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    setSubmitting(true)
    const { error } = await addSpoilt(form)
    if (error) setError(error.message)
    else setForm(f => ({ ...f, date: '', callTime: '', callNumber: '' }))
    setSubmitting(false)
  }

  return (
    <div className="page">
      <div className="info-box" style={{ fontSize: '0.8125rem' }}>
        <strong>Meal windows</strong> &nbsp;·&nbsp; Day: 1200–1300 &nbsp;·&nbsp; Night: 1830–1930
        <br />Current rate: <strong>{fmtAUD(RATES.spoiltMeal)}</strong>
      </div>

      <FormCard title="New spoilt / delayed meal claim" onSubmit={handleSubmit} submitting={submitting}>
        {error && <div className="auth-error">{error}</div>}

        <div className="grid-2">
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={set('date')} required />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={form.mealType} onChange={set('mealType')}>
              <option>Spoilt</option><option>Delayed</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Shift</label>
            <select value={form.shift} onChange={set('shift')}>
              <option>Day</option><option>Night</option>
            </select>
          </div>
          <div className="field">
            <label>Platoon</label>
            <select value={form.platoon} onChange={set('platoon')}>
              {PLATOONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <StationSelect label="Station (where meal was spoilt)" value={form.stationId} onChange={set('stationId')} required />

        <div className="grid-2">
          <div className="field">
            <label>Call / incident time (HHMM)</label>
            <input type="text" value={form.callTime} onChange={set('callTime')} placeholder="1245" maxLength={4} />
          </div>
          <div className="field">
            <label>Incident / call number</label>
            <input type="text" value={form.callNumber} onChange={set('callNumber')} placeholder="e.g. 28963" />
          </div>
        </div>

        <StationSelect label="Claim station (petty cash)" value={form.claimStnId} onChange={set('claimStnId')} />
      </FormCard>

      <ClaimList claims={spoilt} type="Spoilt" table="spoilt" markPaid={markPaid} deleteClaim={deleteClaim} />
    </div>
  )
}
