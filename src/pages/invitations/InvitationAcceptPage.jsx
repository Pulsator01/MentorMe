import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { CalendarClock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import AuthLayout from '../../layouts/AuthLayout'
import { FormError, FormNotice, PrimaryButton, SecondaryButton } from '../../components/forms'

const ROLE_LABELS = {
  founder: 'Founder',
  student: 'Student',
  cfe: 'CFE staff',
  mentor: 'Mentor',
  admin: 'Admin',
}

const STATUS_LABELS = {
  pending: { tone: 'success', message: 'This invitation is ready to accept.' },
  accepted: { tone: 'info', message: 'This invitation was already accepted.' },
  revoked: { tone: 'error', message: 'This invitation was revoked by your organization.' },
  expired: { tone: 'error', message: 'This invitation has expired. Ask for a fresh one.' },
}

function formatDate(value) {
  if (!value) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function InvitationDetail({ invitation }) {
  const role = ROLE_LABELS[invitation.role] || invitation.role
  const expiresLabel = formatDate(invitation.expiresAt)
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700">
          <Mail size={16} />
        </span>
        <div className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Invited email</p>
          <p className="mt-1 text-slate-900">{invitation.email}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700">
          <ShieldCheck size={16} />
        </span>
        <div className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Role</p>
          <p className="mt-1 text-slate-900">
            {role} · {invitation.organizationName}
          </p>
          {invitation.ventureName ? (
            <p className="mt-0.5 text-xs text-slate-600">Venture: {invitation.ventureName}</p>
          ) : null}
        </div>
      </div>
      {expiresLabel ? (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700">
            <CalendarClock size={16} />
          </span>
          <div className="text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Expires</p>
            <p className="mt-1 text-slate-900">{expiresLabel}</p>
          </div>
        </div>
      ) : null}
      {invitation.message ? (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-700">
            <Sparkles size={16} />
          </span>
          <div className="text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">From your inviter</p>
            <p className="mt-1 whitespace-pre-line text-slate-900">{invitation.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function InvitationAcceptPage() {
  const { mode, currentUser, previewInvitation, acceptInvitation } = useAppState()
  const navigate = useNavigate()
  const { token } = useParams()

  const shouldFetch = Boolean(token) && mode !== 'local'

  const [phase, setPhase] = useState(() => {
    if (!token) return 'error'
    if (mode === 'local') return 'ready'
    return 'loading'
  })
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState(token ? null : 'Missing invitation token in the URL.')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!shouldFetch) {
      return undefined
    }

    let cancelled = false

    previewInvitation(token)
      .then((response) => {
        if (cancelled) return
        setInvitation(response?.invitation || null)
        setPhase('ready')
      })
      .catch((nextError) => {
        if (cancelled) return
        setError(nextError instanceof Error ? nextError.message : 'Unable to load invitation')
        setPhase('error')
      })

    return () => {
      cancelled = true
    }
  }, [shouldFetch, token, previewInvitation])

  const statusMeta = useMemo(() => {
    if (!invitation) return null
    return STATUS_LABELS[invitation.status] || STATUS_LABELS.pending
  }, [invitation])

  if (mode === 'local') {
    return <Navigate to="/" replace />
  }

  const nextParam = token ? `?next=${encodeURIComponent(`/invite/${token}`)}` : ''
  const emailMismatch =
    currentUser && invitation && currentUser.email.toLowerCase() !== invitation.email.toLowerCase()

  const handleAccept = async () => {
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      await acceptInvitation(token)
      navigate('/', { replace: true })
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to accept this invitation')
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      allowAuthenticated
      eyebrow="Invitation"
      title="You were invited to MentorMe"
      description="Confirm the invitation details, sign in or create your account, and we’ll attach your seat to the right organization."
    >
      {phase === 'loading' ? (
        <FormNotice>Loading invitation details…</FormNotice>
      ) : null}

      {phase === 'error' ? <FormError>{error || 'Invitation could not be loaded.'}</FormError> : null}

      {phase === 'ready' && invitation ? (
        <div className="space-y-5">
          <InvitationDetail invitation={invitation} />

          {statusMeta ? (
            <FormNotice tone={statusMeta.tone === 'error' ? 'info' : statusMeta.tone}>
              {statusMeta.message}
            </FormNotice>
          ) : null}

          {invitation.status === 'pending' ? (
            <>
              {error ? <FormError>{error}</FormError> : null}
              {currentUser ? (
                <div className="space-y-3">
                  {emailMismatch ? (
                    <FormError>
                      You’re signed in as {currentUser.email}, but this invitation is for {invitation.email}.
                      Sign out and sign in with the invited address to continue.
                    </FormError>
                  ) : null}
                  <PrimaryButton
                    type="button"
                    onClick={handleAccept}
                    disabled={submitting || Boolean(emailMismatch)}
                  >
                    {submitting ? 'Accepting…' : 'Accept invitation and continue'}
                  </PrimaryButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <FormNotice>
                    Sign in with <strong>{invitation.email}</strong> to attach this seat to your account.
                    If you don’t have one yet, create it first — we’ll come back to this page automatically.
                  </FormNotice>
                  <PrimaryButton
                    type="button"
                    onClick={() => navigate(`/login${nextParam}`)}
                  >
                    Sign in to accept
                  </PrimaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => navigate(`/signup${nextParam}`)}
                  >
                    Create an account
                  </SecondaryButton>
                </div>
              )}
            </>
          ) : (
            <SecondaryButton type="button" onClick={() => navigate('/login')}>
              Back to sign in
            </SecondaryButton>
          )}

          <p className="text-center text-xs text-slate-500">
            Have questions? <Link to="/login" className="font-semibold text-slate-700 hover:text-slate-950">Talk to your CFE team</Link>.
          </p>
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default InvitationAcceptPage
