import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpenText,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useAppState } from '../context/AppState'
import { cn } from '../components/ui'

const navItems = [
  { label: 'Workspace Home', path: '/', icon: Home, note: 'Choose the right experience for the role.' },
  { label: 'Founders', path: '/founders', icon: Sparkles, note: 'Request mentors and track venture progress.' },
  { label: 'Students', path: '/students', icon: Users, note: 'Prepare materials, meetings, and follow-ups.' },
  { label: 'Mentor Desk', path: '/mentors/desk', icon: Users, note: 'Accept requests, schedule sessions, and leave mentor notes.' },
  { label: 'CFE Team', path: '/cfe', icon: LayoutDashboard, note: 'Pipeline, mentor network, and invitations all live here.' },
  { label: 'Notifications', path: '/notifications', icon: Bell, note: 'Recent request changes routed to your workspace.' },
  { label: 'Settings', path: '/settings', icon: Settings, note: 'Profile, password, and session controls.' },
  { label: 'Mid-sem Readiness', path: '/midsem', icon: ClipboardList, note: 'Show product scope, API progress, and DB coverage.' },
  { label: 'Readiness Playbook', path: '/playbook', icon: BookOpenText, note: 'Use TRL and BRL signals consistently.' },
]

function SidebarLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { currentUser, mode, logout, unreadNotificationCount } = useAppState()
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (mode !== 'api') {
      return
    }
    setSigningOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  const nav = (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">MentorMe</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Role-based workspaces</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Separate views for founders, students, and the CFE team.
        </p>
      </div>

      <div className="flex h-full flex-col">
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const showBadge = item.path === '/notifications' && unreadNotificationCount > 0

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-2xl border px-4 py-3 transition-colors',
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50',
                  )
                }
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
                    <item.icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.label}</p>
                      {showBadge ? (
                        <span
                          aria-label={`${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? '' : 's'}`}
                          className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white"
                        >
                          {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>
                  </div>
                </div>
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            {currentUser ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Active session</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{currentUser.name}</p>
                <p className="mt-1 text-sm text-slate-600">{currentUser.email}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">
                  {currentUser.role} • {mode === 'api' ? 'live api' : 'local demo'}
                </p>
                {mode === 'api' ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={signingOut}
                    aria-label="Sign out of MentorMe"
                    className={cn(
                      'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition',
                      signingOut ? 'cursor-not-allowed opacity-60' : 'hover:border-slate-300 hover:text-slate-950',
                    )}
                  >
                    <LogOut size={14} />
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Structure</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Each role sees only what it needs instead of one crowded dashboard.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] gap-5 p-4 md:p-5">
        <div className="hidden w-[280px] shrink-0 xl:block">{nav}</div>

        <div className="flex min-h-screen flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm xl:hidden">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">MentorMe</p>
              <p className="mt-1 text-sm text-slate-700">Role-based mentor workflow</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-900"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          </div>

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 bg-slate-950/20 p-4 backdrop-blur-sm xl:hidden">
              <div className="flex h-full flex-col">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-900"
                    aria-label="Close navigation"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1">{nav}</div>
              </div>
            </div>
          ) : null}

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}

export default SidebarLayout
