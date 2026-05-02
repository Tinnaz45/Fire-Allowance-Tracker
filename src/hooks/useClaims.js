import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { RATES } from '../lib/supabase'

export function useClaims() {
  const { session } = useAuth()
  const [recalls, setRecalls] = useState([])
  const [retain, setRetain] = useState([])
  const [standby, setStandby] = useState([])
  const [spoilt, setSpoilt] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const uid = session.user.id
    const [r, rt, sb, sp] = await Promise.all([
      supabase.from('recalls').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('retain').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('standby').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('spoilt').select('*').eq('user_id', uid).order('date', { ascending: false }),
    ])
    if (r.data) setRecalls(r.data)
    if (rt.data) setRetain(rt.data)
    if (sb.data) setStandby(sb.data)
    if (sp.data) setSpoilt(sp.data)
    setLoading(false)
  }, [session])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── RECALLS ────────────────────────────────────────────────
  async function addRecall(form) {
    const km = (parseFloat(form.distHomeKm) || 0) + (parseFloat(form.distStnKm) || 0)
    const travel = +(km * RATES.kmRate).toFixed(2)
    const mealie = form.shift === 'Night' ? RATES.nightMealie : RATES.dayMealie
    const { data, error } = await supabase.from('recalls').insert({
      user_id: session.user.id,
      date: form.date,
      rostered_stn_id: parseInt(form.rosteredStnId) || null,
      recall_stn_id: parseInt(form.recallStnId) || null,
      platoon: form.platoon,
      shift: form.shift,
      arrived: form.arrived,
      dist_home_km: parseFloat(form.distHomeKm) || 0,
      dist_stn_km: parseFloat(form.distStnKm) || 0,
      travel_amount: travel,
      mealie_amount: +mealie.toFixed(2),
      total_amount: +(travel + mealie).toFixed(2),
      notes: form.notes,
      status: 'Pending',
    }).select().single()
    if (!error) setRecalls(prev => [data, ...prev])
    return { data, error }
  }

  // ── RETAIN ─────────────────────────────────────────────────
  async function addRetain(form) {
    const retainAmt = form.shift === 'Night' ? RATES.retainNight : RATES.retainDay
    const overnight = parseFloat(form.overnightCash) || 0
    const { data, error } = await supabase.from('retain').insert({
      user_id: session.user.id,
      date: form.date,
      station_id: parseInt(form.stationId) || null,
      platoon: form.platoon,
      shift: form.shift,
      booked_off_time: form.bookedOffTime,
      rmss_number: form.rmssNumber,
      is_firecall: form.isFirecall === 'yes',
      overnight_cash: overnight,
      retain_amount: +retainAmt.toFixed(2),
      total_amount: +(retainAmt + overnight).toFixed(2),
      status: 'Pending',
    }).select().single()
    if (!error) setRetain(prev => [data, ...prev])
    return { data, error }
  }

  // ── STANDBY ────────────────────────────────────────────────
  async function addStandby(form) {
    const km = parseFloat(form.distKm) || 0
    const travel = +(km * 2 * RATES.kmRate).toFixed(2)
    const nightMealie = form.shift === 'Night' ? RATES.nightStandbyMealie : 0
    const { data, error } = await supabase.from('standby').insert({
      user_id: session.user.id,
      date: form.date,
      standby_type: form.standbyType,
      rostered_stn_id: parseInt(form.rosteredStnId) || null,
      standby_stn_id: parseInt(form.standbyStnId) || null,
      shift: form.shift,
      arrived: form.arrived,
      dist_km: km,
      travel_amount: travel,
      night_mealie: +nightMealie.toFixed(2),
      total_amount: +(travel + nightMealie).toFixed(2),
      notes: form.notes,
      free_from_home: form.freeFromHome === 'yes',
      status: 'Pending',
    }).select().single()
    if (!error) setStandby(prev => [data, ...prev])
    return { data, error }
  }

  // ── SPOILT ─────────────────────────────────────────────────
  async function addSpoilt(form) {
    const { data, error } = await supabase.from('spoilt').insert({
      user_id: session.user.id,
      date: form.date,
      meal_type: form.mealType,
      station_id: parseInt(form.stationId) || null,
      claim_stn_id: parseInt(form.claimStnId) || null,
      platoon: form.platoon,
      shift: form.shift,
      call_time: form.callTime,
      call_number: form.callNumber,
      meal_amount: RATES.spoiltMeal,
      claim_date: new Date().toISOString().split('T')[0],
      status: 'Pending',
    }).select().single()
    if (!error) setSpoilt(prev => [data, ...prev])
    return { data, error }
  }

  // ── MARK PAID ──────────────────────────────────────────────
  async function markPaid(table, id, payNumber) {
    const { error } = await supabase.from(table).update({ status: 'Paid', pay_number: payNumber }).eq('id', id)
    if (!error) {
      const setters = { recalls: setRecalls, retain: setRetain, standby: setStandby, spoilt: setSpoilt }
      setters[table](prev => prev.map(c => c.id === id ? { ...c, status: 'Paid', pay_number: payNumber } : c))
    }
    return { error }
  }

  // ── DELETE ─────────────────────────────────────────────────
  async function deleteClaim(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) {
      const setters = { recalls: setRecalls, retain: setRetain, standby: setStandby, spoilt: setSpoilt }
      setters[table](prev => prev.filter(c => c.id !== id))
    }
    return { error }
  }

  // ── AGGREGATES ─────────────────────────────────────────────
  const allClaims = [
    ...recalls.map(c => ({ ...c, type: 'Recall', table: 'recalls', amount: c.total_amount })),
    ...retain.map(c => ({ ...c, type: 'Retain', table: 'retain', amount: c.total_amount })),
    ...standby.map(c => ({ ...c, type: 'Standby', table: 'standby', amount: c.total_amount })),
    ...spoilt.map(c => ({ ...c, type: 'Spoilt', table: 'spoilt', amount: c.meal_amount })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const stats = {
    total: allClaims.length,
    pending: allClaims.filter(c => c.status === 'Pending').length,
    paid: allClaims.filter(c => c.status === 'Paid').length,
    pendingAmount: allClaims.filter(c => c.status === 'Pending').reduce((s, c) => s + (c.amount || 0), 0),
  }

  return {
    recalls, retain, standby, spoilt, allClaims, stats, loading,
    addRecall, addRetain, addStandby, addSpoilt,
    markPaid, deleteClaim, fetchAll,
  }
}
