import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from '../ErrorBoundary'
import { useIdleLogout } from '../../hooks/useIdleLogout'

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  useIdleLogout()

  return (
    <div className="min-h-screen bg-[#F4F6F4]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main
        className="min-h-screen transition-all duration-200"
        style={{ marginLeft: collapsed ? 56 : 224 }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
