import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { DISTRICTS, getStationsForDistrict } from '../data/stations'
import DistrictStationSelect from '../components/DistrictStationSelect'
import { useStationDistances } from '../hooks/useStationDistances'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

const thStyle = {
  padding: '9px 8px',
  fontWeight: 600,
  fontSize: '0.75rem',
  textAlign: 'center',
  color: 'var(--text-2)',
  borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap',
  background: 'var(--surface)',
}

const tdStyle = (center, stripe) => ({
  padding: '8px 8px',
  borderBottom: '1px solid var(--border)',
  textAlign: center ? 'center' : 'left',
  fontSize: '0.8125rem',
  background: stripe ? 'rgba(0,0,0,0.02)' : 'transparent',
})

export function StationsPage() {
  const { profile } = useAuth()
  const [refStationId, setRefStationId] = useState('')
  const [activeDistrict, setActiveDistrict] = useState(DISTRICTS[0])
  const [initialized, setInitialized] = useState(false)
  const { distances, loading, error } = useStationDistances(refStationId || null)

  // Default to user's home station once profile loads
  useEffect(() => {
    if (profile?.station_id && !initialized) {
      setRefStationId(profile.station_id)
      setInitialized(true)
    }
  }, [profile, initialized])

  const tableStations = getStationsForDistrict(activeDistrict)

  return (
    <div className="page">

      {/* Reference station selector */}
      <div className="card">
        <div className="card-header"><h3>Reference station</h3></div>
        <div className="grid-2">
          <DistrictStationSelect
            label="Station"
            stationId={refStationId ? Number(refStationId) : ''}
            onChange={setRefStationId}
          />
        </div>
        {loading && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginTop: 8 }}>
            Calculating distances…
          </p>
        )}
        {error && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: 8 }}>
            Could not load distances: {error}
          </p>
        )}
      </div>

      {/* District tabs */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: 6,
        padding: '0 16px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {DISTRICTS.map(d => (
          <button
            key={d}
            onClick={() => setActiveDistrict(d)}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              border: '1.5px solid',
              fontSize: '0.8rem',
              fontWeight: activeDistrict === d ? 600 : 400,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              background: activeDistrict === d ? 'var(--accent)' : 'var(--surface)',
              borderColor: activeDistrict === d ? 'var(--accent)' : 'var(--border)',
              color: activeDistrict === d ? '#fff' : 'var(--text-1)',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Distance table */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'center', width: 40 }}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Station</th>
              <th style={thStyle}>One-way<br />(km)</th>
              <th style={thStyle}>One-way<br />(time)</th>
              <th style={thStyle}>Return<br />(km)</th>
              <th style={thStyle}>Return<br />(time)</th>
            </tr>
          </thead>
          <tbody>
            {tableStations.map((station, i) => {
              const d = distances[station.id]
              const oneKm = d != null ? Math.ceil(d.distance_m / 1000) : null
              const oneSec = d != null ? d.duration_s : null
              const stripe = i % 2 !== 0

              return (
                <tr key={station.id}>
                  <td style={tdStyle(true, stripe)}>{station.id}</td>
                  <td style={{ ...tdStyle(false, stripe), fontWeight: 500 }}>{station.name}</td>
                  <td style={tdStyle(true, stripe)}>
                    {oneKm != null ? oneKm : loading ? '…' : '—'}
                  </td>
                  <td style={tdStyle(true, stripe)}>
                    {oneSec != null ? formatDuration(oneSec) : loading ? '…' : '—'}
                  </td>
                  <td style={tdStyle(true, stripe)}>
                    {oneKm != null ? oneKm * 2 : loading ? '…' : '—'}
                  </td>
                  <td style={tdStyle(true, stripe)}>
                    {oneSec != null ? formatDuration(oneSec * 2) : loading ? '…' : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
