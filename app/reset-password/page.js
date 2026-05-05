'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  // 'verifying' | 'ready' | 'expired'
  const [stage, setStage] = useState('verifying')

  // Ref so the timeout closure reads the live value, not a stale snapshot
  const sessionConfirmed = useRef(false)

  useEffect(() => {
    let mounted = true

    const initSession = async () => {
      try {
        console.log('INIT SESSION START')
        const hash = window.location.hash
        console.log('URL HASH:', hash)
        if (hash && hash.includes('type=recovery')) {
          console.log('Hash recovery flow detected')
          // This correctly initializes session from URL hash in v2
          const { data, error } = await supabase.auth.getSession()
          console.log('SESSION RESULT:', { data, error })
          if (error) {
            console.error('Session error:', error)
            setStage('expired')
            return
          }
          if (!data?.session) {
            console.log('No session yet, retrying...')
            // wait briefly and retry once
            await new Promise(resolve => setTimeout(resolve, 500))
            const retry = await supabase.auth.getSession()
            console.log('RETRY SESSION:', retry)
            if (!retry.data?.session) {
              console.error('No session after retry')
              setStage('expired')
              return
            }
            console.log('Session confirmed after retry')
            sessionConfirmed.current = true
            setStage('ready')
            return
          }
          console.log('Session confirmed')
          sessionConfirmed.current = true
          setStage('ready')
        } else {
          console.log('No recovery hash found')
          setStage('expired')
        }
      } catch (err) {
        console.error('INIT SESSION FAILED:', err)
        setStage('expired')
      }
    }

    initSession()

    return () => { mounted = false }
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Hard guard — never call updateUser without a confirmed session
    if (!sessionConfirmed.current) {
      setError('Session lost. Please request a new reset link.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess('Password updated successfully! Redirecting to sign in…')
    // Small delay ONLY for UI render stability (NOT navigation timing)
    await new Promise(resolve => setTimeout(resolve, 100))
    window.location.assign('/login')
  }

  // ── Expired / invalid link ─────────────────────────────────────────────────
  if (stage === 'expired') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8 shadow-xl text-center">
          <div className="w-12 h-12 bg-red-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Link Expired or Invalid</h2>
          <p className="text-gray-400 text-sm mb-6">
            This reset link has expired or is no longer valid. Please request a new one.
          </p>
          <a
            href="/forgot-password"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
          >
            Request New Link
          </a>
        </div>
      </div>
    )
  }

  // ── Verifying (spinner) ────────────────────────────────────────────────────
  if (stage === 'verifying') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8 shadow-xl text-center">
          <div className="w-12 h-12 bg-red-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">Verifying reset link…</p>
          <p className="text-gray-500 text-xs mt-2">
            If this takes too long, your link may have expired.{' '}
            <a href="/forgot-password" className="text-red-400 hover:underline">Request a new one</a>.
          </p>
        </div>
      </div>
    )
  }

  // ── Ready — show password form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-red-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Set New Password</h1>
          <p className="text-gray-400 text-sm mt-1">Choose a strong new password</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              placeholder="Min. 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-900/30 border border-green-700 text-green-400 text-sm rounded-xl px-4 py-3">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200"
          >
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
