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

  async function signIn(email, password) {
    try {
      console.log("Attempting sign in...")
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log("Supabase response:", { data, error })
      if (error) {
        throw error
      }
      return data
    } catch (err) {
      console.error("Sign in error:", err)
      throw err
    }
  }

  async function signUp(email, password) {
    try {
      console.log("Attempting sign up...")
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      console.log("Signup response:", { data, error })
      if (error) {
        throw error
      }
      return data
    } catch (err) {
      console.error("Sign up error:", err)
      throw err
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) {
        console.error('Reset password error:', error.message)
        throw error
      }
      return data
    } catch (err) {
      console.error('Unexpected reset password error:', err)
      throw err
    }
  }

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }
}
