import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import { RecallsPage, RetainPage, StandbyPage, MandPage, SpoiltPage } from './pages/ClaimPages'
import { ProfilePage } from './pages/ProfilePage'
import { StationsPage } from './pages/StationsPage'
import BottomNav from './components/BottomNav'
import './styles/global.css'

// Strip Vercel toolbar auth callback params so they don't persist in the URL
if (typeof window !== 'undefined' && window.location.search.includes('_vercel_toolbar_code')) {
  window.history.replaceState({}, '', window.location.pathname)
}

function AppContent() {
  const { session, loading } = useAuth()
  const [tab, setTab] = useState('dashboard')

  if (loading) return null

  if (!session) return <AuthPage />

  const pages = {
    dashboard:  <Dashboard />,
    recalls:    <RecallsPage />,
    retain:     <RetainPage />,
    standby:    <StandbyPage />,
    mand:       <MandPage />,
    spoilt:     <SpoiltPage />,
    stations:   <StationsPage />,
    profile:    <ProfilePage />,
  }

  return (
    <>
      {pages[tab] ?? <Dashboard />}
      <BottomNav active={tab} onChange={setTab} />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
