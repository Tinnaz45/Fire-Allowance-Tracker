import { useState } from 'react'
import { useClaims } from '../hooks/useClaims'
import { STATIONS, RATES } from '../lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtAUD = (n) => `$${Number(n || 0).toFixed(2)}`
const today = () => new Date().toISOString().split('T')[0]

function StationSelect({ label, name, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select name={name} value={value} onChange={onChange}>
        <option value="">Select station…</option>
        {STATIONS.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function SuccessBanner({ onDismiss }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--success-bg)',
      border: '1px solid var(--success)',
      borderRadius: 'var(--radius)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>
        Claim submitted successfully
      </span>
      <button className="btn btn-ghost btn-sm" onClick={onDismiss}>Dismiss</button>
    </div>
  )
}

function FormCard({ children, onSubmit, submitLabel, loading }) {
  return (
    <form onSubmit={onSubmit}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
        <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ── RECALL PAGE ───────────────────────────────────────────────────────────────
export function RecallsPage() {
  const { addRecall } = useClaims()
  const [form, setForm] = useState({
    date: today(), platoon: '', shift: 'Day',
    rosteredStnId: '', recallStnId: '',
    arrived: '', distHomeKm: '', distStnKm: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const km = (parseFloat(form.distHomeKm) || 0) + (parseFloat(form.distStnKm) || 0)
  const travel = +(km * RATES.kmRate).toFixed(2)
  const mealie = form.shift === 'Night' ? RATES.nightMealie : RATES.dayMealie
  const estTotal = +(travel + mealie).toFixed(2)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await addRecall(form)
    setLoading(false)
    if (!error) {
      setSuccess(true)
      setForm({ date: today(), platoon: '', shift: 'Day', rosteredStnId: '', recallStnId: '', arrived: '', distHomeKm: '', distStnKm: '', notes: '' })
    } else {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="page">
      <h2>Recall Claim</h2>
      {success && <SuccessBanner onDismiss={() => setSuccess(false)} />}
      <FormCard onSubmit={handleSubmit} submitLabel="Submit recall" loading={loading}>
        <Field label="Date">
          <input type="date" name="date" value={form.date} onChange={set} required />
        </Field>
        <Field label="Shift">
          <select name="shift" value={form.shift} onChange={set}>
            <option value="Day">Day</option>
            <option value="Night">Night</option>
          </select>
        </Field>
        <Field label="Platoon">
          <input type="text" name="platoon" value={form.platoon} onChange={set} placeholder="e.g. A" />
        </Field>
        <StationSelect label="Rostered station" name="rosteredStnId" value={form.rosteredStnId} onChange={set} />
        <StationSelect label="Recall station" name="recallStnId" value={form.recallStnId} onChange={set} />
        <Field label="Arrival time">
          <input type="time" name="arrived" value={form.arrived} onChange={set} />
        </Field>
        <div className="grid-2">
          <Field label="Home distance (km)">
            <input type="number" name="distHomeKm" value={form.distHomeKm} onChange={set} min="0" step="0.1" placeholder="0" />
          </Field>
          <Field label="Station distance (km)">
            <input type="number" name="distStnKm" value={form.distStnKm} onChange={set} min="0" step="0.1" placeholder="0" />
          </Field>
        </div>
        <Field label="Notes">
          <input type="text" name="notes" value={form.notes} onChange={set} placeholder="Optional" />
        </Field>
        <div className="info-box">
          Travel {fmtAUD(travel)} + mealie {fmtAUD(mealie)} = <strong>{fmtAUD(estTotal)}</strong>
        </div>
      </FormCard>
    </div>
  )
}

// ── RETAIN PAGE ───────────────────────────────────────────────────────────────
export function RetainPage() {
  const { addRetain } = useClaims()
  const [form, setForm] = useState({
    date: today(), platoon: '', shift: 'Day',
    stationId: '', bookedOffTime: '',
    rmssNumber: '', isFirecall: 'no', overnightCash: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const retainAmt = form.shift === 'Night' ? RATES.retainNight : RATES.retainDay
  const overnight = parseFloat(form.overnightCash) || 0
  const estTotal = +(retainAmt + overnight).toFixed(2)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await addRetain(form)
    setLoading(false)
    if (!error) {
      setSuccess(true)
      setForm({ date: today(), platoon: '', shift: 'Day', stationId: '', bookedOffTime: '', rmssNumber: '', isFirecall: 'no', overnightCash: '' })
    } else {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="page">
      <h2>Retain Claim</h2>
      {success && <SuccessBanner onDismiss={() => setSuccess(false)} />}
      <FormCard onSubmit={handleSubmit} submitLabel="Submit retain" loading={loading}>
        <Field label="Date">
          <input type="date" name="date" value={form.date} onChange={set} required />
        </Field>
        <Field label="Shift">
          <select name="shift" value={form.shift} onChange={set}>
            <option value="Day">Day</option>
            <option value="Night">Night</option>
          </select>
        </Field>
        <Field label="Platoon">
          <input type="text" name="platoon" value={form.platoon} onChange={set} placeholder="e.g. A" />
        </Field>
        <StationSelect label="Station" name="stationId" value={form.stationId} onChange={set} />
        <Field label="Booked off time">
          <input type="time" name="bookedOffTime" value={form.bookedOffTime} onChange={set} />
        </Field>
        <Field label="RMSS / call number">
          <input type="text" name="rmssNumber" value={form.rmssNumber} onChange={set} placeholder="Optional" />
        </Field>
        <Field label="Firecall?">
          <select name="isFirecall" value={form.isFirecall} onChange={set}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
        <Field label="Overnight cash ($)">
          <input type="number" name="overnightCash" value={form.overnightCash} onChange={set} min="0" step="0.01" placeholder="0" />
        </Field>
        <div className="info-box">
          Retain {fmtAUD(retainAmt)}{overnight > 0 ? ` + overnight ${fmtAUD(overnight)}` : ''} = <strong>{fmtAUD(estTotal)}</strong>
        </div>
      </FormCard>
    </div>
  )
}

// ── STANDBY / M&D SHARED FORM ─────────────────────────────────────────────────
function StandbyMandForm({ claimType }) {
  const { addStandby } = useClaims()
  const [form, setForm] = useState({
    date: today(), shift: 'Day',
    rosteredStnId: '', standbyStnId: '',
    arrived: '', distKm: '', notes: '', freeFromHome: 'no',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const km = parseFloat(form.distKm) || 0
  const travel = +(km * 2 * RATES.kmRate).toFixed(2)
  const nightMealie = form.shift === 'Night' ? RATES.nightStandbyMealie : 0
  const estTotal = +(travel + nightMealie).toFixed(2)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await addStandby({ ...form, standbyType: claimType })
    setLoading(false)
    if (!error) {
      setSuccess(true)
      setForm({ date: today(), shift: 'Day', rosteredStnId: '', standbyStnId: '', arrived: '', distKm: '', notes: '', freeFromHome: 'no' })
    } else {
      alert('Error: ' + error.message)
    }
  }

  const title = claimType === 'M&D' ? 'Muster & Dismiss' : 'Standby'
  const stnLabel = claimType === 'M&D' ? 'Muster station' : 'Standby station'

  return (
    <div className="page">
      <h2>{title} Claim</h2>
      {success && <SuccessBanner onDismiss={() => setSuccess(false)} />}
      <FormCard onSubmit={handleSubmit} submitLabel={`Submit ${claimType}`} loading={loading}>
        <Field label="Date">
          <input type="date" name="date" value={form.date} onChange={set} required />
        </Field>
        <Field label="Shift">
          <select name="shift" value={form.shift} onChange={set}>
            <option value="Day">Day</option>
            <option value="Night">Night</option>
          </select>
        </Field>
        <StationSelect label="Rostered station" name="rosteredStnId" value={form.rosteredStnId} onChange={set} />
        <StationSelect label={stnLabel} name="standbyStnId" value={form.standbyStnId} onChange={set} />
        <Field label="Arrival time">
          <input type="time" name="arrived" value={form.arrived} onChange={set} />
        </Field>
        <Field label="Distance (km, one way)">
          <input type="number" name="distKm" value={form.distKm} onChange={set} min="0" step="0.1" placeholder="0" />
        </Field>
        <Field label="Notes">
          <input type="text" name="notes" value={form.notes} onChange={set} placeholder="Optional" />
        </Field>
        <Field label="Free from home?">
          <select name="freeFromHome" value={form.freeFromHome} onChange={set}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
        <div className="info-box">
          Travel {fmtAUD(travel)}{nightMealie > 0 ? ` + night mealie ${fmtAUD(nightMealie)}` : ''} = <strong>{fmtAUD(estTotal)}</strong>
        </div>
      </FormCard>
    </div>
  )
}

export function StandbyPage() { return <StandbyMandForm claimType="Standby" /> }
export function MandPage()    { return <StandbyMandForm claimType="M&D" /> }

// ── SPOILT / MEALS PAGE ───────────────────────────────────────────────────────
export function SpoiltPage() {
  const { addSpoilt } = useClaims()
  const [form, setForm] = useState({
    date: today(), mealType: 'Spoilt', shift: 'Day',
    platoon: '', stationId: '', claimStnId: '',
    callTime: '', callNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await addSpoilt(form)
    setLoading(false)
    if (!error) {
      setSuccess(true)
      setForm({ date: today(), mealType: 'Spoilt', shift: 'Day', platoon: '', stationId: '', claimStnId: '', callTime: '', callNumber: '' })
    } else {
      alert('Error: ' + error.message)
    }
  }

  return (
    <div className="page">
      <h2>Spoilt / Delayed Meal</h2>
      {success && <SuccessBanner onDismiss={() => setSuccess(false)} />}
      <FormCard onSubmit={handleSubmit} submitLabel="Submit meal claim" loading={loading}>
        <Field label="Date">
          <input type="date" name="date" value={form.date} onChange={set} required />
        </Field>
        <Field label="Meal type">
          <select name="mealType" value={form.mealType} onChange={set}>
            <option value="Spoilt">Spoilt (interrupted during meal)</option>
            <option value="Delayed">Delayed (couldn't eat on time)</option>
          </select>
        </Field>
        <Field label="Shift">
          <select name="shift" value={form.shift} onChange={set}>
            <option value="Day">Day</option>
            <option value="Night">Night</option>
          </select>
        </Field>
        <Field label="Platoon">
          <input type="text" name="platoon" value={form.platoon} onChange={set} placeholder="e.g. A" />
        </Field>
        <StationSelect label="Station (where meal was missed)" name="stationId" value={form.stationId} onChange={set} />
        <StationSelect label="Claim station" name="claimStnId" value={form.claimStnId} onChange={set} />
        <Field label="Call time">
          <input type="time" name="callTime" value={form.callTime} onChange={set} />
        </Field>
        <Field label="Incident / call number">
          <input type="text" name="callNumber" value={form.callNumber} onChange={set} placeholder="Optional" />
        </Field>
        <div className="info-box">
          Meal allowance: <strong>{fmtAUD(RATES.spoiltMeal)}</strong>
        </div>
      </FormCard>
    </div>
  )
}
