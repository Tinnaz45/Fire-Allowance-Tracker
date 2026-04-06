import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { StationSelect } from '../components/UI'

const PLATOONS = ['A', 'B', 'C', 'D', 'Z']

export default function ProfilePage() {
  const { profile, updateProfile, signOut, session } = useAuth()
  const [form, setForm] = useState({
    first_name: '', last_name: '', station_id: '',
    platoon: 'C', home_dist_km: '', employee_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        station_id: profile.station_id || '',
        platoon: profile.platoon || 'C',
        home_dist_km: profile.home_dist_km || '',
        employee_id: profile.employee_id || '',
      })
    }
  }, [profile])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setSaved(false); setSaving(true)
    const { error } = await updateProfile({
      ...form,
      station_id: parseInt(form.station_id) || null,
      home_dist_km: parseFloat(form.home_dist_km) || 0,
    })
    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
  }

  const initials = ((form.first_name?.[0] || '') + (form.last_name?.[0] || '')).toUpperCase() || '?'

  return (
    <div className="page">
      {/* avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: '1.375rem', borderRadius: 20 }}>
          {initials}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2>{form.first_name ? `${form.first_name} ${form.last_name}` : 'Your profile'}</h2>
          <p style={{ fontSize: '0.875rem' }}>{session?.user?.email}</p>
        </div>
      </div>

      {/* form */}
      <form className="card" onSubmit={handleSubmit}>
        <div className="card-header"><h3>Personal details</h3></div>

        {error && <div className="auth-error">{error}</div>}
        {saved && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius)', padding: '10px 13px', fontSize: '0.875rem' }}>
            Profile saved.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid-2">
            <div className="field">
              <label>First name</label>
              <input type="text" value={form.first_name} onChange={set('first_name')} placeholder="Jamie" autoComplete="given-name" />
            </div>
            <div className="field">
              <label>Last name</label>
              <input type="text" value={form.last_name} onChange={set('last_name')} placeholder="Morton" autoComplete="family-name" />
            </div>
          </div>

          <StationSelect label="Home station" value={form.station_id} onChange={set('station_id')} />

          <div className="grid-2">
            <div className="field">
              <label>Platoon</label>
              <select value={form.platoon} onChange={set('platoon')}>
                {PLATOONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Home → station (km return)</label>
              <input type="number" value={form.home_dist_km} onChange={set('home_dist_km')} placeholder="45" min="0" step="0.5" />
              <span className="field-hint">Pre-fills recall forms</span>
            </div>
          </div>

          <div className="field">
            <label>Employee / payroll ID</label>
            <input type="text" value={form.employee_id} onChange={set('employee_id')} placeholder="Optional" />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={saving}>
            {saving
              ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              : 'Save profile'
            }
          </button>
        </div>
      </form>

      {/* app info */}
      <div className="card">
        <div className="card-header"><h3>App info</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem', color: 'var(--text-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Km rate</span><span style={{ fontFamily: 'var(--mono)' }}>$0.43/km</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Day mealie</span><span style={{ fontFamily: 'var(--mono)' }}>$17.85</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Night mealie</span><span style={{ fontFamily: 'var(--mono)' }}>$22.40</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Retain (day)</span><span style={{ fontFamily: 'var(--mono)' }}>$28.50</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Retain (night)</span><span style={{ fontFamily: 'var(--mono)' }}>$42.70</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Spoilt/delayed meal</span><span style={{ fontFamily: 'var(--mono)' }}>$22.80</span>
          </div>
        </div>
      </div>

      {/* sign out */}
      <button
        className="btn btn-full"
        style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
        onClick={() => { if (window.confirm('Sign out?')) signOut() }}
      >
        Sign out
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)', paddingBottom: 8 }}>
        FRV Allowances v1.0 · Data stored securely in Supabase
      </p>
    </div>
  )
}
