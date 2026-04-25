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
    shouldFetch ? { phase: 'loading', nextStep: null } : { phase: 'ready', nextStep: 'completed' },
  )

  useEffect(() => {
    if (!shouldFetch) {
      return undefined
    }

    let cancelled = false

    getOnboardingStatus()
      .then((response) => {
        if (cancelled) return
        setStatus({ phase: 'ready', nextStep: response?.nextStep || 'completed' })
      })
      .catch(() => {
        if (cancelled) return
        setStatus({ phase: 'ready', nextStep: 'completed' })
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

  const redirect = PATH_FOR_NEXT_STEP[status.nextStep]
  if (redirect && location.pathname !== redirect) {
    return <Navigate to={redirect} replace />
  }

  return children
}

export default RequireOnboarded
