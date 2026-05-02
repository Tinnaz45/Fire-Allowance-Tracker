import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { STATIONS } from '../data/stations'

const CURRENT_YEAR = new Date().getFullYear()

export function useStationDistances(fromStationId) {
  const [distances, setDistances] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!fromStationId) { setDistances({}); return }
    load(fromStationId)
  }, [fromStationId])

  async function load(fromId) {
    setLoading(true)
    setError(null)

    // Check DB cache for current year
    const { data: cached } = await supabase
      .from('station_distances')
      .select('to_station_id, distance_m, duration_s')
      .eq('from_station_id', fromId)
      .eq('calculated_year', CURRENT_YEAR)

    if (cached && cached.length > 0) {
      const map = {}
      cached.forEach(r => { map[r.to_station_id] = { distance_m: r.distance_m, duration_s: r.duration_s } })
      setDistances(map)
      setLoading(false)
      return
    }

    // Not cached — fetch from OSRM Table API
    const fromStation = STATIONS.find(s => s.id === fromId)
    if (!fromStation?.lat) { setLoading(false); return }

    // Put the reference station first (index 0), then all others
    const ordered = [fromStation, ...STATIONS.filter(s => s.id !== fromId)]
    const coordStr = ordered.map(s => `${s.lng},${s.lat}`).join(';')

    try {
      const res = await fetch(
        `https://router.project-osrm.org/table/v1/driving/${coordStr}?sources=0&annotations=duration,distance`
      )
      if (!res.ok) throw new Error(`OSRM error ${res.status}`)
      const json = await res.json()
      if (json.code !== 'Ok') throw new Error(json.message || 'OSRM routing failed')

      const durations = json.durations[0]
      const distancesArr = json.distances[0]

      const rows = ordered.map((station, i) => ({
        from_station_id: fromId,
        to_station_id: station.id,
        distance_m: Math.round(distancesArr[i] || 0),
        duration_s: Math.round(durations[i] || 0),
        calculated_year: CURRENT_YEAR,
      }))

      // Cache in DB — fire and forget, don't block the UI
      supabase
        .from('station_distances')
        .upsert(rows, { onConflict: 'from_station_id,to_station_id' })
        .then()

      const map = {}
      rows.forEach(r => { map[r.to_station_id] = { distance_m: r.distance_m, duration_s: r.duration_s } })
      setDistances(map)
    } catch (e) {
      setError(e.message)
    }

    setLoading(false)
  }

  return { distances, loading, error }
}
