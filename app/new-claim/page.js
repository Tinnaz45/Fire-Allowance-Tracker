'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ClaimForm from '@/components/claims/ClaimForm'

export default function NewClaimPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (!data.session) router.replace('/login')
    })
  }, [router])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0f0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9ca3af', fontSize: '0.95rem',
      }}>
        Loading…
      </div>
    )
  }

  if (!session) return null

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f0f0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#4ade80', fontSize: '0.95rem', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '12px',
          padding: '16px 24px',
          textAlign: 'center',
        }}>
          ✓ Claim submitted successfully!
        </div>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            background: '#dc2626',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      color: '#e5e7eb',
      padding: '32px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Back link */}
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none',
            color: '#9ca3af', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 500,
            marginBottom: '24px', padding: 0,
          }}
        >
          ← Back to Dashboard
        </button>

        <div style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          padding: '28px 24px',
        }}>
          <h1 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 700, color: '#f9fafb' }}>
            New Claim
          </h1>

          <ClaimForm
            userId={session.user.id}
            onSuccess={() => setSubmitted(true)}
            onCancel={() => router.push('/')}
          />
        </div>
      </div>
    </div>
  )
}
