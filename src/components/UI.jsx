import { useState } from 'react'
import { stationName } from '../lib/supabase'
import { format } from 'date-fns'

// ── FORMAT HELPERS ────────────────────────────────────────────
export const fmtDate = (d) => {
  if (!d) return '—'
  try { return format(new Date(d + 'T00:00:00'), 'd MMM yy') }
  catch { return d }
}
export const fmtAUD = (n) => n != null ? `$${Number(n).toFixed(2)}` : '—'

// ── STATUS BADGE ──────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    Paid: 'badge-success',
    Pending: 'badge-warning',
    Disputed: 'badge-danger',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

// ── TYPE BADGE ────────────────────────────────────────────────
export function TypeBadge({ type }) {
  const icons = { Recall: '🔁', Retain: '⏱', Standby: '📍', Spoilt: '🍽' }
  return (
    <span className="badge badge-gray">
      {icons[type]} {type}
    </span>
  )
}

// ── CLAIM ROW ─────────────────────────────────────────────────
export function ClaimRow({ claim, type, onClick }) {
  const icons = { Recall: '🔁', Retain: '⏱', Standby: '📍', Spoilt: '🍽' }
  const colors = {
    Recall: 'rgba(239,68,68,0.15)',
    Retain: 'rgba(245,158,11,0.15)',
    Standby: 'rgba(56,189,248,0.15)',
    Spoilt: 'rgba(34,197,94,0.15)',
  }

  const title = type === 'Recall'
    ? `${stationName(claim.rostered_stn_id) || '—'} → ${stationName(claim.recall_stn_id) || '—'}`
    : type === 'Retain'
    ? `${stationName(claim.station_id) || '—'}`
    : type === 'Standby'
    ? `${claim.standby_type}: ${stationName(claim.standby_stn_id) || '—'}`
    : `${claim.meal_type || 'Spoilt'}: ${stationName(claim.station_id) || '—'}`

  const sub = `${fmtDate(claim.date)} · ${claim.shift || ''} shift`
  const amount = type === 'Spoilt' ? claim.meal_amount : claim.total_amount

  return (
    <div className="claim-row" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="claim-icon" style={{ background: colors[type] }}>
        {icons[type]}
      </div>
      <div className="claim-meta">
        <div className="claim-title">{title}</div>
        <div className="claim-sub">{sub}</div>
      </div>
      <div className="claim-right">
        <div className="claim-amount">{fmtAUD(amount)}</div>
        <div className="claim-status"><StatusBadge status={claim.status} /></div>
      </div>
    </div>
  )
}

// ── BOTTOM SHEET ──────────────────────────────────────────────
export function BottomSheet({ title, onClose, children }) {
  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Done</button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

// ── MARK PAID PROMPT ──────────────────────────────────────────
export function MarkPaidPrompt({ onConfirm, onCancel }) {
  const [payNum, setPayNum] = useState('')
  return (
    <div className="pay-prompt">
      <div className="pay-prompt-card">
        <h3>Mark as paid</h3>
        <p>Enter the pay period this appeared on your payslip.</p>
        <div className="field">
          <label>Pay period number</label>
          <input
            type="text"
            placeholder="e.g. 14.2025"
            value={payNum}
            onChange={e => setPayNum(e.target.value)}
            autoFocus
          />
        </div>
        <div className="pay-prompt-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(payNum)}>Confirm paid</button>
        </div>
      </div>
    </div>
  )
}

// ── LOADING SCREEN ────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: '0.875rem' }}>Loading…</p>
      </div>
    </div>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────
export function EmptyState({ icon, message, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <p>{message}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

// ── CLAIM DETAIL SHEET ────────────────────────────────────────
export function ClaimDetailSheet({ claim, type, table, onClose, onMarkPaid, onDelete }) {
  const [showPayPrompt, setShowPayPrompt] = useState(false)

  const rows = getDetailRows(claim, type)

  return (
    <>
      <BottomSheet title={`${type} claim`} onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <StatusBadge status={claim.status} />
          {claim.pay_number && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              Pay #{claim.pay_number}
            </span>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-3)' }}>{label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {claim.status === 'Pending' && (
            <button className="btn btn-primary btn-full" onClick={() => setShowPayPrompt(true)}>
              Mark as paid
            </button>
          )}
          <button
            className="btn btn-full"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
            onClick={() => { onDelete(table, claim.id); onClose(); }}
          >
            Delete
          </button>
        </div>
      </BottomSheet>

      {showPayPrompt && (
        <MarkPaidPrompt
          onConfirm={(pn) => { onMarkPaid(table, claim.id, pn); setShowPayPrompt(false); onClose(); }}
          onCancel={() => setShowPayPrompt(false)}
        />
      )}
    </>
  )
}

function getDetailRows(claim, type) {
  const base = [
    ['Date', fmtDate(claim.date)],
    ['Shift', claim.shift],
    ['Platoon', claim.platoon],
  ]

  if (type === 'Recall') return [
    ...base,
    ['Rostered station', stationName(claim.rostered_stn_id)],
    ['Recall station', stationName(claim.recall_stn_id)],
    ['Arrival time', claim.arrived],
    ['Distance (km)', claim.total_km != null ? `${claim.total_km} km` : null],
    ['Travel allowance', fmtAUD(claim.travel_amount)],
    ['Mealie', fmtAUD(claim.mealie_amount)],
    ['Total', fmtAUD(claim.total_amount)],
    ['Notes', claim.notes],
  ]

  if (type === 'Retain') return [
    ...base,
    ['Station', stationName(claim.station_id)],
    ['Booked off', claim.booked_off_time],
    ['RMSS / call #', claim.rmss_number],
    ['Firecall', claim.is_firecall ? 'Yes' : 'No'],
    ['Retain pay', fmtAUD(claim.retain_amount)],
    ['Overnight cash', claim.overnight_cash > 0 ? fmtAUD(claim.overnight_cash) : null],
    ['Total', fmtAUD(claim.total_amount)],
  ]

  if (type === 'Standby') return [
    ['Date', fmtDate(claim.date)],
    ['Type', claim.standby_type],
    ['Shift', claim.shift],
    ['Rostered station', stationName(claim.rostered_stn_id)],
    ['Standby station', stationName(claim.standby_stn_id)],
    ['Arrival time', claim.arrived],
    ['Distance (km)', claim.dist_km != null ? `${claim.dist_km} km` : null],
    ['Travel allowance', fmtAUD(claim.travel_amount)],
    ['Night mealie', claim.night_mealie > 0 ? fmtAUD(claim.night_mealie) : null],
    ['Total', fmtAUD(claim.total_amount)],
    ['Notes', claim.notes],
    ['Free from home', claim.free_from_home ? 'Yes' : 'No'],
  ]

  if (type === 'Spoilt') return [
    ['Date', fmtDate(claim.date)],
    ['Type', claim.meal_type],
    ['Shift', claim.shift],
    ['Platoon', claim.platoon],
    ['Station', stationName(claim.station_id)],
    ['Call time', claim.call_time],
    ['Incident #', claim.call_number],
    ['Claim station', stationName(claim.claim_stn_id)],
    ['Claim date', fmtDate(claim.claim_date)],
    ['Amount', fmtAUD(claim.meal_amount)],
  ]

  return base
}
