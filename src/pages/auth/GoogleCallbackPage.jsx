import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import { FormError } from '../../components/forms'
import { useAppState } from '../../context/AppState'
import { authClient } from '../../auth/authClient'

function GoogleCallbackPage() {
  const navigate = useNavigate()
  const { bootStatus } = useAppState()
  const checkedRef = useRef(false)
  const [error, setError] = useState(() => (authClient ? null : 'Auth backend is not configured.'))

  useEffect(() => {
    if (checkedRef.current) {
      return
    }
    checkedRef.current = true

    if (!authClient) {
      return
    }

    let active = true
    void (async () => {
      try {
        const session = await authClient.getSession()
        if (!active) return
        if (session?.data?.user) {
          navigate('/', { replace: true })
        } else {
          setError('Google sign-in did not complete. Try again.')
        }
      } catch (caught) {
        if (!active) return
        setError(caught?.message || 'Google sign-in did not complete. Try again.')
      }
    })()

    return () => {
      active = false
    }
  }, [navigate])

  useEffect(() => {
    if (bootStatus === 'authenticated') {
      navigate('/', { replace: true })
    }
  }, [bootStatus, navigate])

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
          One moment — completing your Google sign-in.
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default GoogleCallbackPage
