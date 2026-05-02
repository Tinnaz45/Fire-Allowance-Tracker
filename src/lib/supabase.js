import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── STATIONS LIST ────────────────────────────────────────────────────────────
export const STATIONS = [
  { id: 1, name: 'Clayton' }, { id: 2, name: 'Dandenong' }, { id: 3, name: 'Scoresby' },
  { id: 4, name: 'Springvale' }, { id: 5, name: 'Frankston' }, { id: 6, name: 'Cranbourne' },
  { id: 7, name: 'Narre Warren' }, { id: 8, name: 'Endeavour Hills' }, { id: 9, name: 'Pakenham' },
  { id: 10, name: 'Hallam' }, { id: 11, name: 'Berwick' }, { id: 12, name: 'Officer' },
  { id: 13, name: 'Carrum Downs' }, { id: 14, name: 'Chelsea' }, { id: 15, name: 'Mordialloc' },
  { id: 16, name: 'Oakleigh' }, { id: 17, name: 'Prahran' }, { id: 18, name: 'Brighton' },
  { id: 19, name: 'St Kilda' }, { id: 20, name: 'Port Melbourne' }, { id: 21, name: 'South Melbourne' },
  { id: 22, name: 'City' }, { id: 23, name: 'Richmond' }, { id: 24, name: 'Hawthorn' },
  { id: 25, name: 'Camberwell' }, { id: 26, name: 'Box Hill' }, { id: 27, name: 'Nunawading' },
  { id: 28, name: 'Ringwood' }, { id: 29, name: 'Lilydale' }, { id: 30, name: 'Healesville' },
  { id: 31, name: 'Knox' }, { id: 32, name: 'Ferntree Gully' }, { id: 33, name: 'Vermont' },
  { id: 34, name: 'Mitcham' }, { id: 35, name: 'Doncaster' }, { id: 36, name: 'Bundoora' },
  { id: 37, name: 'Epping' }, { id: 38, name: 'Mernda' }, { id: 39, name: 'Diamond Creek' },
  { id: 40, name: 'Eltham' }, { id: 41, name: 'Heidelberg' }, { id: 42, name: 'Ivanhoe' },
  { id: 43, name: 'Northcote' }, { id: 44, name: 'Preston' }, { id: 45, name: 'Reservoir' },
  { id: 46, name: 'Thomastown' }, { id: 47, name: 'Broadmeadows' }, { id: 48, name: 'Sunbury' },
  { id: 49, name: 'Gisborne' }, { id: 50, name: 'Melton' }, { id: 51, name: 'Deer Park' },
  { id: 52, name: 'Footscray' }, { id: 53, name: 'Newport' }, { id: 54, name: 'Williamstown' },
  { id: 55, name: 'Altona' }, { id: 56, name: 'Laverton' }, { id: 57, name: 'Hoppers Crossing' },
  { id: 58, name: 'Werribee' }, { id: 59, name: 'Point Cook' }, { id: 60, name: 'Wyndham Vale' },
  { id: 61, name: 'Yarraville' }, { id: 62, name: 'Maribyrnong' }, { id: 63, name: 'Keilor' },
  { id: 64, name: 'Airport West' }, { id: 65, name: 'Essendon' }, { id: 66, name: 'Moonee Ponds' },
  { id: 67, name: 'Flemington' }, { id: 68, name: 'Brunswick' }, { id: 69, name: 'Coburg' },
  { id: 70, name: 'Fawkner' }, { id: 71, name: 'Craigieburn' }, { id: 72, name: 'Roxburgh Park' },
  { id: 73, name: 'Greenvale' }, { id: 74, name: 'Tullamarine' }, { id: 75, name: 'Sydenham' },
  { id: 76, name: 'St Albans' }, { id: 77, name: 'Sunshine' }, { id: 78, name: 'Braybrook' },
  { id: 79, name: 'Ardeer' }, { id: 80, name: 'Albion' }, { id: 81, name: 'Geelong West' },
  { id: 82, name: 'Geelong' }, { id: 83, name: 'Belmont' }, { id: 84, name: 'Norlane' },
  { id: 85, name: 'Corio' }, { id: 86, name: 'Lara' }, { id: 87, name: 'Drysdale' },
  { id: 88, name: 'Torquay' }, { id: 89, name: 'Anglesea' }, { id: 90, name: 'Ocean Grove' },
  { id: 91, name: 'Barwon Heads' }, { id: 92, name: 'Leopold' }, { id: 93, name: 'Armstrong Creek' },
  { id: 94, name: 'Bannockburn' }, { id: 95, name: 'Winchelsea' }, { id: 96, name: 'Colac' },
]

export const stationName = (id) => {
  const s = STATIONS.find(x => x.id === id)
  return s ? s.name : '—'
}

// ─── ALLOWANCE RATES ──────────────────────────────────────────────────────────
export const RATES = {
  kmRate: 0.43,
  dayMealie: 17.85,
  nightMealie: 22.40,
  retainDay: 28.50,
  retainNight: 42.70,
  spoiltMeal: 22.80,
  nightStandbyMealie: 22.40,
}
