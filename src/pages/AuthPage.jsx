import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function switchMode(next) {
    setMode(next)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === "signup") {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">🚒</div>

      <div className="auth-card">
        <h1>Fire Allowance Tracker</h1>
        <p className="auth-sub">
          {mode === 'login' ? 'Sign in to your account'
            : mode === 'signup' ? 'Create a new account'
            : 'Reset your password'}
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && (
          <div style={{ background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius)', padding: '10px 13px', fontSize: '0.875rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@frv.vic.gov.au"
              required
              autoComplete="email"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
              />
              {mode === 'login' && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem', padding: '2px 0', alignSelf: 'flex-start', marginTop: 4 }}
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading
              ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              : mode === 'login' ? 'Sign in'
              : mode === 'signup' ? 'Create account'
              : 'Send reset link'
            }
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.875rem' }}
            onClick={() => switchMode(mode === 'signup' ? 'login' : mode === 'forgot' ? 'login' : 'signup')}
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Back to sign in'
            }
          </button>
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: '0.75rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: 280 }}>
        Your data is private and only visible to you.
      </p>
    </div>
  )
}
