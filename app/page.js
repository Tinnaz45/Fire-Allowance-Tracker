'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function fetchAllClaims(userId) {
  const tables = ['recalls', 'retain', 'standby', 'spoilt']

  console.log('[Claims] Fetching for user:', userId)

  const results = await Promise.all(
    tables.map((table) =>
      supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
    )
  )

  const combined = []
  for (let i = 0; i < tables.length; i++) {
    const { data, error } = results[i]
    if (error) {
      console.error(`[Claims] Supabase error on table "${tables[i]}":`, error)
      throw new Error(`Failed to load ${tables[i]} claims.`)
    }
    if (data) {
      data.forEach((row) => {
        combined.push({ ...row, claimType: tables[i], type: tables[i] })
      })
    }
  }

  combined.sort((a, b) => new Date(b.date) - new Date(a.date))

  console.log('[Claims] Total rows loaded:', combined.length)
  return combined
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const lower = (status || '').toLowerCase()
  const styles = {
    paid: {
      background: 'rgba(34,197,94,0.15)',
      border: '1px solid rgba(34,197,94,0.4)',
      color: '#4ade80',
    },
    pending: {
      background: 'rgba(234,179,8,0.15)',
      border: '1px solid rgba(234,179,8,0.4)',
      color: '#facc15',
    },
    disputed: {
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.4)',
      color: '#f87171',
    },
  }
  const style = styles[lower] || {
    background: 'rgba(107,114,128,0.15)',
    border: '1px solid rgba(107,114,128,0.4)',
    color: '#9ca3af',
  }

  return (
    <span
      style={{
        ...style,
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: '0.03em',
      }}
    >
      {status || '—'}
    </span>
  )
}

// ─── Claim Type Labels ───────────────────────────────────────────────────────

const CLAIM_TYPE_LABELS = {
  recalls: 'Recall',
  retain: 'Retain',
  standby: 'Standby',
  spoilt: 'Spoilt / Meal',
}

const CLAIM_TYPES = ['recalls', 'retain', 'standby', 'spoilt']

// ─── New Claim Modal ─────────────────────────────────────────────────────────

function NewClaimModal({ session, onClose, onSuccess }) {
  const [claimType, setClaimType] = useState('recalls')
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!date) {
      setError('Please select a date.')
      return
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid amount.')
      return
    }

    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from(claimType).insert({
        user_id: session.user.id,
        date,
        total_amount: Number(amount),
        status: 'Pending',
      })

      if (insertError) {
        console.error('[NewClaim] Insert error:', insertError)
        setError(insertError.message || 'Failed to create claim. Please try again.')
        return
      }

      onSuccess()
    } catch (err) {
      console.error('[NewClaim] Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    background: '#111',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#e5e7eb',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  }

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      {/* Modal panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          padding: '28px 24px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f9fafb' }}>
            New Claim
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '1.4rem',
              lineHeight: 1,
              padding: '0 4px',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Type */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Type</label>
            <select
              value={claimType}
              onChange={(e) => setClaimType(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {CLAIM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CLAIM_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>

          {/* Amount */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Amount ($)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: '16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '10px',
                background: 'transparent',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#9ca3af',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '10px',
                background: submitting ? '#7f1d1d' : '#dc2626',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'background 0.15s',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Claims Table ───────────────────────────────────────────────────────────

function ClaimsTable({ claims }) {
  if (claims.length === 0) {
    return (
      <p style={{ color: '#9ca3af', marginTop: '24px', fontSize: '0.95rem' }}>
        No claims found
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto', marginTop: '24px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.9rem',
          color: '#e5e7eb',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid #2a2a2a',
              color: '#9ca3af',
              textAlign: 'left',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <th style={{ padding: '10px 14px' }}>Date</th>
            <th style={{ padding: '10px 14px' }}>Type</th>
            <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
            <th style={{ padding: '10px 14px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => (
            <tr
              key={`${claim.claimType}-${claim.id}`}
              style={{ borderBottom: '1px solid #1f1f1f' }}
            >
              <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                {claim.date
                  ? new Date(claim.date + 'T00:00:00').toLocaleDateString(
                      'en-AU',
                      { day: '2-digit', month: 'short', year: 'numeric' }
                    )
                  : '—'}
              </td>
              <td style={{ padding: '12px 14px', color: '#9ca3af' }}>
                <div>{CLAIM_TYPE_LABELS[claim.claimType] || claim.claimType}</div>
                <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>{claim.type}</div>
              </td>
              <td
                style={{
                  padding: '12px 14px',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {(() => {
                  const amount =
                    claim.total_amount ??
                    claim.amount ??
                    claim.value ??
                    null
                  return amount != null
                    ? `$${Number(amount).toFixed(2)}`
                    : '—'
                })()}
              </td>
              <td style={{ padding: '12px 14px' }}>
                <StatusBadge status={claim.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────

export default function HomePage() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionResolved, setSessionResolved] = useState(false)

  const [claims, setClaims] = useState([])
  const [claimsLoading, setClaimsLoading] = useState(false)
  const [claimsError, setClaimsError] = useState(null)

  const [showNewClaimModal, setShowNewClaimModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      console.log('SESSION CHECK:', data)
      setSession(data.session)
      setLoading(false)
      setSessionResolved(true)
    }
    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('AUTH STATE CHANGE:', _event, session)
        setSession(session)
        setSessionResolved(true)
      }
    )
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // ── Fetch Claims ──────────────────────────────────────────────────────────

  const loadClaims = async (userId) => {
    setClaimsLoading(true)
    setClaimsError(null)
    try {
      const data = await fetchAllClaims(userId)
      setClaims(data)
    } catch (err) {
      console.error('[Claims] Fetch failed:', err)
      setClaimsError('Unable to load your claims. Please try refreshing the page.')
    } finally {
      setClaimsLoading(false)
    }
  }

  useEffect(() => {
    if (!sessionResolved) return
    if (!session) return

    let cancelled = false

    const run = async () => {
      setClaimsLoading(true)
      setClaimsError(null)
      try {
        const data = await fetchAllClaims(session.user.id)
        if (!cancelled) setClaims(data)
      } catch (err) {
        console.error('[Claims] Fetch failed:', err)
        if (!cancelled) {
          setClaimsError('Unable to load your claims. Please try refreshing the page.')
        }
      } finally {
        if (!cancelled) setClaimsLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [sessionResolved, session])

  // ── Handle successful claim creation ──────────────────────────────────────

  const handleClaimSuccess = async () => {
    setShowNewClaimModal(false)
    setSuccessMessage('Claim submitted successfully!')
    setTimeout(() => setSuccessMessage(null), 4000)
    await loadClaims(session.user.id)
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '0.95rem',
        }}
      >
        Loading…
      </div>
    )
  }

  if (sessionResolved && !session) {
    window.location.assign('/login')
    return null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        color: '#e5e7eb',
        padding: '32px 20px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                background: '#dc2626',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="22"
                height="22"
                fill="none"
                stroke="white"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                />
              </svg>
            </div>
            <div>
              <h1
                style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f9fafb' }}
              >
                Fire Allowance Tracker
              </h1>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                {session.user.email}
              </p>
            </div>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.assign('/login')
            }}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div
            style={{
              marginBottom: '20px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#4ade80',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {/* Claims Section */}
        <div
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          {/* Section header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#f9fafb',
                }}
              >
                My Claims
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                Recalls · Retain · Standby · Spoilt meals
              </p>
            </div>

            {/* New Claim Button */}
            <button
              onClick={() => setShowNewClaimModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                background: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span>
              New Claim
            </button>
          </div>

          {/* Loading state */}
          {claimsLoading && (
            <p
              style={{
                color: '#9ca3af',
                marginTop: '24px',
                fontSize: '0.9rem',
              }}
            >
              Loading claims…
            </p>
          )}

          {/* Error state */}
          {!claimsLoading && claimsError && (
            <div
              style={{
                marginTop: '20px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '0.875rem',
              }}
            >
              {claimsError}
            </div>
          )}

          {/* Claims table / empty state */}
          {!claimsLoading && !claimsError && (
            <ClaimsTable claims={claims} />
          )}
        </div>
      </div>

      {/* New Claim Modal */}
      {showNewClaimModal && (
        <NewClaimModal
          session={session}
          onClose={() => setShowNewClaimModal(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  )
}
