import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Mail, RefreshCw, Trash2 } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { Badge, SectionCard, SectionHeading, StatCard, cn } from '../components/ui'
import { Field, FieldGroup, FormError, FormNotice, PrimaryButton, SecondaryButton, Select, Textarea } from '../components/forms'

const ROLE_OPTIONS = [
  { value: 'founder', label: 'Founder' },
  { value: 'student', label: 'Student' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'cfe', label: 'CFE staff' },
  { value: 'admin', label: 'Admin' },
]

const STATUS_TONES = {
  pending: 'amber',
  accepted: 'emerald',
  revoked: 'rose',
  expired: 'slate',
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function buildInvitationLink(token) {
  if (typeof window === 'undefined') {
    return `/invite/${token}`
  }
  return `${window.location.origin}/invite/${token}`
}

function InvitationsPage() {
  const { currentUser, mode, listInvitations, createInvitation, revokeInvitation } = useAppState()

  const [invitations, setInvitations] = useState([])
  const [loadPhase, setLoadPhase] = useState(mode === 'local' ? 'unsupported' : 'idle')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [latestToken, setLatestToken] = useState(null)
  const [form, setForm] = useState({
    email: '',
    role: 'student',
    ventureId: '',
    cohortId: '',
    expiresInDays: '',
    message: '',
  })

  const refresh = useCallback(async () => {
    if (mode === 'local') return
    setLoadPhase('loading')
    setError(null)
    try {
      const response = await listInvitations()
      setInvitations(response?.invitations || [])
      setLoadPhase('ready')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load invitations')
      setLoadPhase('error')
    }
  }, [listInvitations, mode])

  useEffect(() => {
    if (mode !== 'local') {
      void refresh()
    }
  }, [mode, refresh])

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setActionMessage(null)
    setLatestToken(null)

    const payload = {
      email: form.email.trim(),
      role: form.role,
    }
    if (form.ventureId.trim()) payload.ventureId = form.ventureId.trim()
    if (form.cohortId.trim()) payload.cohortId = form.cohortId.trim()
    if (form.message.trim()) payload.message = form.message.trim()
    if (form.expiresInDays.trim()) {
      const days = Number(form.expiresInDays)
      if (!Number.isFinite(days) || days < 1 || days > 60) {
        setSubmitting(false)
        setError('Expiry must be between 1 and 60 days.')
        return
      }
      payload.expiresInDays = days
    }

    try {
      const response = await createInvitation(payload)
      setLatestToken({
        email: response?.invitation?.email || payload.email,
        token: response?.token,
        link: response?.token ? buildInvitationLink(response.token) : null,
      })
      setActionMessage(`Invitation issued to ${response?.invitation?.email || payload.email}.`)
      setForm((current) => ({
        ...current,
        email: '',
        ventureId: '',
        cohortId: '',
        expiresInDays: '',
        message: '',
      }))
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not create the invitation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (invitationId) => {
    setError(null)
    setActionMessage(null)
    try {
      await revokeInvitation(invitationId)
      setActionMessage('Invitation revoked.')
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not revoke that invitation')
    }
  }

  const copyToClipboard = async (value) => {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }
    try {
      await navigator.clipboard.writeText(value)
      setActionMessage('Invitation link copied to clipboard.')
    } catch {
      setActionMessage('Copy not available in this browser. Use the link manually.')
    }
  }

  const counts = useMemo(() => {
    const totals = { pending: 0, accepted: 0, revoked: 0, expired: 0 }
    for (const invitation of invitations) {
      totals[invitation.status] = (totals[invitation.status] || 0) + 1
    }
    return totals
  }, [invitations])

  if (mode === 'local') {
    return (
      <div className="space-y-5 pb-8">
        <SectionCard>
          <SectionHeading
            eyebrow="Invitations"
            title="Available when the live API is configured"
            description="Local seed mode does not run the invitation pipeline. Connect the backend (set VITE_API_BASE_URL) to invite new members."
          />
        </SectionCard>
      </div>
    )
  }

  const canManage = currentUser && (currentUser.role === 'cfe' || currentUser.role === 'admin')

  if (!canManage) {
    return (
      <div className="space-y-5 pb-8">
        <SectionCard>
          <SectionHeading
            eyebrow="Invitations"
            title="Restricted to CFE staff"
            description="Only the CFE/admin team can issue or revoke invitations. Ask your program lead if you need access."
          />
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-8">
      <SectionCard>
        <SectionHeading
          eyebrow="Invitations"
          title="Invite people into your cohort and keep the seat list clean"
          description="Issue a magic invitation link for any role, optionally pre-attach a venture or cohort, and revoke anything that leaks before it’s accepted."
          action={
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          }
        />
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Pending" value={counts.pending} detail="Invitations sent and waiting for acceptance." accent="amber" />
          <StatCard label="Accepted" value={counts.accepted} detail="Seats already attached to a real account." accent="emerald" />
          <StatCard label="Revoked" value={counts.revoked} detail="Invitations cancelled before acceptance." accent="rose" />
          <StatCard label="Expired" value={counts.expired} detail="Invitations that timed out without acceptance." accent="cyan" />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          eyebrow="Issue invitation"
          title="Send a single invitation"
          description="The recipient gets a one-time link. Anyone with the link can claim the seat as long as they sign in with the same email."
        />

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                id="invitation-email"
                label="Recipient email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={updateField('email')}
                required
                placeholder="newperson@example.com"
              />
              <Select
                id="invitation-role"
                label="Role"
                value={form.role}
                onChange={updateField('role')}
                options={ROLE_OPTIONS}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                id="invitation-venture"
                label="Venture id (optional)"
                value={form.ventureId}
                onChange={updateField('ventureId')}
                placeholder="vnt-xxxx"
                hint="Pre-attach the user to an existing venture."
              />
              <Field
                id="invitation-cohort"
                label="Cohort id (optional)"
                value={form.cohortId}
                onChange={updateField('cohortId')}
                placeholder="cohort-2026"
                hint="Useful when the user joins without a venture yet."
              />
              <Field
                id="invitation-expiry"
                label="Expires in (days)"
                value={form.expiresInDays}
                onChange={updateField('expiresInDays')}
                placeholder="14"
                inputMode="numeric"
                hint="Defaults to 14 days. Min 1, max 60."
              />
            </div>
            <Textarea
              id="invitation-message"
              label="Personal note (optional)"
              rows={3}
              value={form.message}
              onChange={updateField('message')}
              placeholder="Quick context shown in the invitation email and accept page."
            />
            {error ? <FormError>{error}</FormError> : null}
            {latestToken ? (
              <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">Invitation link for {latestToken.email}</p>
                {latestToken.link ? (
                  <p className="break-all text-xs text-emerald-900/80">{latestToken.link}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {latestToken.link ? (
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(latestToken.link)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
                    >
                      <Copy size={12} /> Copy link
                    </button>
                  ) : null}
                  {latestToken.token ? (
                    <button
                      type="button"
                      onClick={() => void copyToClipboard(latestToken.token)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
                    >
                      <Copy size={12} /> Copy token
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-emerald-900/80">
                  This link is shown once. Save it now if you need to resend manually — the email gateway has already
                  delivered it to the recipient.
                </p>
              </div>
            ) : null}
            <PrimaryButton type="submit" disabled={submitting}>
              <Mail size={14} /> {submitting ? 'Issuing…' : 'Send invitation'}
            </PrimaryButton>
            {actionMessage && !latestToken ? <FormNotice tone="success">{actionMessage}</FormNotice> : null}
          </FieldGroup>
        </form>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          eyebrow="Recent invitations"
          title="Track every seat from issue to accept"
          description="Revoke anything you regret sending. Expired or accepted entries stay in the log so you can audit later."
        />

        {loadPhase === 'loading' ? <FormNotice>Loading invitations…</FormNotice> : null}
        {loadPhase === 'error' ? <FormError>{error || 'Could not load invitations.'}</FormError> : null}
        {loadPhase === 'ready' && invitations.length === 0 ? (
          <FormNotice>No invitations issued yet. Use the form above to send the first one.</FormNotice>
        ) : null}

        {loadPhase === 'ready' && invitations.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full table-fixed text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-1/4">Email</th>
                  <th className="px-4 py-3 w-1/6">Role</th>
                  <th className="px-4 py-3 w-1/6">Status</th>
                  <th className="px-4 py-3 w-1/4">Expires</th>
                  <th className="px-4 py-3 w-1/6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 align-top text-slate-900">
                      <div className="font-medium">{invitation.email}</div>
                      {invitation.message ? (
                        <p className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">{invitation.message}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top capitalize">{invitation.role}</td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={STATUS_TONES[invitation.status] || 'slate'}>{invitation.status}</Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-600">{formatDate(invitation.expiresAt)}</td>
                    <td className="px-4 py-3 align-top text-right">
                      {invitation.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => void handleRevoke(invitation.id)}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50',
                          )}
                        >
                          <Trash2 size={12} /> Revoke
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

export default InvitationsPage
