import { Navigate, useLocation } from 'react-router-dom'
import { useAppState } from '../context/AppState'
import { SectionCard } from './ui'

function ForbiddenScreen({ allowedRoles, currentRole }) {
  return (
    <div className="space-y-6 pb-8">
      <SectionCard className="bg-slate-950 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Access denied</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">You do not have access to this workspace.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
          This workspace is restricted to {allowedRoles.join(', ')} accounts. Your account is signed in as
          {' '}
          <span className="font-semibold text-white">{currentRole || 'unknown'}</span>.
        </p>
      </SectionCard>
    </div>
  )
}

function RequireRole({ allowedRoles, children }) {
  const { mode, currentUser } = useAppState()
  const location = useLocation()

  if (mode === 'local') {
    return children
  }

  if (!currentUser) {
    const next = `${location.pathname}${location.search || ''}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <ForbiddenScreen allowedRoles={allowedRoles} currentRole={currentUser.role} />
  }

  return children
}

export default RequireRole
