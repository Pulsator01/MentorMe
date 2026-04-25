import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import {
  Field,
  FieldGroup,
  FormError,
  FormNotice,
  PrimaryButton,
} from '../../components/forms'
import { useAppState } from '../../context/AppState'

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { forgotPassword } = useAppState()

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      const response = await forgotPassword(email.trim())
      if (response?.debugToken) {
        navigate(`/reset-password?token=${encodeURIComponent(response.debugToken)}`, { replace: true })
        return
      }
      setInfo('If an account exists for that email, a reset link is on its way.')
    } catch (caught) {
      setError(caught?.message || 'Could not send reset email. Try again in a minute.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Send a reset link"
      description="We will email you a link to set a new password. The link is valid for one hour."
      footer={
        <span>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </span>
      }
    >
      <FormError>{error}</FormError>
      <FormNotice tone="success">{info}</FormNotice>

      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field
            id="forgot-email"
            label="Account email"
            type="email"
            autoComplete="email"
            placeholder="you@company.test"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Sending reset link…' : 'Send reset link'}
          </PrimaryButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
