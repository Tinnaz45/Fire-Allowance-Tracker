'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleSession = async () => {
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          console.log('Setting session from reset link')
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })
          if (error) {
            console.error(error)
            setError('Invalid or expired reset link')
          }
        }
      }
    }
    handleSession()
  }, [])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })
      if (error) throw error
      setMessage('Password updated successfully')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to update password')
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <form
        onSubmit={handleUpdate}
        className="bg-zinc-900 p-6 rounded-lg w-full max-w-sm"
      >
        <h2 className="text-xl mb-4">Set New Password</h2>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 p-2 rounded bg-black border border-zinc-700"
        />
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {message && <p className="text-green-500 mb-2">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 p-2 rounded"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
