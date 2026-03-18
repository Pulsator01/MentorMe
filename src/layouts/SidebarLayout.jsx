import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BookOpenText, ClipboardList, Home, LayoutDashboard, Menu, Sparkles, Users, X } from 'lucide-react'
import { cn } from '../components/ui'

const navItems = [
  { label: 'Workspace Home', path: '/', icon: Home, note: 'Choose the right experience for the role.' },
  { label: 'Founders', path: '/founders', icon: Sparkles, note: 'Request mentors and track venture progress.' },
  { label: 'Students', path: '/students', icon: Users, note: 'Prepare materials, meetings, and follow-ups.' },
  { label: 'CFE Team', path: '/cfe', icon: LayoutDashboard, note: 'Approve, route, and manage the pipeline.' },
  { label: 'Mentor Network', path: '/cfe/network', icon: Users, note: 'Maintain mentor visibility and capacity.' },
  { label: 'Mid-sem Readiness', path: '/midsem', icon: ClipboardList, note: 'Show product scope, API progress, and DB coverage.' },
  { label: 'Readiness Playbook', path: '/playbook', icon: BookOpenText, note: 'Use TRL and BRL signals consistently.' },
]

function SidebarLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

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
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/' || item.path === '/founders' || item.path === '/students' || item.path === '/cfe'}
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
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>
                </div>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Structure</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Each role sees only what it needs instead of one crowded dashboard.
            </p>
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
