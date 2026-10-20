// ====================================================================
// AlumniLoop — Application Root
// File: src/App.tsx
// ====================================================================

import React from 'react'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/router'

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
