import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import { FormError } from '../../components/forms'
import { useAppState } from '../../context/AppState'
import { sanitizeNextPath } from '../../auth/sanitizeNextPath'

const parseGoogleCallbackParams = (search) => {
  const params = new URLSearchParams(search)
  const oauthError = params.get('error')

  if (oauthError) {
    return { code: null, state: null, error: `Google rejected the sign-in: ${oauthError}.` }
  }

  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state) {
    return { code: null, state: null, error: 'Missing OAuth code or state. Try signing in again.' }
  }

  return { code, state, error: null }
}

function GoogleCallbackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeGoogleOAuth } = useAppState()
  const calledRef = useRef(false)
  const callback = useMemo(() => parseGoogleCallbackParams(location.search), [location.search])
  const [error, setError] = useState(callback.error)

  useEffect(() => {
    if (callback.error || calledRef.current) {
      return undefined
    }
    calledRef.current = true

    let active = true
    void (async () => {
      try {
        const session = await completeGoogleOAuth({ code: callback.code, state: callback.state })
        if (!active) {
          return
        }
        navigate(sanitizeNextPath(session?.redirectAfter || '/'), { replace: true })
      } catch (caught) {
        if (!active) {
          return
        }
        setError(caught?.message || 'Google sign-in did not complete. Try again.')
      }
    })()

    return () => {
      active = false
    }
  }, [callback, completeGoogleOAuth, navigate])

  return (
    <AuthLayout
      eyebrow="Google sign-in"
      title={error ? 'Sign-in could not be completed' : 'Finishing Google sign-in'}
      description={error ? 'Use the link below to retry.' : 'Validating the Google authorization response…'}
      footer={
        <span>
          <Link to="/login" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </span>
      }
    >
      <FormError>{error}</FormError>
      {!error ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          One moment — we are exchanging the authorization code for a MentorMe session.
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default GoogleCallbackPage
