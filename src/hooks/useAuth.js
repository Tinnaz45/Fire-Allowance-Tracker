import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AuthProvider({ children }) {
  return children
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted) return

        setSession(data.session)
        setUser(data.session?.user ?? null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user
  }
}