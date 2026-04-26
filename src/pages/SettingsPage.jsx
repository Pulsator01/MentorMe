import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { Badge, SectionCard, SectionHeading, cn } from '../components/ui'
import {
  Field,
  FieldGroup,
  FormError,
  FormNotice,
  PrimaryButton,
  SecondaryButton,
} from '../components/forms'

const ROLE_LABELS = {
  founder: 'Founder',
  student: 'Student',
  cfe: 'CFE Admin',
  admin: 'Workspace Admin',
  mentor: 'Mentor',
}

const formatRoleLabel = (role) => ROLE_LABELS[role] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Account')

const formatDate = (iso) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function SettingsPage() {
  const { currentUser, mode, changePassword, logout } = useAppState()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  const apiMode = mode === 'api'

  const handleChangePassword = async (event) => {
    event.preventDefault()
    setError(null)
    setInfo(null)

    if (!apiMode) {
      setError('Password changes require the live API backend.')
      return
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.')
      return
    }

    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setInfo('Password updated. Existing sessions on other devices were signed out.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (caught) {
      setError(caught?.message || 'Could not update password. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    if (!apiMode) {
      return
    }
    setSigningOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Settings</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Manage your account and credentials.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Keep your password fresh, double-check your role, and sign out cleanly when you are done.
            </p>
          </div>
          <Badge tone={apiMode ? 'emerald' : 'amber'}>
            {apiMode ? 'Live API session' : 'Local demo mode'}
          </Badge>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Profile"
            title="Account information"
            description="Your name, email, and workspace role. Profile updates are managed by the CFE team during onboarding."
          />

          {currentUser ? (
            <dl className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <UserRound size={14} aria-hidden="true" />
                  Display name
                </dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">{currentUser.name}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <ShieldCheck size={14} aria-hidden="true" />
                  Email
                </dt>
                <dd className="mt-2 text-base text-slate-800">{currentUser.email}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <Activity size={14} aria-hidden="true" />
                  Role
                </dt>
                <dd className="mt-2 inline-flex items-center gap-2">
                  <Badge tone="blue">{formatRoleLabel(currentUser.role)}</Badge>
                  {currentUser.onboardedAt ? (
                    <span className="text-xs text-slate-500">
                      Onboarded {formatDate(currentUser.onboardedAt)}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600">
              You are browsing the local demo. Sign in to manage real account credentials.
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Security"
            title="Change password"
            description="Use a passphrase you do not reuse anywhere else. Other devices will be signed out automatically."
          />

          {!apiMode ? (
            <FormNotice tone="info">
              Password changes need the live API backend. Set <code>VITE_API_BASE_URL</code> for this build to enable real auth.
            </FormNotice>
          ) : null}

          <form
            onSubmit={handleChangePassword}
            noValidate
            className={cn('mt-4 space-y-4', !apiMode ? 'opacity-60' : '')}
            aria-disabled={!apiMode}
          >
            <FormError>{error}</FormError>
            <FormNotice tone="success">{info}</FormNotice>

            <FieldGroup>
              <Field
                id="settings-current-password"
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                disabled={!apiMode}
              />
              <Field
                id="settings-new-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                hint="Use at least 8 characters."
                required
                disabled={!apiMode}
              />
              <Field
                id="settings-confirm-password"
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={!apiMode}
              />
              <PrimaryButton type="submit" disabled={submitting || !apiMode}>
                <KeyRound size={14} aria-hidden="true" />
                {submitting ? 'Updating password…' : 'Update password'}
              </PrimaryButton>
            </FieldGroup>
          </form>
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Session"
          title="Sign out"
          description="Ends this browser session. Sessions on other devices are not affected unless you also reset your password."
        />
        <SecondaryButton
          type="button"
          onClick={handleSignOut}
          disabled={!apiMode || signingOut}
          className="md:w-auto md:px-6"
        >
          <LogOut size={14} aria-hidden="true" />
          {signingOut ? 'Signing out…' : 'Sign out of MentorMe'}
        </SecondaryButton>
      </SectionCard>
    </div>
  )
}

export default SettingsPage
