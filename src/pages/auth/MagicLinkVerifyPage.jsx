import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import { FormError } from '../../components/forms'
import { useAppState } from '../../context/AppState'

const parseMagicLinkParams = (search) => {
  const params = new URLSearchParams(search)
  const token = params.get('token')
  const next = params.get('next') || '/'

  if (!token) {
    return { token: null, next, error: 'No magic-link token was provided.' }
  }

  return { token, next, error: null }
}

function MagicLinkVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyMagicLink } = useAppState()
  const calledRef = useRef(false)
  const verification = useMemo(() => parseMagicLinkParams(location.search), [location.search])
  const [error, setError] = useState(verification.error)

  useEffect(() => {
    if (verification.error || calledRef.current) {
      return undefined
    }
    calledRef.current = true

    let active = true
    void (async () => {
      try {
        await verifyMagicLink(verification.token)
        if (!active) {
          return
        }
        navigate(verification.next, { replace: true })
      } catch (caught) {
        if (!active) {
          return
        }
        setError(caught?.message || 'This magic link is no longer valid. Request a new one.')
      }
    })()

    return () => {
      active = false
    }
  }, [verification, verifyMagicLink, navigate])

  return (
    <AuthLayout
      eyebrow="Magic link"
      title={error ? 'Magic link expired' : 'Signing you in'}
      description={error ? 'Use the link below to request a fresh one.' : 'Verifying your sign-in token…'}
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
          One moment — your magic link is being verified.
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default MagicLinkVerifyPage
