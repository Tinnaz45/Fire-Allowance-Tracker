import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// FAT-owned tables live in the `fat` Postgres schema (financial_years,
// claim_groups, claim_sequences, stations, profile_ext, distance_cache,
// payment_components, plus the payment_summary view and RPCs).
// Use `fatDb.from(...)` and `fatDb.rpc(...)` for any FAT-schema access.
// Requires the Supabase project to expose `fat` under Settings → API.
export const fatDb = supabase.schema('fat')
