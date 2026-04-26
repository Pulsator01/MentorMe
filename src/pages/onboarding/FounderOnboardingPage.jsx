import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppState } from '../../context/AppState'
import OnboardingLayout from '../../layouts/OnboardingLayout'
import {
  Field,
  FieldGroup,
  FormError,
  FormNotice,
  PrimaryButton,
  SecondaryButton,
  Select,
  Textarea,
} from '../../components/forms'
import { FullPageLoader } from '../../components/RequireAuth'

const STAGE_OPTIONS = [
  { value: 'Idea', label: 'Idea / discovery' },
  { value: 'Prototype', label: 'Prototype build' },
  { value: 'TRL 4', label: 'TRL 4 — early validation' },
  { value: 'TRL 6', label: 'TRL 6 — pilot ready' },
  { value: 'Pilot', label: 'Pilot in progress' },
  { value: 'Scale', label: 'Scaling commercial deployment' },
]

const TRL_OPTIONS = Array.from({ length: 9 }, (_, index) => ({
  value: String(index + 1),
  label: `TRL ${index + 1}`,
}))

const BRL_OPTIONS = Array.from({ length: 9 }, (_, index) => ({
  value: String(index + 1),
  label: `BRL ${index + 1}`,
}))

const STEP_LABELS = ['Venture details', 'Stage & location', 'Mission']

function FounderOnboardingPage() {
  const { mode, currentUser, completeFounderOnboarding, getOnboardingStatus } = useAppState()
  const navigate = useNavigate()

  const shouldCheck = mode !== 'local' && Boolean(currentUser)
  const [statusPhase, setStatusPhase] = useState(() => (shouldCheck ? 'checking' : 'ready'))
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    ventureName: '',
    domain: '',
    stage: 'TRL 4',
    trl: '4',
    brl: '3',
    location: '',
    summary: '',
    nextMilestone: '',
  })

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

  const stepValid = useMemo(() => {
    if (step === 0) {
      return form.ventureName.trim().length >= 2 && form.domain.trim().length >= 2
    }
    if (step === 1) {
      return form.stage.trim().length >= 2 && Number(form.trl) >= 1 && Number(form.brl) >= 1
    }
    return form.summary.trim().length >= 20 && form.nextMilestone.trim().length >= 5
  }, [step, form])

  if (mode === 'local') {
    return <Navigate to="/" replace />
  }

  if (!currentUser) {
    return <Navigate to="/login?next=/onboarding/founder" replace />
  }

  if (statusPhase === 'checking') {
    return <FullPageLoader message="Checking your onboarding status" />
  }

  if (statusPhase === 'already-onboarded') {
    return <Navigate to="/" replace />
  }

  const updateField = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
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
      await completeFounderOnboarding({
        ventureName: form.ventureName.trim(),
        domain: form.domain.trim(),
        stage: form.stage.trim(),
        trl: Number(form.trl),
        brl: Number(form.brl),
        location: form.location.trim() || undefined,
        summary: form.summary.trim(),
        nextMilestone: form.nextMilestone.trim(),
      })
      navigate('/founders', { replace: true })
    } catch (submitError) {
      setError(submitError?.message || 'Could not finish onboarding. Try again in a moment.')
      setSubmitting(false)
    }
  }

  return (
    <OnboardingLayout
      eyebrow={`Welcome, ${currentUser.name?.split(' ')[0] || 'founder'}`}
      title="Tell us about your venture"
      description="Set up your venture profile so the CFE team and your mentors can match you with the right next steps. You can refine these details any time."
      steps={STEP_LABELS}
      currentStep={step}
      rightSlot={(
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">What happens next</p>
          <ul className="space-y-2 text-sm leading-6">
            <li>Your venture appears in the founder workspace and is visible to CFE.</li>
            <li>You can submit mentor requests, attach artifacts, and track decisions.</li>
            <li>Edit venture details from your dashboard whenever your story evolves.</li>
          </ul>
        </div>
      )}
      footer="MentorMe · venture wizard"
    >
      <FormError>{error}</FormError>

      <form onSubmit={step === STEP_LABELS.length - 1 ? handleSubmit : handleNext} noValidate>
        <FieldGroup>
          {step === 0 ? (
            <>
              <Field
                id="ventureName"
                label="Venture name"
                placeholder="EcoDrone Systems"
                value={form.ventureName}
                onChange={updateField('ventureName')}
                required
                autoComplete="organization"
              />
              <Field
                id="domain"
                label="Primary domain"
                placeholder="Climate hardware"
                value={form.domain}
                onChange={updateField('domain')}
                required
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Select
                id="stage"
                label="Current stage"
                value={form.stage}
                onChange={updateField('stage')}
                options={STAGE_OPTIONS}
                required
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  id="trl"
                  label="Technology readiness (TRL)"
                  value={form.trl}
                  onChange={updateField('trl')}
                  options={TRL_OPTIONS}
                  required
                />
                <Select
                  id="brl"
                  label="Business readiness (BRL)"
                  value={form.brl}
                  onChange={updateField('brl')}
                  options={BRL_OPTIONS}
                  required
                />
              </div>
              <Field
                id="location"
                label="Where are you based?"
                placeholder="Bengaluru, India"
                value={form.location}
                onChange={updateField('location')}
                hint="Helps us match mentors in your timezone."
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Textarea
                id="summary"
                label="One-paragraph summary"
                value={form.summary}
                onChange={updateField('summary')}
                placeholder="What does your venture do, who is it for, and why now?"
                hint={`${form.summary.trim().length} / 20 minimum characters`}
                required
              />
              <Textarea
                id="nextMilestone"
                label="Next milestone"
                rows={3}
                value={form.nextMilestone}
                onChange={updateField('nextMilestone')}
                placeholder="Sign first paid pilot site by end of quarter"
                required
              />
            </>
          ) : null}

          <FormNotice tone="info">
            Step {step + 1} of {STEP_LABELS.length}. Your information saves only when you finish the wizard.
          </FormNotice>
        </FieldGroup>

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
              {submitting ? 'Saving venture…' : 'Complete onboarding'}
            </PrimaryButton>
          )}
        </div>
      </form>
    </OnboardingLayout>
  )
}

export default FounderOnboardingPage
