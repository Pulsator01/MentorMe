import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppState } from '../context/AppState'
import { FullPageLoader } from './RequireAuth'

const PATH_FOR_NEXT_STEP = {
  founder_venture_details: '/onboarding/founder',
  student_join_venture: '/onboarding/student',
}

const ONBOARDING_PATHS = new Set(Object.values(PATH_FOR_NEXT_STEP))

function RequireOnboarded({ children }) {
  const { mode, currentUser, getOnboardingStatus } = useAppState()
  const location = useLocation()

  const shouldFetch = useMemo(() => {
    if (mode === 'local' || !currentUser) return false
    if (ONBOARDING_PATHS.has(location.pathname)) return false
    return true
  }, [mode, currentUser, location.pathname])

  const [status, setStatus] = useState(() =>
    shouldFetch ? { phase: 'loading', nextStep: null, error: null } : { phase: 'ready', nextStep: 'completed', error: null },
  )

  useEffect(() => {
    if (!shouldFetch) {
      return undefined
    }

    let cancelled = false
    // Reset to loading whenever we enter the "must verify onboarding" branch (e.g. after finishing onboarding routes).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional transition; avoids flashing stale "ready" state.
    setStatus({ phase: 'loading', nextStep: null, error: null })

    getOnboardingStatus()
      .then((response) => {
        if (cancelled) return
        setStatus({ phase: 'ready', nextStep: response?.nextStep || 'completed', error: null })
      })
      .catch((err) => {
        if (cancelled) return
        const message = err?.message || 'We could not verify your onboarding status.'
        setStatus({ phase: 'error', nextStep: null, error: message })
      })

    return () => {
      cancelled = true
    }
  }, [shouldFetch, getOnboardingStatus])

  if (mode === 'local') {
    return children
  }

  if (status.phase === 'loading') {
    return <FullPageLoader message="Preparing your workspace" />
  }

  if (status.phase === 'error') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="max-w-md text-sm leading-6 text-slate-600">{status.error}</p>
        <button
          type="button"
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => {
            setStatus({ phase: 'loading', nextStep: null, error: null })
            void getOnboardingStatus()
              .then((response) => {
                setStatus({ phase: 'ready', nextStep: response?.nextStep || 'completed', error: null })
              })
              .catch((err) => {
                const message = err?.message || 'We could not verify your onboarding status.'
                setStatus({ phase: 'error', nextStep: null, error: message })
              })
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const redirect = PATH_FOR_NEXT_STEP[status.nextStep]
  if (redirect && location.pathname !== redirect) {
    return <Navigate to={redirect} replace />
  }

  return children
}

export default RequireOnboarded
