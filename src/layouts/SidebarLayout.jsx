import { useState, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import TopHeader from '../components/TopHeader'

function SidebarLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const handleMobileClose = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-5 py-6 md:px-10 md:py-8">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default SidebarLayout
