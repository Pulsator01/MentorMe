import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import AuthLayout from '../../layouts/AuthLayout'
import {
  Field,
  FieldGroup,
  FormError,
  GoogleIcon,
  PrimaryButton,
  SecondaryButton,
  Select,
} from '../../components/forms'
import { useAppState } from '../../context/AppState'

const roleOptions = [
  { value: 'founder', label: 'Founder — leading a venture or product' },
  { value: 'student', label: 'Student — supporting a venture team' },
]

function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const nextPath = params.get('next') || '/'

  const { register, startGoogleOAuth } = useAppState()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('founder')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await register({ name: name.trim(), email: email.trim(), password, role })
      navigate(nextPath, { replace: true })
    } catch (caught) {
      setError(caught?.message || 'Could not create your account. Try a different email.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    setGoogleSubmitting(true)
    try {
      const result = await startGoogleOAuth(nextPath)
      window.location.assign(result.authorizeUrl)
    } catch (caught) {
      setGoogleSubmitting(false)
      setError(caught?.message || 'Google sign-in is not available right now.')
    }
  }

  return (
    <AuthLayout
      eyebrow="Create account"
      title="Get started with MentorMe"
      description="Founders and students can self-register. Mentors and CFE staff are added by invitation."
      brandHeadline="Bring your venture into the mentor pipeline."
      brandSubheadline="Create an account, request expert mentorship, and keep every session in one auditable place."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <FormError>{error}</FormError>

      <SecondaryButton onClick={handleGoogle} disabled={googleSubmitting || submitting}>
        <GoogleIcon />
        {googleSubmitting ? 'Redirecting to Google…' : 'Continue with Google'}
      </SecondaryButton>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or use email <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field
            id="signup-name"
            label="Full name"
            autoComplete="name"
            placeholder="Priya Founder"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={120}
          />
          <Field
            id="signup-email"
            label="Work email"
            type="email"
            autoComplete="email"
            placeholder="you@company.test"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            hint="Use 12+ characters with a mix of letters, numbers, and symbols."
          />
          <Field
            id="signup-confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
          <Select
            id="signup-role"
            label="I am a"
            value={role}
            options={roleOptions}
            onChange={(event) => setRole(event.target.value)}
            required
          />
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : (
              <>
                Create account
                <ArrowRight size={16} />
              </>
            )}
          </PrimaryButton>
          <p className="text-xs leading-5 text-slate-500">
            By creating an account you agree to MentorMe&apos;s acceptable use policy and confirm that mentor data
            you upload is shared with explicit consent.
          </p>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}

export default SignupPage
