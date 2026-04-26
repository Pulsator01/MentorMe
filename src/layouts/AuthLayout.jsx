import { Link, Navigate, useLocation } from 'react-router-dom'
import { Sparkles, ShieldCheck, Layers } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { FullPageLoader } from '../components/RequireAuth'

const valueProps = [
  {
    icon: Sparkles,
    title: 'One workspace per role',
    description: 'Founders, students, mentors, and the CFE team each get a focused dashboard instead of one crowded screen.',
  },
  {
    icon: ShieldCheck,
    title: 'Production-grade auth',
    description: 'Email and password, Google sign-in, magic links, and refresh sessions all in one secure flow.',
  },
  {
    icon: Layers,
    title: 'Mentor pipeline you can trust',
    description: 'Approvals, scheduling, and follow-ups stay visible from request to closeout — no shadow spreadsheets.',
  },
]

function BrandPanel({ headline, subheadline }) {
  return (
    <aside className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col">
      <div className="absolute inset-0 -z-0 opacity-60">
        <div className="absolute -top-32 -right-20 h-72 w-72 rounded-full bg-amber-500/30 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-300">MentorMe</p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">{headline}</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">{subheadline}</p>

        <ul className="mt-10 space-y-5">
          {valueProps.map((item) => (
            <li key={item.title} className="flex gap-4">
              <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-white">
                <item.icon size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-12 text-xs uppercase tracking-[0.24em] text-slate-400">
          Mentor pipeline OS for accelerators &amp; campus innovation centres
        </div>
      </div>
    </aside>
  )
}

function AuthLayout({
  children,
  eyebrow,
  title,
  description,
  footer,
  brandHeadline = 'Mentor pipeline that respects everyone&rsquo;s time.',
  brandSubheadline = 'Sign in to keep founders, mentors, and the CFE team aligned across requests, sessions, and follow-ups.',
  allowAuthenticated = false,
}) {
  const { mode, currentUser, bootStatus, apiConfigured } = useAppState()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const next = params.get('next')

  if (mode === 'local') {
    return <Navigate to="/" replace />
  }

  if (apiConfigured && bootStatus === 'pending') {
    return <FullPageLoader message="Restoring your session" />
  }

  if (currentUser && !allowAuthenticated) {
    return <Navigate to={next || '/'} replace />
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <BrandPanel headline={brandHeadline} subheadline={brandSubheadline} />

        <main className="flex flex-col px-6 py-10 sm:px-10 md:px-14 md:py-14">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
            <Link to="/" className="font-semibold text-slate-700 transition hover:text-slate-950">
              MentorMe
            </Link>
            <Link to="/" className="text-slate-500 transition hover:text-slate-700">
              ← Back to overview
            </Link>
          </div>

          <div className="mx-auto mt-12 w-full max-w-md">
            <div className="space-y-2">
              {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
              ) : null}
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">{title}</h2>
              {description ? (
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              ) : null}
            </div>

            <div className="mt-8 space-y-6">{children}</div>

            {footer ? <div className="mt-10 text-sm text-slate-600">{footer}</div> : null}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AuthLayout
