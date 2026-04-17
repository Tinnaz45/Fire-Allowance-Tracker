import { useState } from 'react'
import { useClaims } from '../hooks/useClaims'
import { useAuth } from '../hooks/useAuth'
import ClaimList from '../components/ClaimList'
import DistrictStationSelect from '../components/DistrictStationSelect'
import { fmtAUD, RATES } from '../lib/utils'

function StandbyForm({ claimType }) {
  const { standby, addStandby, markPaid, deleteClaim } = useClaims()
  const { profile } = useAuth()

  const [form, setForm] = useState({
    date: '',
    standbyType: claimType,
    shift: 'Day',
    rosteredStnId: profile?.station_id || '',
    standbyStnId: '',
    arrived: '',
    distKm: '',
    notes: '',
    freeFromHome: 'no'
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const km = parseFloat(form.distKm || 0)
  const travel = +(km * 2 * RATES.kmRate).toFixed(2)
  const nightMealie = form.shift === 'Night' ? RATES.nightStandbyMealie : 0
  const estTotal = travel + nightMealie

  const filteredClaims = standby.filter(c => c.standby_type === claimType)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error } = await addStandby(form)
    if (error) {
      setError(error.message)
    } else {
      setForm(f => ({
        ...f,
        date: '',
        standbyStnId: '',
        arrived: '',
        distKm: '',
        notes: ''
      }))
    }

    setSubmitting(false)
  }

  // 🔥 FIXED LABEL MAP
  const labelMap = {
    Standby: 'Standby',
    'M&D': 'Muster & Dismiss'
  }

  const label = labelMap[claimType] || claimType

  const stnLabelMap = {
    Standby: 'Standby station',
    'M&D': 'Muster & Dismiss station'
  }

  const stnLabel = stnLabelMap[claimType] || 'Station'

  return (
    <div className="page">
      <div className="info-box" style={{ fontSize: '0.8125rem' }}>
        Distance is one-way – the app doubles it for the return trip.
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <h2>New {label} claim</h2>

        {error && <div className="auth-error">{error}</div>}

        <div className="grid-2">
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.date} onChange={set('date')} required />
          </div>

          <div className="field">
            <label>Shift</label>
            <select value={form.shift} onChange={set('shift')}>
              <option>Day</option>
              <option>Night</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Arrival time (HHMM)</label>
            <input
              type="text"
              value={form.arrived}
              onChange={set('arrived')}
              maxLength={4}
            />
          </div>

          <div className="field">
            <label>Free from home?</label>
            <select value={form.freeFromHome} onChange={set('freeFromHome')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
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
          <input
            type="number"
            value={form.distKm}
            onChange={set('distKm')}
            min="0"
            step="0.5"
          />
        </div>

        <div className="field">
          <label>Purpose / notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={set('notes')}
            placeholder="e.g. Series 1 Pumper Course"
          />
        </div>

        {(km > 0 || form.shift === 'Night') && (
          <div className="info-box">
            Est. travel: {fmtAUD(travel)}
            {nightMealie > 0 && <> + night mealie: {fmtAUD(nightMealie)}</>}
            {' = '}<strong>{fmtAUD(estTotal)}</strong>
          </div>
        )}

        <button className="btn-primary" disabled={submitting}>
          Save claim
        </button>
      </form>

      <ClaimList
        claims={filteredClaims}
        type={claimType}
        table="standby"
        markPaid={markPaid}
        deleteClaim={deleteClaim}
      />
    </div>
  )
}

// PAGES
export function StandbyPage() {
  return <StandbyForm claimType="Standby" />
}

// ✅ KEEP THIS EXACTLY (internal value only)
export function MandPage() {
  return <StandbyForm claimType="M&D" />
}