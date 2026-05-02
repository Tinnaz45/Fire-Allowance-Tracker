import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import DistrictStationSelect from '../components/DistrictStationSelect'

const PLATOONS = ['A', 'B', 'C', 'D', 'Z']

export function ProfilePage() {
  const { profile, updateProfile, signOut, session } = useAuth()
  const [form, setForm] = useState({
    first_name: '', last_name: '', station_id: '',
    platoon: 'C', home_dist_km: '', home_address: '', employee_id: '',
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
        home_address: profile.home_address || '',
        employee_id: profile.employee_id || '',
      })
    }
  }, [profile])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const initials = (
    (form.first_name?.[0] || '') + (form.last_name?.[0] || '')
  ).toUpperCase() || '?'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSaved(false); setSaving(true)
    const { error } = await updateProfile({
      ...form,
      station_id: parseInt(form.station_id) || null,
      home_dist_km: parseFloat(form.home_dist_km) || 0,
    })
    if (error) setError(error.message)
    else setSaved(true)
    setSaving(false)
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: '1.375rem', borderRadius: 20 }}>
          {initials}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2>{form.first_name ? `${form.first_name} ${form.last_name}` : 'Your profile'}</h2>
          <p style={{ fontSize: '0.875rem' }}>{session?.user?.email}</p>
        </div>
      </div>

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

          <div className="field">
            <label>Home address</label>
            <input
              type="text"
              value={form.home_address}
              onChange={set('home_address')}
              placeholder="123 Example St, Suburb VIC 3000"
              autoComplete="street-address"
            />
          </div>

          <div className="grid-2">
            <DistrictStationSelect
              label="Home station"
              stationId={form.station_id ? Number(form.station_id) : ''}
              onChange={(val) => setForm(f => ({ ...f, station_id: val }))}
            />
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Platoon</label>
              <select value={form.platoon} onChange={set('platoon')}>
                {PLATOONS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Home → station (km return)</label>
              <input type="number" value={form.home_dist_km} onChange={set('home_dist_km')} placeholder="0" min="0" step="0.5" />
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

      <button className="btn btn-full" style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', marginTop: 8 }} onClick={signOut}>
        Sign out
      </button>
    </div>
  )
}
