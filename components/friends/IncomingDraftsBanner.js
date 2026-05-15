'use client'

// ─── IncomingDraftsBanner ─────────────────────────────────────────────────────
// Surfaces draft claims that friends have replicated to the current user.
// Each entry is a fully INDEPENDENT claim that already lives in the recipient's
// own claim tables — the banner is purely an informational notification.

import { useEffect, useState } from 'react'
import { listIncomingReplicationEvents, markReplicationEventsSeen } from '@/lib/friends/friendsApi'
import { supabase } from '@/lib/supabaseClient'
import { CLAIM_TYPE_LABELS } from '@/lib/claims/claimTypes'

function labelForEvent(e) {
  if (e.claim_type === 'spoilt_meals') return 'Spoilt / Delayed Meal'
  return CLAIM_TYPE_LABELS[e.claim_type] || e.claim_type
}

export default function IncomingDraftsBanner() {
  const [events, setEvents] = useState([])
  const [senderMap, setSenderMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const evts = await listIncomingReplicationEvents({ unseenOnly: true })
        if (cancelled) return
        setEvents(evts)
        // Best-effort sender label lookup. profiles RLS only returns the caller's
        // own row, so we fall back to "A friend" for unresolved senders.
        const senderIds = Array.from(new Set(evts.map((e) => e.source_user_id)))
        if (senderIds.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, display_name, email')
            .in('id', senderIds)
          if (cancelled) return
          const map = {}
          for (const p of profs || []) {
            map[p.id] = (p.first_name && p.last_name)
              ? `${p.first_name} ${p.last_name}`
              : (p.display_name || p.email || 'A friend')
          }
          setSenderMap(map)
        }
      } catch (err) {
        console.warn('[IncomingDrafts] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const dismissAll = async () => {
    const ids = events.map((e) => e.id)
    setEvents([])
    try { await markReplicationEventsSeen(ids) } catch (_) {}
  }

  if (loading || events.length === 0) return null

  return (
    <div style={{
      marginBottom: '20px',
      background: 'rgba(220,38,38,0.08)',
      border: '1px solid rgba(220,38,38,0.25)',
      borderRadius: '12px',
      padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: events.length > 0 ? '10px' : 0,
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fca5a5' }}>
          {events.length === 1 ? '1 friend sent you a draft claim' : `${events.length} friends sent you draft claims`}
        </div>
        <button onClick={dismissAll}
          style={{
            background: 'none', border: 'none', color: '#9ca3af',
            cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
          }}>Dismiss all</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {events.slice(0, 5).map((e) => (
          <div key={e.id} style={{ fontSize: '0.82rem', color: '#e5e7eb' }}>
            <strong style={{ color: '#f9fafb' }}>
              {senderMap[e.source_user_id] || 'A friend'}
            </strong>{' '}
            sent you a <em style={{ color: '#fca5a5' }}>{labelForEvent(e)}</em> draft.
            Open it in <strong>My Claims</strong> below to edit and submit.
          </div>
        ))}
        {events.length > 5 && (
          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>+{events.length - 5} more</div>
        )}
      </div>
    </div>
  )
}
