import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import {
  Field,
  FieldGroup,
  FormError,
  FormNotice,
  GoogleIcon,
  PrimaryButton,
  SecondaryButton,
} from '../../components/forms'
import { useAppState } from '../../context/AppState'
import { sanitizeNextPath } from '../../auth/sanitizeNextPath'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const nextPath = sanitizeNextPath(params.get('next'))

  const { login, startGoogleOAuth, requestMagicLink, verifyMagicLink } = useAppState()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [magicSubmitting, setMagicSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate(nextPath, { replace: true })
    } catch (caught) {
      setError(caught?.message || 'Sign in failed. Check your email and password.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setInfo(null)
    setGoogleSubmitting(true)
    try {
      const result = await startGoogleOAuth(nextPath)
      window.location.assign(result.authorizeUrl)
    } catch (caught) {
      setGoogleSubmitting(false)
      setError(caught?.message || 'Google sign-in is not available right now.')
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setInfo(null)
    if (!email.trim()) {
      setError('Enter your email above to receive a magic link.')
      return
    }
    setMagicSubmitting(true)
    try {
      const response = await requestMagicLink(email.trim())
      if (response?.debugToken) {
        await verifyMagicLink(response.debugToken)
        navigate(nextPath, { replace: true })
        return
      }
      setInfo('Check your inbox for a sign-in link.')
    } catch (caught) {
      setError(caught?.message || 'Could not send magic link. Try again later.')
    } finally {
      setMagicSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to MentorMe"
      description="Use your email and password, continue with Google, or request a magic link."
      footer={(
        <span className="block space-y-2 text-center leading-6">
          <span className="block">
            New here?{' '}
            <Link to="/signup" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
              Create an account
            </Link>
          </span>
          <span className="block text-slate-600">
            <Link to="/welcome" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
              What is MentorMe?
            </Link>
          </span>
        </span>
      )}
    >
      <FormError>{error}</FormError>
      <FormNotice tone="info">{info}</FormNotice>

      <SecondaryButton
        onClick={handleGoogle}
        disabled={googleSubmitting || submitting}
        aria-label="Continue with Google"
      >
        <GoogleIcon />
        {googleSubmitting ? 'Redirecting to Google…' : 'Continue with Google'}
      </SecondaryButton>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or use email <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field
            id="login-email"
            label="Work email"
            type="email"
            autoComplete="email"
            placeholder="founder@mentorme.test"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
          <div className="flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="font-semibold text-slate-700 hover:text-slate-950">
              Forgot password?
            </Link>
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={magicSubmitting || submitting}
              className="inline-flex items-center gap-1 font-semibold text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Mail size={14} />
              {magicSubmitting ? 'Sending magic link…' : 'Send magic link'}
            </button>
          </div>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : (
              <>
                Sign in
                <ArrowRight size={16} />
              </>
            )}
          </PrimaryButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
