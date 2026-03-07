import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BookOpenText, BriefcaseBusiness, LayoutDashboard, Menu, Sparkles, Users, X } from 'lucide-react'
import WarpBackground from '../components/WarpBackground'
import { cn } from '../components/ui'

const navItems = [
  { label: 'Founder Studio', path: '/student', icon: Sparkles, note: 'Request mentors, attach context, stay nudged.' },
  { label: 'Mentor Desk', path: '/mentor', icon: BriefcaseBusiness, note: 'Review approved asks and share slots.' },
  { label: 'CFE Control', path: '/admin', icon: LayoutDashboard, note: 'Approve, route, and track the pipeline.' },
  { label: 'Mentor Network', path: '/admin/mentors', icon: Users, note: 'Create profiles, tune tolerance, manage capacity.' },
  { label: 'Readiness Playbook', path: '/playbook', icon: BookOpenText, note: 'Use TRL and BRL signals consistently.' },
]

function SidebarLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 text-white shadow-[0_24px_90px_rgba(15,23,42,0.35)]">
      <WarpBackground backgroundColor="#020617" speed={0.22} starCount={110} />
      <div className="relative z-10 flex h-full flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">MentorMe</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">CFE mentorship command center</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            CFE stays in the loop from mentor discovery to post-meeting feedback. No direct access without approval.
          </p>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/student' || item.path === '/admin'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block rounded-[24px] border px-4 py-4 transition-all duration-200',
                  isActive
                    ? 'border-amber-300/40 bg-white/12 text-white shadow-[0_18px_40px_rgba(251,191,36,0.14)]'
                    : 'border-transparent bg-white/4 text-slate-300 hover:border-white/10 hover:bg-white/8 hover:text-white',
                )
              }
            >
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-white/10 p-2">
                  <item.icon size={18} />
                </span>
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.note}</p>
                </div>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-6 py-5">
          <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Operating mode</p>
            <p className="mt-2 text-sm font-medium">Founder, mentor, and CFE views share one live request state.</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">Use this build to validate the flow before wiring backend APIs.</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff5db,transparent_32%),radial-gradient(circle_at_top_right,#dbeafe,transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4 md:p-6">
        <div className="hidden w-[320px] shrink-0 xl:block">{nav}</div>

        <div className="flex min-h-screen flex-1 flex-col">
          <div className="mb-4 flex items-center justify-between rounded-[28px] border border-white/60 bg-white/75 px-5 py-4 shadow-[0_14px_50px_rgba(148,163,184,0.12)] backdrop-blur xl:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">MentorMe</p>
              <p className="mt-1 text-sm text-slate-700">CFE-controlled mentor access</p>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-2xl border border-slate-200 bg-slate-950 p-3 text-white"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          </div>

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 bg-slate-950/50 p-4 xl:hidden">
              <div className="flex h-full flex-col">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-3 text-white"
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
