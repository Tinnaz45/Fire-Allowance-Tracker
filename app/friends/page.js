'use client'

// ─── Friends management page ──────────────────────────────────────────────────
// Search by email · send / accept / reject requests · remove friends.
// All mutations go through the SECURITY DEFINER RPCs in lib/friends/friendsApi.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/components/nav/AppShell'
import {
  searchUserByEmail,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  listFriends,
  listPendingRequests,
} from '@/lib/friends/friendsApi'

const S = {
  inner: { maxWidth: '560px', margin: '0 auto', padding: '32px 16px', boxSizing: 'border-box' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '20px', marginBottom: '20px' },
  cardTitle: { margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 700, color: '#f9fafb' },
  label: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#e5e7eb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' },
  primaryBtn: { padding: '10px 14px', background: '#dc2626', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { padding: '8px 12px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#9ca3af', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #1f1f1f' },
  empty: { color: '#6b7280', fontSize: '0.85rem', padding: '10px 0' },
  error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '12px' },
  success: { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '12px' },
  pageHeader: { margin: '0 0 24px 0' },
  pageH1:     { margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f9fafb' },
  pageSub:    { margin: '2px 0 0', fontSize: '0.82rem', color: '#6b7280' },
}

export default function FriendsPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [friends, setFriends]     = useState([])
  const [requests, setRequests]   = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const [search, setSearch]         = useState('')
  const [searching, setSearching]   = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError]   = useState(null)

  const [actionError, setActionError]   = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setSession(data.session)
      setAuthLoading(false)
    })
  }, [router])

  const reload = async () => {
    setLoadingData(true)
    try {
      const [f, r] = await Promise.all([listFriends(), listPendingRequests()])
      setFriends(f)
      setRequests(r)
    } catch (err) {
      setActionError(err.message || 'Failed to load friends data.')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (!session) return
    reload()
  }, [session])

  const flashSuccess = (msg) => {
    setActionSuccess(msg)
    setTimeout(() => setActionSuccess(null), 3500)
  }

  const handleSearch = async (e) => {
    e?.preventDefault()
    setSearchError(null)
    setSearchResult(null)
    const trimmed = search.trim()
    if (!trimmed) return
    setSearching(true)
    try {
      const user = await searchUserByEmail(trimmed)
      if (!user) setSearchError('No user found with that email.')
      else setSearchResult(user)
    } catch (err) {
      setSearchError(err.message || 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleSend = async (userId) => {
    setActionError(null)
    try {
      await sendFriendRequest(userId)
      flashSuccess('Friend request sent.')
      setSearchResult(null)
      setSearch('')
      await reload()
    } catch (err) {
      setActionError(err.message || 'Failed to send request.')
    }
  }

  const handleAccept = async (requestId) => {
    setActionError(null)
    try {
      await acceptFriendRequest(requestId)
      flashSuccess('Friend added.')
      await reload()
    } catch (err) { setActionError(err.message || 'Failed to accept request.') }
  }

  const handleReject = async (requestId) => {
    setActionError(null)
    try {
      await rejectFriendRequest(requestId)
      await reload()
    } catch (err) { setActionError(err.message || 'Failed to reject request.') }
  }

  const handleCancel = async (requestId) => {
    setActionError(null)
    try {
      await cancelFriendRequest(requestId)
      await reload()
    } catch (err) { setActionError(err.message || 'Failed to cancel request.') }
  }

  const handleRemove = async (friendUserId, displayName) => {
    setActionError(null)
    if (!confirm(`Remove ${displayName || 'this friend'}?`)) return
    try {
      await removeFriend(friendUserId)
      flashSuccess('Friend removed.')
      await reload()
    } catch (err) { setActionError(err.message || 'Failed to remove friend.') }
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0f0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9ca3af', fontSize: '0.95rem',
      }}>Loading…</div>
    )
  }
  if (!session) return null

  const incoming = requests.filter((r) => r.direction === 'incoming')
  const outgoing = requests.filter((r) => r.direction === 'outgoing')

  return (
    <AppShell>
      <div style={S.inner}>
        <div style={S.pageHeader}>
          <h1 style={S.pageH1}>Friends</h1>
          <p style={S.pageSub}>
            Send a draft copy of any new claim to a friend. Each copy is fully
            independent — editing one never affects the other.
          </p>
        </div>

        {actionError && <div style={S.error}>{actionError}</div>}
        {actionSuccess && <div style={S.success}>✓ {actionSuccess}</div>}

        {/* Add friend by email */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Add a friend</h2>
          <form onSubmit={handleSearch}>
            <label style={S.label}>Their email address</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="friend@example.com"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...S.input, flex: 1 }}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button type="submit" disabled={searching || !search.trim()} style={S.primaryBtn}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>

          {searchError && (
            <div style={{ ...S.error, marginTop: '12px', marginBottom: 0 }}>{searchError}</div>
          )}

          {searchResult && (
            <div style={{
              marginTop: '14px', padding: '12px 14px',
              background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f9fafb',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {searchResult.display_name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {searchResult.email}
                </div>
              </div>
              <button onClick={() => handleSend(searchResult.user_id)} style={S.primaryBtn}>
                Send request
              </button>
            </div>
          )}
        </div>

        {/* Pending requests */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>
            Requests {incoming.length > 0 && (
              <span style={{
                marginLeft: '8px', padding: '2px 8px', background: 'rgba(220,38,38,0.15)',
                color: '#fca5a5', borderRadius: '999px', fontSize: '0.72rem',
              }}>{incoming.length} incoming</span>
            )}
          </h2>

          {loadingData ? (
            <div style={S.empty}>Loading…</div>
          ) : incoming.length === 0 && outgoing.length === 0 ? (
            <div style={S.empty}>No pending requests.</div>
          ) : (
            <>
              {incoming.map((r) => (
                <div key={r.request_id} style={S.row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f9fafb',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.display_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      wants to be your friend
                    </div>
                  </div>
                  <button onClick={() => handleAccept(r.request_id)} style={S.primaryBtn}>Accept</button>
                  <button onClick={() => handleReject(r.request_id)} style={S.secondaryBtn}>Reject</button>
                </div>
              ))}
              {outgoing.map((r) => (
                <div key={r.request_id} style={S.row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f9fafb',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.display_name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                      pending — waiting for them to accept
                    </div>
                  </div>
                  <button onClick={() => handleCancel(r.request_id)} style={S.secondaryBtn}>Cancel</button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Friends list */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Your friends ({friends.length})</h2>
          {loadingData ? (
            <div style={S.empty}>Loading…</div>
          ) : friends.length === 0 ? (
            <div style={S.empty}>You haven’t added any friends yet.</div>
          ) : (
            friends.map((f) => (
              <div key={f.friend_user_id} style={S.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f9fafb',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.display_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.email}
                  </div>
                </div>
                <button onClick={() => handleRemove(f.friend_user_id, f.display_name)} style={S.secondaryBtn}>
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
