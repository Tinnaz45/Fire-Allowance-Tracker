'use client'

// ─── AppShell — Authenticated App Layout Wrapper ──────────────────────────────
// Wraps every authenticated screen with the shared bottom tab navigation.
//
// Usage:
//   import AppShell from '@/components/nav/AppShell'
//   export default function MyPage() {
//     return (
//       <AppShell>
//         {/* page content */}
//       </AppShell>
//     )
//   }
//
// AppShell renders:
//   - page content (children) scrollable in the centre
//   - AppNav fixed at the bottom
//
// It does NOT handle auth — each page owns its own auth check and redirect.
// ─────────────────────────────────────────────────────────────────────────────

import AppNav from './AppNav'

export default function AppShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f0f',
      color: '#e5e7eb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      // Top safe-area inset so content never hides behind the Dynamic Island
      paddingTop: 'env(safe-area-inset-top, 0px)',
      boxSizing: 'border-box',
      overflowX: 'hidden',
      // Flex column so the nav spacer always sits at the bottom
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Page content — grows to fill available space */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {children}
      </main>

      {/* Shared bottom nav + its own spacer */}
      <AppNav />
    </div>
  )
}
