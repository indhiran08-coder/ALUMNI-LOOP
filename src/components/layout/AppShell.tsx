// ====================================================================
// AlumniLoop — Main Application Shell Layout
// File: src/components/layout/AppShell.tsx
// ====================================================================

import React from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { RightSidebar } from './RightSidebar'
import { MobileNav } from './MobileNav'

interface AppShellProps {
  children: React.ReactNode
  showRightSidebar?: boolean
  onSearch?: (query: string) => void
  currentSearch?: string
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  showRightSidebar = true,
  onSearch,
  currentSearch = '',
}) => {
  return (
    <div className="min-h-screen bg-[#FFFFF0] flex flex-col text-[#162832] antialiased selection:bg-[#33A1C9]/20">
      <Header onSearch={onSearch} currentSearch={currentSearch} />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex-1 flex pb-20 md:pb-8">
        <Sidebar />

        <main className="flex-1 min-w-0 py-4 sm:py-6 px-0 md:px-4">
          {children}
        </main>

        {showRightSidebar && <RightSidebar />}
      </div>

      <MobileNav />
    </div>
  )
}
