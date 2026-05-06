import { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Menu, Bell, LogOut, Settings, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppState } from '../context/AppState'
import { cn } from './ui'

const BREADCRUMB_LABELS = {
  founders: 'Founders',
  'new-request': 'New Request',
  pipeline: 'Pipeline',
  students: 'Students',
  'follow-up': 'AI Follow-up',
  cfe: 'CFE',
  network: 'Mentor Network',
  invitations: 'Invitations',
  mentors: 'Mentors',
  desk: 'Mentor Desk',
  notifications: 'Notifications',
  settings: 'Settings',
  playbook: 'TRL Playbook',
  midsem: 'Midsem Readiness',
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return <span className="text-sm font-medium text-slate-800">Home</span>
  }

  const crumbs = segments.map((seg, i) => ({
    label: BREADCRUMB_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1">
          {!crumb.isLast && (
            <>
              <Link to={crumb.path} className="font-medium text-slate-500 transition-colors hover:text-slate-800">
                {crumb.label}
              </Link>
              <ChevronRight size={13} className="text-slate-300" />
            </>
          )}
          {crumb.isLast && (
            <span className="font-semibold text-slate-800">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function TopHeader({ onMenuClick }) {
  const { currentUser, unreadNotificationCount, logout } = useAppState()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-1">
        <Link
          to="/notifications"
          className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadNotificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-slate-950">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </Link>

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className={cn(
              'flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100',
              dropdownOpen && 'bg-slate-100',
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-200">
              {getInitials(currentUser?.name)}
            </span>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1.5 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/50"
              >
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-slate-800">{currentUser?.name || 'User'}</p>
                  <p className="truncate text-xs text-slate-400">{currentUser?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                  >
                    <Settings size={15} />
                    Settings
                  </Link>
                  <button
                    onClick={async () => {
                      setDropdownOpen(false)
                      await logout()
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
