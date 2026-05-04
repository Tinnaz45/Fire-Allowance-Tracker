'use client'

import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'

const App = dynamicImport(() => import('../src/App'), {
  ssr: false,
})

export default function Page() {
  return <App />
}