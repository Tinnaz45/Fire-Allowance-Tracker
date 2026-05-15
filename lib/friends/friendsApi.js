// ─── Friends + claim replication client API ───────────────────────────────────
// Thin wrappers around the SECURITY DEFINER RPCs in fat.* — all input validation
// and authorisation happens server-side. See docs/FRIEND_REPLICATION_ARCHITECTURE.md.

import { fat } from '@/lib/supabaseClient'

export async function searchUserByEmail(email) {
  const trimmed = (email || '').trim()
  if (!trimmed) return null
  const { data, error } = await fat.rpc('search_user_by_email', { p_email: trimmed })
  if (error) throw error
  return (data && data[0]) || null
}

export async function sendFriendRequest(recipientUserId) {
  const { data, error } = await fat.rpc('send_friend_request', { p_recipient_user_id: recipientUserId })
  if (error) throw error
  return data
}

export async function acceptFriendRequest(requestId) {
  const { error } = await fat.rpc('accept_friend_request', { p_request_id: requestId })
  if (error) throw error
}

export async function rejectFriendRequest(requestId) {
  const { error } = await fat.rpc('reject_friend_request', { p_request_id: requestId })
  if (error) throw error
}

export async function cancelFriendRequest(requestId) {
  const { error } = await fat.rpc('cancel_friend_request', { p_request_id: requestId })
  if (error) throw error
}

export async function removeFriend(friendUserId) {
  const { error } = await fat.rpc('remove_friend', { p_friend_user_id: friendUserId })
  if (error) throw error
}

export async function listFriends() {
  const { data, error } = await fat.rpc('list_friends_with_profile')
  if (error) throw error
  return data || []
}

export async function listPendingRequests() {
  const { data, error } = await fat.rpc('list_friend_requests_with_profile')
  if (error) throw error
  return data || []
}

// Replicates a claim to each recipient. Server returns one row per
// successfully-created draft. Non-friends are silently skipped server-side.
export async function replicateClaimToFriends(sourceTable, sourceClaimId, recipientIds) {
  if (!recipientIds || recipientIds.length === 0) return []
  const { data, error } = await fat.rpc('replicate_claim_to_friends', {
    p_source_table:    sourceTable,
    p_source_claim_id: sourceClaimId,
    p_recipient_ids:   recipientIds,
  })
  if (error) throw error
  return data || []
}

// Incoming-draft banner support.
export async function listIncomingReplicationEvents({ unseenOnly = true } = {}) {
  let query = fat
    .from('claim_replication_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (unseenOnly) query = query.is('seen_at', null)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function markReplicationEventsSeen(eventIds) {
  if (!eventIds || eventIds.length === 0) return
  const { error } = await fat.rpc('mark_replication_events_seen', { p_event_ids: eventIds })
  if (error) throw error
}
