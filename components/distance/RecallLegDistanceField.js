'use client'

// ─── RecallLegDistanceField ──────────────────────────────────────────────────
// Auto-calculates the "Rostered to Recall Station (one way, km)" distance.
//
// Mirrors the UX of StationDistanceField (used for Home → Rostered Station)
// but for the second leg of the recall route. Computes a driving distance via
// the existing Nominatim + OSRM stack, with in-memory session caching to
// dedupe repeat lookups and prevent duplicate station parsing issues.
//
// Behaviour:
//   1. Same station for both rostered + recall → auto-set 0 km (operational
//      rule: "Leave 0 if recalled to your own rostered station").
//   2. Both stations resolvable → trigger estimate, show Accept / Edit / Retry.
//   3. Recall input is empty or unparseable → fall back to manual numeric entry
//      so the existing claim workflow is never blocked.
//   4. API failure → show error, keep manual entry available.
//
// This component is purely additive — existing claim calculation behaviour is
// preserved when the auto-flow falls through to manual input. The value it
// surfaces to its parent is always written into form.distStnKm just like the
// previous manual input did, so calcRecallClaim continues to drive totals.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { getStationToStationDistance } from '@/lib/distance/stationDistance'

// ── Constants ───────────────────────────────────────────────────────────────

const DISCLAIMER_TEXT =
  'Distance estimates are automatically calculated using mapping services and ' +
  'may not reflect actual operational travel routes. You are responsible for ' +
  'verifying the accuracy of all entered distances before submitting claims.'

// ── Styles (kept inline to match the rest of ClaimForm) ─────────────────────

const S = {
  label: {
    display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
  },
  input: {
    width: '100%', padding: '10px 12px', background: '#111',
    border: '1px solid #333', borderRadius: '8px', color: '#e5e7eb',
    fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
  },
  help:  { marginTop: '4px', fontSize: '0.74rem', color: '#6b7280' },
  field: { marginBottom: '16px' },

  estimateBox: {
    background: 'rgba(59,130,246,0.07)',
    border: '1px solid rgba(59,130,246,0.25)',
    borderRadius: '10px', padding: '14px 16px', marginBottom: '10px', fontSize: '0.85rem',
  },
  estimateLabel: {
    fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd',
    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
  },
  estimateKm: { fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb', marginBottom: '10px' },

  disclaimer: {
    background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
    borderRadius: '8px', padding: '10px 12px', fontSize: '0.74rem',
    color: '#d97706', lineHeight: 1.5, marginBottom: '12px',
  },

  errorBox: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem',
    color: '#f87171', marginBottom: '10px',
  },

  confirmedBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 10px', background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px',
    fontSize: '0.72rem', fontWeight: 700, color: '#4ade80', marginLeft: '8px',
  },

  btnRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' },
  btnPrimary: {
    padding: '8px 16px', background: '#dc2626', border: 'none',
    borderRadius: '6px', color: 'white', fontSize: '0.82rem',
    fontWeight: 600, cursor: 'pointer',
  },
  btnSecondary: {
    padding: '8px 16px', background: 'transparent', border: '1px solid #444',
    borderRadius: '6px', color: '#9ca3af', fontSize: '0.82rem',
    fontWeight: 600, cursor: 'pointer',
  },
  btnLink: {
    padding: '6px 0', background: 'none', border: 'none', color: '#6b7280',
    fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline',
  },
}

// ── Component ───────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string}  props.userId
 * @param {object}  props.originStation   Resolved rostered station { id, label, name }
 * @param {object|null} props.destStation Resolved recall station { id, label, name } or null
 * @param {string}  props.value           Current form field value (km, controlled)
 * @param {function} props.onChange       (km: string) => void
 * @param {string}  [props.label]
 */
export default function RecallLegDistanceField({
  userId,
  originStation,
  destStation,
  value,
  onChange,
  label = 'Rostered to Recall Station (one way, km)',
}) {
  // ── State ────────────────────────────────────────────────────────────────
  // phases: idle | loading | show_estimate | confirmed | editing | error | manual
  const [phase, setPhase]           = useState('idle')
  const [estimatedKm, setEstimatedKm] = useState(null)
  const [editValue, setEditValue]   = useState('')
  const [errorMsg, setErrorMsg]     = useState(null)

  // Tracks the most recent pair the form intends to estimate. Async callers
  // check this on resolution to bail out if a newer pair has superseded them
  // — this prevents stale results from overwriting fresher state.
  const latestKey = useRef(null)
  // Remember the last pair we *successfully* applied to value, so we don't
  // overwrite a user-entered/edited value when fields re-render.
  const appliedPair = useRef(null) // string key

  // Reset whenever either station changes — including when one becomes null.
  useEffect(() => {
    const originId = originStation?.id ?? null
    const destId   = destStation?.id   ?? null

    // No origin → fall back to manual entry, never block the claim
    if (originId == null) {
      setPhase('manual')
      return
    }

    // No recognisable recall station → manual entry
    if (destId == null) {
      setPhase('manual')
      return
    }

    const key = `${originId}:${destId}`
    latestKey.current = key

    // Same station → operational rule says distance is 0
    if (originId === destId) {
      onChange('0')
      appliedPair.current = key
      setEstimatedKm(0)
      setPhase('confirmed')
      return
    }

    // Different stations — trigger estimate
    triggerEstimate(originStation, destStation, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originStation?.id, destStation?.id])

  async function triggerEstimate(origin, dest, forceRecalc) {
    if (!origin || !dest) return
    const key = `${origin.id}:${dest.id}`
    latestKey.current = key

    setPhase('loading')
    setErrorMsg(null)

    try {
      const { distanceKm } = await getStationToStationDistance({
        userId,
        originStationId: origin.id,
        originName:      origin.name,
        originLabel:     origin.label,
        destStationId:   dest.id,
        destName:        dest.name,
        destLabel:       dest.label,
        forceRecalc,
      })

      // The user may have switched the recall station before the API returned
      // — only apply if this estimate is still relevant.
      if (latestKey.current !== key) return

      setEstimatedKm(distanceKm)
      // Surface the estimate immediately. The user can still edit/override
      // via the inline input, and the form value flows into the recall total
      // through the standard distStnKm onChange.
      onChange(String(distanceKm))
      appliedPair.current = key
      setPhase('show_estimate')
    } catch (err) {
      if (latestKey.current !== key) return
      setErrorMsg(err?.message || 'Could not calculate distance. Please enter manually.')
      setPhase('error')
    }
  }

  // ── Confirm / Edit handlers ─────────────────────────────────────────────

  function handleAccept() {
    setPhase('confirmed')
  }

  function handleStartEdit() {
    setEditValue(value || (estimatedKm != null ? String(estimatedKm) : ''))
    setPhase('editing')
  }

  function handleSaveEdit() {
    const km = parseFloat(editValue)
    if (editValue === '' || isNaN(km) || km < 0) return // invalid — stay in editing
    onChange(String(km))
    setPhase('confirmed')
  }

  function handleCancelEdit() {
    setPhase(estimatedKm != null ? 'show_estimate' : 'manual')
  }

  function handleRetry() {
    if (originStation && destStation) triggerEstimate(originStation, destStation, true)
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={S.field}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
        <label style={{ ...S.label, marginBottom: 0 }}>{label}</label>
        {phase === 'confirmed' && (
          <span style={S.confirmedBadge}>✓ Confirmed</span>
        )}
      </div>

      {/* Loading */}
      {phase === 'loading' && (
        <div style={{ ...S.estimateBox, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '16px', height: '16px', border: '2px solid #3b82f6',
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
          <span style={{ color: '#93c5fd', fontSize: '0.85rem' }}>
            Calculating driving distance…
          </span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Estimate ready */}
      {phase === 'show_estimate' && estimatedKm != null && (
        <div style={S.estimateBox}>
          <div style={S.estimateLabel}>Auto-calculated estimate</div>
          <div style={S.estimateKm}>{estimatedKm} km</div>
          <div style={S.disclaimer}>{DISCLAIMER_TEXT}</div>
          <div style={S.btnRow}>
            <button type="button" onClick={handleAccept} style={S.btnPrimary}>
              Accept Estimate
            </button>
            <button type="button" onClick={handleStartEdit} style={S.btnSecondary}>
              Edit Distance
            </button>
            <button type="button" onClick={handleRetry} style={S.btnSecondary}>
              Recalculate
            </button>
          </div>
        </div>
      )}

      {/* Editing override */}
      {phase === 'editing' && (
        <>
          <input
            type="number" min="0" step="0.1"
            placeholder="Enter distance (km)"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            style={S.input}
            autoFocus
          />
          <div style={S.disclaimer}>{DISCLAIMER_TEXT}</div>
          <div style={S.btnRow}>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={editValue === '' || parseFloat(editValue) < 0}
              style={{
                ...S.btnPrimary,
                background: (editValue === '' || parseFloat(editValue) < 0) ? '#7f1d1d' : '#dc2626',
                cursor:     (editValue === '' || parseFloat(editValue) < 0) ? 'not-allowed' : 'pointer',
              }}
            >
              Confirm Distance
            </button>
            <button type="button" onClick={handleCancelEdit} style={S.btnSecondary}>
              Cancel
            </button>
          </div>
          <p style={S.help}>One-way distance (rostered → recall). Return leg is automatic (×2).</p>
        </>
      )}

      {/* Confirmed — show as inline input with edit/recalc links */}
      {phase === 'confirmed' && (
        <>
          <input
            type="number" min="0" step="0.1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...S.input, borderColor: 'rgba(34,197,94,0.4)' }}
          />
          <p style={S.help}>
            Confirmed leg distance.{' '}
            <button type="button" onClick={handleStartEdit} style={S.btnLink}>Edit</button>
            {originStation?.id != null && destStation?.id != null && originStation.id !== destStation.id && (
              <>
                {' · '}
                <button type="button" onClick={handleRetry} style={S.btnLink}>Recalculate</button>
              </>
            )}
          </p>
        </>
      )}

      {/* Error — keep manual input usable */}
      {phase === 'error' && (
        <>
          <div style={S.errorBox}>{errorMsg}</div>
          <input
            type="number" min="0" step="0.1"
            placeholder="Enter distance manually (km)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={S.input}
          />
          <div style={S.btnRow}>
            <button
              type="button"
              onClick={handleRetry}
              style={{ ...S.btnSecondary, fontSize: '0.78rem', padding: '6px 12px' }}
            >
              Retry Auto-Calculate
            </button>
          </div>
          <p style={S.help}>One-way distance (rostered → recall). Return leg is automatic (×2).</p>
        </>
      )}

      {/* Manual fallback — recall station unknown / unparseable */}
      {phase === 'manual' && (
        <>
          <input
            type="number" min="0" step="0.1" placeholder="0.0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={S.input}
          />
          <p style={S.help}>
            {originStation?.id == null
              ? 'Set a rostered station in your profile to enable auto-calculation for this leg.'
              : !destStation
              ? 'Enter a known recall station (e.g. "FS44 - Sunshine") to auto-calculate this leg.'
              : 'Leave 0 if recalled to your own rostered station.'}
          </p>
        </>
      )}
    </div>
  )
}
