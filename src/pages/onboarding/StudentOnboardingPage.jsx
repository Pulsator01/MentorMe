import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppState } from '../../context/AppState'
import OnboardingLayout from '../../layouts/OnboardingLayout'
import {
  Field,
  FieldGroup,
  FormError,
  FormNotice,
  PrimaryButton,
  SecondaryButton,
} from '../../components/forms'
import { FullPageLoader } from '../../components/RequireAuth'
import { cn } from '../../components/ui'

const STEP_LABELS = ['Choose path', 'Confirm']

function VentureCard({ venture, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(venture.id)}
      className={cn(
        'w-full rounded-2xl border bg-white px-4 py-4 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-900',
        selected ? 'border-slate-950 ring-2 ring-slate-900' : 'border-slate-200 hover:border-slate-400',
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-950">{venture.name}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{venture.domain} · {venture.stage}</p>
        </div>
        {selected ? (
          <span className="rounded-full border border-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
            Selected
          </span>
        ) : null}
      </div>
      {venture.summary ? (
        <p className="mt-3 text-xs leading-5 text-slate-600">{venture.summary}</p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        Founded by <span className="font-medium text-slate-700">{venture.founderName}</span>
        {venture.location ? ` · ${venture.location}` : ''}
      </p>
    </button>
  )
}

function StudentOnboardingPage() {
  const {
    mode,
    currentUser,
    completeStudentOnboarding,
    getOnboardingStatus,
    getStudentJoinOptions,
  } = useAppState()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialToken = searchParams.get('token') || ''

  const shouldCheck = mode !== 'local' && Boolean(currentUser)
  const [statusPhase, setStatusPhase] = useState(() => (shouldCheck ? 'checking' : 'ready'))
  const [step, setStep] = useState(0)
  const [path, setPath] = useState(initialToken ? 'invitation' : 'venture')
  const [invitationToken, setInvitationToken] = useState(initialToken)
  const [ventures, setVentures] = useState([])
  const shouldFetchVentures = shouldCheck && path === 'venture'
  const [venturesPhase, setVenturesPhase] = useState('idle')
  const [selectedVentureId, setSelectedVentureId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const isLoadingVentures = shouldFetchVentures && venturesPhase !== 'ready' && venturesPhase !== 'error'

  useEffect(() => {
    if (!shouldCheck) {
      return undefined
    }

    let cancelled = false

    getOnboardingStatus()
      .then((response) => {
        if (cancelled) return
        if (response?.nextStep === 'completed') {
          setStatusPhase('already-onboarded')
        } else {
          setStatusPhase('ready')
        }
      })
      .catch(() => {
        if (cancelled) return
        setStatusPhase('ready')
      })

    return () => {
      cancelled = true
    }
  }, [shouldCheck, getOnboardingStatus])

  useEffect(() => {
    if (!shouldFetchVentures) {
      return undefined
    }

    let cancelled = false

    getStudentJoinOptions()
      .then((response) => {
        if (cancelled) return
        setVentures(response?.ventures || [])
        setVenturesPhase('ready')
      })
      .catch((loadError) => {
        if (cancelled) return
        setVentures([])
        setVenturesPhase('error')
        setError(loadError?.message || 'Could not load ventures in your cohort.')
      })

    return () => {
      cancelled = true
    }
  }, [shouldFetchVentures, getStudentJoinOptions])

  const stepValid = useMemo(() => {
    if (step === 0) {
      return path === 'invitation' ? invitationToken.trim().length >= 8 : Boolean(selectedVentureId)
    }
    return true
  }, [step, path, invitationToken, selectedVentureId])

  if (mode === 'local') {
    return <Navigate to="/" replace />
  }

  if (!currentUser) {
    return <Navigate to="/login?next=/onboarding/student" replace />
  }

  if (statusPhase === 'checking') {
    return <FullPageLoader message="Checking your onboarding status" />
  }

  if (statusPhase === 'already-onboarded') {
    return <Navigate to="/" replace />
  }

  const handleNext = (event) => {
    event.preventDefault()
    if (!stepValid) return
    setError(null)
    setStep((current) => Math.min(current + 1, STEP_LABELS.length - 1))
  }

  const handleBack = () => {
    setError(null)
    setStep((current) => Math.max(current - 1, 0))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stepValid || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const payload =
        path === 'invitation'
          ? { invitationToken: invitationToken.trim() }
          : { ventureId: selectedVentureId }

      await completeStudentOnboarding(payload)
      navigate('/students', { replace: true })
    } catch (submitError) {
      setError(submitError?.message || 'Could not finish onboarding. Try again in a moment.')
      setSubmitting(false)
    }
  }

  const selectedVenture = ventures.find((venture) => venture.id === selectedVentureId)

  return (
    <OnboardingLayout
      eyebrow={`Welcome, ${currentUser.name?.split(' ')[0] || 'student'}`}
      title="Join the venture you're working with"
      description="Pair your account with the venture you're supporting so you can submit mentor requests, attach artifacts, and track progress in one place."
      steps={STEP_LABELS}
      currentStep={step}
      rightSlot={(
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">How this works</p>
          <ul className="space-y-2 text-sm leading-6">
            <li>If your CFE team sent you an invitation link, paste the token here.</li>
            <li>Otherwise pick the venture in your cohort that you want to join.</li>
            <li>You can request to switch ventures any time from your dashboard.</li>
          </ul>
        </div>
      )}
      footer="MentorMe · student onboarding"
    >
      <FormError>{error}</FormError>

      <form onSubmit={step === STEP_LABELS.length - 1 ? handleSubmit : handleNext} noValidate>
        {step === 0 ? (
          <FieldGroup>
            <div className="grid gap-2 rounded-2xl bg-white p-1 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPath('venture')}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-semibold transition',
                  path === 'venture' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
                aria-pressed={path === 'venture'}
              >
                Pick a venture in my cohort
              </button>
              <button
                type="button"
                onClick={() => setPath('invitation')}
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-semibold transition',
                  path === 'invitation' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
                aria-pressed={path === 'invitation'}
              >
                I have an invitation token
              </button>
            </div>

            {path === 'venture' ? (
              <div className="space-y-3">
                {isLoadingVentures ? (
                  <FormNotice>Loading ventures in your cohort…</FormNotice>
                ) : null}
                {venturesPhase === 'ready' && ventures.length === 0 ? (
                  <FormNotice>No ventures are available in your cohort yet — ask your CFE team.</FormNotice>
                ) : null}
                <div className="space-y-3">
                  {ventures.map((venture) => (
                    <VentureCard
                      key={venture.id}
                      venture={venture}
                      selected={selectedVentureId === venture.id}
                      onSelect={setSelectedVentureId}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Field
                id="invitationToken"
                label="Invitation token"
                value={invitationToken}
                onChange={(event) => setInvitationToken(event.target.value)}
                placeholder="Paste the token from your invitation email"
                hint="The token is in the URL or email we sent. Tokens are at least 20 characters."
                required
              />
            )}
          </FieldGroup>
        ) : null}

        {step === 1 ? (
          <FieldGroup>
            <FormNotice tone="info">
              {path === 'invitation' ? (
                <>You're about to redeem an invitation token. Once accepted, the venture in your invite will appear in your dashboard.</>
              ) : selectedVenture ? (
                <>You're about to join <strong>{selectedVenture.name}</strong> as a student. You can collaborate on requests immediately.</>
              ) : null}
            </FormNotice>
          </FieldGroup>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <SecondaryButton type="button" onClick={handleBack} className="sm:w-auto">
              Back
            </SecondaryButton>
          ) : <span aria-hidden="true" />}

          {step < STEP_LABELS.length - 1 ? (
            <PrimaryButton type="submit" disabled={!stepValid} className="sm:w-auto sm:px-6">
              Continue
            </PrimaryButton>
          ) : (
            <PrimaryButton type="submit" disabled={!stepValid || submitting} className="sm:w-auto sm:px-6">
              {submitting ? 'Joining venture…' : 'Confirm and join'}
            </PrimaryButton>
          )}
        </div>
      </form>
    </OnboardingLayout>
  )
}

export default StudentOnboardingPage
