import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'

import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import { RecallsPage, RetainPage, StandbyPage, SpoiltPage } from './pages/ClaimPages'
import { ProfilePage } from './pages/ProfilePage'
import BottomNav from './components/BottomNav'
import { LoadingScreen } from './components/UI'
import './styles/global.css'

const PAGE_TITLES = {
  dashboard: 'Home',
  recalls: 'Recalls',
  retain: 'Retain',
  standby: 'Standby / M&D',
  spoilt: 'Spoilt / Delayed',
  profile: 'Profile',
}

function AppShell() {
  const { session, loading } = useAuth()
  const [page, setPage] = useState('dashboard')

  if (loading) return <LoadingScreen />
  if (!session) return <AuthPage />

  const pages = {
    dashboard: <Dashboard />,
    recalls: <RecallsPage />,
    retain: <RetainPage />,
    standby: <StandbyPage />,
    spoilt: <SpoiltPage />,
    profile: <ProfilePage />,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div className="top-bar">
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
          {PAGE_TITLES[page]}
        </h1>
        {page === 'dashboard' && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
            FRV Allowances
          </span>
        )}
      </div>

      <main style={{ flex: 1 }}>
        {pages[page]}
      </main>

      <BottomNav active={page} onChange={setPage} />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
