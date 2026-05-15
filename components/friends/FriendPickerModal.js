'use client'

// ─── FriendPickerModal ────────────────────────────────────────────────────────
// Shown after a user creates a claim. Lets them optionally send an independent
// DRAFT COPY of that claim to one or more accepted friends.
//
// IMPORTANT: This produces fully independent claims. The source claim is
// never linked to the replicas after creation. See
// docs/FRIEND_REPLICATION_ARCHITECTURE.md.

import { useEffect, useState } from 'react'
import { listFriends, replicateClaimToFriends } from '@/lib/friends/friendsApi'

const FIELD = { marginBottom: '14px' }
const LABEL_STYLE = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9ca3af',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px',
}

export default function FriendPickerModal({ sourceTable, sourceClaimId, onClose, onDone }) {
  const [friends, setFriends]       = useState([])
  const [selected, setSelected]     = useState(() => new Set())
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)
  const [result, setResult]         = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listFriends()
      .then((data) => { if (!cancelled) setFriends(data) })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load friends.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggle = (uid) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid); else next.add(uid)
      return next
    })
  }

  const handleSend = async () => {
    if (selected.size === 0 || !sourceClaimId || !sourceTable) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await replicateClaimToFriends(sourceTable, sourceClaimId, Array.from(selected))
      setResult({ requested: selected.size, created: created.length })
    } catch (err) {
      setError(err.message || 'Failed to send draft copies.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '20px',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          borderRadius: '16px', padding: '24px', width: '100%',
          maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f9fafb' }}>
              Send draft to friends?
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
              Each friend gets their own independent copy to edit.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'none', border: 'none', color: '#6b7280',
            cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: '0 4px',
          }}>×</button>
        </div>

        {result ? (
          <>
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#4ade80', borderRadius: '10px', padding: '14px 16px',
              fontSize: '0.9rem', marginBottom: '16px',
            }}>
              ✓ Sent draft copies to {result.created} friend{result.created === 1 ? '' : 's'}.
              {result.created < result.requested && (
                <div style={{ fontSize: '0.78rem', marginTop: '6px', color: '#86efac' }}>
                  {result.requested - result.created} skipped (friendship no longer valid).
                </div>
              )}
            </div>
            <button onClick={() => onDone?.()} style={primaryBtn}>Done</button>
          </>
        ) : loading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>Loading friends…</p>
        ) : friends.length === 0 ? (
          <>
            <p style={{ color: '#9ca3af', fontSize: '0.88rem', marginBottom: '14px' }}>
              You don’t have any friends added yet. You can add friends from the Friends page.
            </p>
            <button onClick={() => onDone?.()} style={primaryBtn}>Skip</button>
          </>
        ) : (
          <>
            <div style={FIELD}>
              <label style={LABEL_STYLE}>Select friends</label>
              <div style={{
                border: '1px solid #2a2a2a', borderRadius: '10px',
                background: '#111', maxHeight: '260px', overflowY: 'auto',
              }}>
                {friends.map((f) => {
                  const checked = selected.has(f.friend_user_id)
                  return (
                    <label key={f.friend_user_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 14px', cursor: 'pointer',
                        borderBottom: '1px solid #1c1c1c',
                      }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => toggle(f.friend_user_id)}
                        style={{ accentColor: '#dc2626', width: '16px', height: '16px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', color: '#e5e7eb', fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.display_name || f.email}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#6b7280',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.email}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: '14px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem',
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => onDone?.()} disabled={submitting} style={secondaryBtn(submitting)}>
                Skip
              </button>
              <button onClick={handleSend} disabled={submitting || selected.size === 0}
                style={primaryBtn(submitting || selected.size === 0)}>
                {submitting ? 'Sending…' : `Send to ${selected.size || ''}`.trim()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const primaryBtn = (disabled) => ({
  flex: 1, padding: '10px', background: disabled ? '#7f1d1d' : '#dc2626',
  border: 'none', borderRadius: '8px', color: 'white',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.9rem', fontWeight: 600,
})
const secondaryBtn = (disabled) => ({
  flex: 1, padding: '10px', background: 'transparent', border: '1px solid #333',
  borderRadius: '8px', color: '#9ca3af',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.9rem', fontWeight: 600,
})
