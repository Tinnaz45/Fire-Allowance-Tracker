'use client'

// ─── GroupedClaimList ──────────────────────────────────────────────────────────
// Renders the "Pending Payslip" tab.
//
// Layout per group:
//   ┌─ Recall #16 (12/02/2026)          [Pending] [🚩 Overdue]
//   │  ├─ Large Meal           $20.55   [Paid]    [payslip Pay Nbr: 20.2026]
//   │  ├─ Excess Travel        $18.20   [Pending]
//   │  └─ Callback-Ops         $36.80   [Pending]
//
// Parent status auto-recomputes when a child's status is toggled.
// Overdue: parent pending for >4 weeks → red outline + flag + light yellow bg.
// Ungrouped claims (no claim_group_id) render as flat cards at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useClaims } from '@/lib/claims/ClaimsContext'
import { CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes'
import {
  resolveEffectiveAmount,
  isClaimOverdue,
  formatDateDDMMYY,
} from '@/lib/calculations/engine'

// ─── Child label resolver ─────────────────────────────────────────────────────
// Maps autoChild key from calculation_inputs to display label.

function resolveChildLabel(claim) {
  const ai = claim.calculation_inputs || {}
  if (ai.autoChild === 'callback_ops')         return 'Callback-Ops'
  if (ai.autoChild === 'excess_travel')         return 'Excess Travel'
  if (ai.autoChild === 'petty_cash_meal')       return 'Petty cash meal'
  if (ai.autoChild === 'petty_cash_travel_night') return 'Petty cash travel (night)'
  if (ai.autoChild === 'maint_stn_nn')          return 'Maint stn N/N'
  if (ai.autoChild === 'overnight_cash')        return 'Overnight cash'
  if (ai.autoChild === 'standby_travel')        return 'Standby travel'
  // Fallback: use claim type label
  return CLAIM_TYPE_LABELS[claim.claimType] || claim.claimType
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const lower = (status || '').toLowerCase()
  const styles = {
    paid:     { background: 'rgba(34,197,94,0.15)',  border: '1px solid rgba(34,197,94,0.4)',  color: '#4ade80' },
    pending:  { background: 'rgba(234,179,8,0.15)',  border: '1px solid rgba(234,179,8,0.4)',  color: '#facc15' },
    disputed: { background: 'rgba(239,68,68,0.15)',  border: '1px solid rgba(239,68,68,0.4)',  color: '#f87171' },
  }
  const style = styles[lower] || { background: 'rgba(107,114,128,0.15)', border: '1px solid rgba(107,114,128,0.4)', color: '#9ca3af' }

  return (
    <span style={{
      ...style,
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.69rem',
      fontWeight: 700,
      textTransform: 'capitalize',
      letterSpacing: '0.03em',
      flexShrink: 0,
    }}>
      {status || '—'}
    </span>
  )
}

// ─── Child row ────────────────────────────────────────────────────────────────

function ChildClaimRow({ claim, session, activeFY, isLast }) {
  const { updateChildStatus } = useClaims()
  const [updating, setUpdating] = useState(false)

  const label  = resolveChildLabel(claim)
  const amt    = resolveEffectiveAmount(claim)
  const status = claim.status || 'Pending'
  const payNbr = claim.payslip_pay_nbr

  const cycleStatus = async () => {
    if (updating || !session) return
    const next = status === 'Pending' ? 'Paid' : status === 'Paid' ? 'Disputed' : 'Pending'
    setUpdating(true)
    try {
      await updateChildStatus({
        userId: session.user.id,
        claim,
        status: next,
        financialYearId: activeFY?.id || null,
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: isLast ? 'none' : '1px solid #222',
      gap: '8px',
    }}>
      {/* Left: tree glyph + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span style={{ color: '#374151', fontSize: '0.8rem', flexShrink: 0 }}>
          {isLast ? '└─' : '├─'}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', color: '#d1d5db', fontWeight: 500 }}>{label}</div>
          {payNbr && (
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '1px' }}>
              Pay Nbr: {payNbr}
            </div>
          )}
        </div>
      </div>

      {/* Right: amount + status (clickable to cycle) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f9fafb' }}>
          ${amt.toFixed(2)}
        </span>
        <button
          onClick={cycleStatus}
          disabled={updating}
          title="Click to cycle status: Pending → Paid → Disputed → Pending"
          style={{
            background: 'none', border: 'none', padding: 0, cursor: updating ? 'wait' : 'pointer',
            opacity: updating ? 0.5 : 1,
          }}
        >
          <StatusBadge status={status} />
        </button>
      </div>
    </div>
  )
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({ groupEntry, session, activeFY }) {
  const { group, children } = groupEntry
  const [collapsed, setCollapsed] = useState(false)

  const isOverdue = (() => {
    if ((group.parent_status || '').toLowerCase() !== 'pending') return false
    if (!group.overdue_at) return false
    return new Date() > new Date(group.overdue_at)
  })()

  const totalAmt = children.reduce((sum, c) => sum + resolveEffectiveAmount(c), 0)
  const paidAmt  = children
    .filter((c) => (c.status || '').toLowerCase() === 'paid')
    .reduce((sum, c) => sum + resolveEffectiveAmount(c), 0)
  const pendingCount = children.filter((c) => (c.status || '').toLowerCase() === 'pending').length

  return (
    <div style={{
      borderRadius: '10px',
      border: isOverdue ? '1.5px solid rgba(239,68,68,0.5)' : '1px solid #2a2a2a',
      background: isOverdue ? 'rgba(251,191,36,0.03)' : '#111',
      marginBottom: '12px',
      overflow: 'hidden',
    }}>
      {/* Group header */}
      <div
        onClick={() => setCollapsed((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid #222',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {/* Collapse chevron */}
          <span style={{ color: '#4b5563', fontSize: '0.7rem', flexShrink: 0 }}>
            {collapsed ? '▶' : '▼'}
          </span>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f9fafb', marginBottom: '2px' }}>
              {group.label}
            </div>
            <div style={{ fontSize: '0.73rem', color: '#6b7280' }}>
              {children.length} item{children.length !== 1 ? 's' : ''}
              {' · '}
              Paid: ${paidAmt.toFixed(2)} / ${totalAmt.toFixed(2)}
              {pendingCount > 0 && ` · ${pendingCount} pending`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isOverdue && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, color: '#f87171',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '4px', padding: '2px 6px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              🚩 Overdue
            </span>
          )}
          <StatusBadge status={group.parent_status} />
        </div>
      </div>

      {/* Children */}
      {!collapsed && children.length > 0 && (
        <div style={{ padding: '4px 16px 12px' }}>
          {children.map((child, i) => (
            <ChildClaimRow
              key={`${child.claimType}-${child.id}`}
              claim={child}
              session={session}
              activeFY={activeFY}
              isLast={i === children.length - 1}
            />
          ))}
        </div>
      )}

      {!collapsed && children.length === 0 && (
        <div style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#4b5563' }}>
          No child items yet.
        </div>
      )}
    </div>
  )
}

// ─── Ungrouped flat card ──────────────────────────────────────────────────────

function UngroupedCard({ claim, onEdit }) {
  const overdue  = isClaimOverdue(claim)
  const amt      = resolveEffectiveAmount(claim)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      borderRadius: '10px',
      border: overdue ? '1px solid rgba(239,68,68,0.5)' : '1px solid #2a2a2a',
      background: overdue ? 'rgba(251,191,36,0.03)' : '#111',
      marginBottom: '8px',
      gap: '8px',
    }}>
      <div>
        <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '2px' }}>
          {formatDateDDMMYY(claim.date)} · {CLAIM_TYPE_LABELS[claim.claimType] || claim.claimType}
          {overdue && <span style={{ marginLeft: '8px', color: '#f87171', fontWeight: 700 }}>🚩 Overdue</span>}
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f9fafb' }}>
          ${amt.toFixed(2)}
        </div>
        {claim.payslip_pay_nbr && (
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
            Pay Nbr: {claim.payslip_pay_nbr}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <StatusBadge status={claim.status} />
        {onEdit && (
          <button onClick={() => onEdit(claim)}
            style={{
              padding: '3px 10px', background: 'transparent',
              border: '1px solid #374151', borderRadius: '6px',
              color: '#9ca3af', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600,
            }}>
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

// ─── GroupedClaimList (Payslip tab) ───────────────────────────────────────────

export default function GroupedClaimList({ session, activeFY, onEdit }) {
  const { groupedView, loading, error, claimGroups } = useClaims()

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

  const { grouped, ungrouped } = groupedView || { grouped: [], ungrouped: [] }

  // Only show pending-status groups in the payslip tab (paid groups are archived)
  const pendingGroups = grouped.filter(
    (g) => (g.group.parent_status || '').toLowerCase() !== 'paid'
  )
  const paidGroups = grouped.filter(
    (g) => (g.group.parent_status || '').toLowerCase() === 'paid'
  )

  // Overdue count for banner
  const overdueCount = pendingGroups.filter((g) => {
    if (!g.group.overdue_at) return false
    return new Date() > new Date(g.group.overdue_at)
  }).length

  const hasContent = pendingGroups.length > 0 || ungrouped.length > 0

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px', padding: '8px 14px',
          marginBottom: '14px', fontSize: '0.8rem', color: '#f87171',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '1rem' }}>🚩</span>
          {overdueCount} claim group{overdueCount !== 1 ? 's' : ''} overdue ({'>'} 4 weeks)
        </div>
      )}

      {!hasContent && (
        <p style={{ color: '#9ca3af', marginTop: '24px', fontSize: '0.95rem' }}>
          No pending payslip claims. New claims will appear here grouped by parent.
        </p>
      )}

      {/* ── Pending groups ── */}
      {pendingGroups.length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Pending ({pendingGroups.length})
          </div>
          {pendingGroups.map((entry) => (
            <GroupCard
              key={entry.group.id}
              groupEntry={entry}
              session={session}
              activeFY={activeFY}
            />
          ))}
        </>
      )}

      {/* ── Ungrouped pending claims ── */}
      {ungrouped.filter((c) => (c.status || '').toLowerCase() === 'pending').length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', marginTop: pendingGroups.length > 0 ? '16px' : '0' }}>
            Ungrouped Pending
          </div>
          {ungrouped
            .filter((c) => (c.status || '').toLowerCase() === 'pending')
            .map((claim) => (
              <UngroupedCard
                key={`${claim.claimType}-${claim.id}`}
                claim={claim}
                onEdit={onEdit}
              />
            ))}
        </>
      )}

      {/* ── Paid groups (collapsed summary) ── */}
      {paidGroups.length > 0 && (
        <details style={{ marginTop: '24px' }}>
          <summary style={{
            cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 700, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: '10px', userSelect: 'none',
          }}>
            Paid ({paidGroups.length}) — click to expand
          </summary>
          <div style={{ marginTop: '10px' }}>
            {paidGroups.map((entry) => (
              <GroupCard
                key={entry.group.id}
                groupEntry={entry}
                session={session}
                activeFY={activeFY}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
