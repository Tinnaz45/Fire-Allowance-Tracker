'use client'

// ─── ClaimList ─────────────────────────────────────────────────────────────────
// Renders filtered/sorted claims from ClaimsContext.
// - Desktop: table layout
// - Mobile: card layout (no horizontal overflow)
// - Dates displayed as DD/MM/YY
// - Overdue claims (pending > 4 weeks): red outline + yellow background
// - Adjusted amounts shown with "Adj" label
// ─────────────────────────────────────────────────────────────────────────────

import { useClaims } from '@/lib/claims/ClaimsContext'
import { CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes'
import {
  resolveEffectiveAmount,
  isAmountAdjusted,
  isClaimOverdue,
  formatDateDDMMYY,
} from '@/lib/calculations/engine'

// ─── Status Badge ─────────────────────────────────────────────────────────────

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
    <span style={{
      ...style,
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      textTransform: 'capitalize',
      letterSpacing: '0.03em',
    }}>
      {status || '—'}
    </span>
  )
}

// ─── Mobile Card ─────────────────────────────────────────────────────────────

function MobileClaimCard({ claim, onEdit }) {
  const overdue = isClaimOverdue(claim)
  const adjusted = isAmountAdjusted(claim)
  const amt = resolveEffectiveAmount(claim)

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '10px',
      border: overdue ? '1px solid rgba(239,68,68,0.5)' : '1px solid #222',
      background: overdue ? 'rgba(251,191,36,0.04)' : '#111',
      marginBottom: '8px',
      position: 'relative',
    }}>
      {overdue && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.4)',
          color: '#f87171',
          fontSize: '0.64rem', fontWeight: 700,
          borderRadius: '4px', padding: '2px 6px',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          Overdue
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '2px' }}>
            {formatDateDDMMYY(claim.date)}
            {' · '}
            {CLAIM_TYPE_LABELS[claim.claimType] || claim.claimType}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f9fafb' }}>
            ${amt.toFixed(2)}
            {adjusted && (
              <span style={{ fontSize: '0.68rem', color: '#fbbf24', marginLeft: '6px', fontWeight: 600 }}>Adj</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <StatusBadge status={claim.status} />
          {onEdit && (
            <button
              onClick={() => onEdit(claim)}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '0.74rem',
                fontWeight: 600,
              }}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ClaimList ────────────────────────────────────────────────────────────────

export default function ClaimList({ activeTab = 'all', filterType = 'all', sortBy = 'date-desc', onEdit }) {
  const { claims, loading, error } = useClaims()

  // ── Filter + sort ─────────────────────────────────────────────────────────

  const displayed = (() => {
    let list = [...claims]

    if (activeTab === 'pending') {
      list = list.filter((c) => (c.status || '').toLowerCase() === 'pending')
    } else if (activeTab === 'paid') {
      list = list.filter((c) => (c.status || '').toLowerCase() === 'paid')
    }

    if (filterType !== 'all') {
      list = list.filter((c) => c.claimType === filterType)
    }

    if (sortBy === 'date-desc') {
      list.sort((a, b) => new Date(b.date) - new Date(a.date))
    } else if (sortBy === 'date-asc') {
      list.sort((a, b) => new Date(a.date) - new Date(b.date))
    } else if (sortBy === 'type') {
      list.sort((a, b) => (a.claimType || '').localeCompare(b.claimType || ''))
    }

    return list
  })()

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return <p style={{ color: '#9ca3af', marginTop: '24px', fontSize: '0.9rem' }}>Loading claims…</p>
  }

  if (error) {
    return (
      <div style={{
        marginTop: '20px',
        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#f87171', borderRadius: '10px', padding: '12px 16px', fontSize: '0.875rem',
      }}>
        {error}
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <p style={{ color: '#9ca3af', marginTop: '24px', fontSize: '0.95rem' }}>
        No claims yet. Use <strong style={{ color: '#e5e7eb' }}>+ New Claim</strong> to add your first one.
      </p>
    )
  }

  if (displayed.length === 0) {
    return (
      <p style={{ color: '#9ca3af', marginTop: '24px', fontSize: '0.95rem' }}>
        No claims match the current filters.
      </p>
    )
  }

  // ── Totals ────────────────────────────────────────────────────────────────

  const total = displayed.reduce((sum, c) => sum + resolveEffectiveAmount(c), 0)
  const pendingTotal = displayed
    .filter((c) => (c.status || '').toLowerCase() === 'pending')
    .reduce((sum, c) => sum + resolveEffectiveAmount(c), 0)
  const overdueCount = displayed.filter(isClaimOverdue).length

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '12px',
          fontSize: '0.8rem',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{ fontSize: '1rem' }}>🚩</span>
          {overdueCount} pending claim{overdueCount !== 1 ? 's' : ''} overdue ({'>'}4 weeks)
        </div>
      )}

      {/* Mobile cards (max-width: 560px) */}
      <div className="mobile-cards">
        {displayed.map((claim) => (
          <MobileClaimCard
            key={`${claim.claimType}-${claim.id}`}
            claim={claim}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="desktop-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#e5e7eb' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid #2a2a2a',
              color: '#9ca3af', textAlign: 'left',
              fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <th style={{ padding: '10px 14px' }}>Date</th>
              <th style={{ padding: '10px 14px' }}>Type</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '10px 14px' }}>Status</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((claim) => {
              const amt     = resolveEffectiveAmount(claim)
              const overdue = isClaimOverdue(claim)
              const adjusted = isAmountAdjusted(claim)
              return (
                <tr key={`${claim.claimType}-${claim.id}`} style={{
                  borderBottom: '1px solid #1f1f1f',
                  outline: overdue ? '1px solid rgba(239,68,68,0.4)' : 'none',
                  background: overdue ? 'rgba(251,191,36,0.025)' : 'transparent',
                }}>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {formatDateDDMMYY(claim.date)}
                    {overdue && (
                      <span style={{ marginLeft: '6px', color: '#f87171', fontSize: '0.7rem', fontWeight: 700 }}>🚩</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#9ca3af' }}>
                    {CLAIM_TYPE_LABELS[claim.claimType] || claim.claimType}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    ${amt.toFixed(2)}
                    {adjusted && (
                      <span style={{ fontSize: '0.68rem', color: '#fbbf24', marginLeft: '4px' }}>Adj</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <StatusBadge status={claim.status} />
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(claim)}
                        style={{
                          padding: '4px 12px', background: 'transparent',
                          border: '1px solid #374151', borderRadius: '6px',
                          color: '#9ca3af', cursor: 'pointer',
                          fontSize: '0.78rem', fontWeight: 600,
                          letterSpacing: '0.02em',
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #2a2a2a' }}>
              <td colSpan={2} style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {displayed.length} claim{displayed.length !== 1 ? 's' : ''}
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#f9fafb' }}>
                ${total.toFixed(2)}
              </td>
              <td colSpan={2} style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#6b7280' }}>
                {pendingTotal > 0 && (
                  <span style={{ color: '#facc15' }}>${pendingTotal.toFixed(2)} pending</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
