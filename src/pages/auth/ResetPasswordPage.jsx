import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout'
import {
  Field,
  FieldGroup,
  FormError,
  PrimaryButton,
} from '../../components/forms'
import { useAppState } from '../../context/AppState'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const token = params.get('token') || ''

  const { resetPassword } = useAppState()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (!token) {
      setError('Reset token is missing or invalid. Request a new reset link.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({ token, password })
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught?.message || 'Reset failed. The link may have expired.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Choose a new password"
      description="Pick a password you have not used elsewhere. Existing sessions will be revoked."
      footer={
        <span>
          Need a new link?{' '}
          <Link to="/forgot-password" className="font-semibold text-slate-900 underline-offset-4 hover:underline">
            Request another reset email
          </Link>
        </span>
      }
    >
      <FormError>{!token ? 'Reset token is missing. Open the link from your reset email.' : error}</FormError>

      <form onSubmit={handleSubmit} noValidate>
        <FieldGroup>
          <Field
            id="reset-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            disabled={!token}
          />
          <Field
            id="reset-confirm"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            minLength={8}
            disabled={!token}
          />
          <PrimaryButton type="submit" disabled={submitting || !token}>
            {submitting ? 'Updating password…' : 'Update password'}
          </PrimaryButton>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}

export default ResetPasswordPage
