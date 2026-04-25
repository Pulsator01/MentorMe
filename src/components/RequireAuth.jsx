import { Navigate, useLocation } from 'react-router-dom'
import { useAppState } from '../context/AppState'
import { SectionCard } from './ui'

const buildRedirect = (location) => {
  const next = `${location.pathname}${location.search || ''}`
  return `/login?next=${encodeURIComponent(next)}`
}

function FullPageLoader({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-6">
      <SectionCard className="max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">MentorMe</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{message}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Hold tight while we restore your session.</p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-200 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
          <span className="h-2 w-2 animate-ping rounded-full bg-slate-700" />
          Authenticating
        </div>
      </SectionCard>
    </div>
  )
}

function RequireAuth({ children }) {
  const { mode, currentUser, bootStatus } = useAppState()
  const location = useLocation()

  if (mode === 'local') {
    return children
  }

  if (bootStatus === 'pending') {
    return <FullPageLoader message="Restoring your session" />
  }

  if (!currentUser) {
    return <Navigate to={buildRedirect(location)} replace />
  }

  return children
}

export default RequireAuth
export { FullPageLoader }
