import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

const MotionDiv = motion.div
import { CalendarCheck2, CheckCircle2, Clock3, Link2, MessagesSquare, ShieldCheck, XCircle } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { Badge, SectionCard, SectionHeading, StatCard } from '../components/ui'

const formatFullDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const toDatetimeLocal = (value) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function MentorDashboard() {
  const {
    mode,
    mentors,
    requests,
    getMentorAction,
    respondToMentorAction,
    scheduleMentorAction,
    saveMentorActionFeedback,
  } = useAppState()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState('')
  const [flashMessage, setFlashMessage] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [submittingDecision, setSubmittingDecision] = useState(false)
  const [submittingSchedule, setSubmittingSchedule] = useState(false)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [scheduleDraft, setScheduleDraft] = useState({
    calendlyLink: '',
    meetingAt: '',
  })
  const [feedbackDraft, setFeedbackDraft] = useState({
    mentorNotes: '',
    nextStepRequired: true,
    secondSessionRecommended: false,
  })

  useEffect(() => {
    if (!token) {
      setLoading(false)

      if (mode !== 'api') {
        const localRequest = requests.find((request) => request.status === 'awaiting_mentor') || requests[0]
        const localMentor = mentors.find((mentor) => mentor.id === localRequest?.mentorId) || mentors[0]

        if (localRequest && localMentor) {
          setDetail({
            mentor: localMentor,
            mentorAction: {
              purpose: 'mentor_request',
              response: localRequest.status === 'awaiting_mentor' ? undefined : 'accepted',
            },
            request: localRequest,
          })
          setScheduleDraft({
            calendlyLink: localRequest.calendlyLink || localMentor.calendly || '',
            meetingAt: toDatetimeLocal(localRequest.meetingAt),
          })
          setFeedbackDraft((current) => ({
            ...current,
            mentorNotes: localRequest.mentorNotes || '',
          }))
        }
      }

      return undefined
    }

    let active = true
    setLoading(true)
    setError('')

    const load = async () => {
      try {
        const body = await getMentorAction(token)

        if (!active) {
          return
        }

        setDetail(body)
        setScheduleDraft({
          calendlyLink: body.request.calendlyLink || body.mentor.calendly || '',
          meetingAt: toDatetimeLocal(body.request.meetingAt),
        })
        setFeedbackDraft({
          mentorNotes: body.request.mentorNotes || '',
          nextStepRequired: true,
          secondSessionRecommended: false,
        })
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load the mentor action link.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [getMentorAction, mentors, mode, requests, token])

  const mentor = detail?.mentor
  const request = detail?.request
  const mentorAction = detail?.mentorAction
  const response = mentorAction?.response
  const hasToken = Boolean(token)
  const canSchedule = hasToken && response === 'accepted' && request?.status === 'awaiting_mentor'
  const canLeaveFeedback = hasToken && ['scheduled', 'follow_up'].includes(request?.status || '')

  const handleDecision = async (decision) => {
    if (!hasToken) {
      return
    }

    setSubmittingDecision(true)
    setError('')

    try {
      const body = await respondToMentorAction(token, {
        decision,
        ...(decision === 'declined' ? { reason: decisionReason } : {}),
      })

      setDetail((current) => ({
        ...current,
        mentorAction: {
          ...current.mentorAction,
          response: decision,
          respondedAt: new Date().toISOString(),
          responseReason: decision === 'declined' ? decisionReason : '',
        },
        request: body.request,
      }))
      setFlashMessage(
        decision === 'accepted'
          ? 'Request accepted. You can share a slot now.'
          : 'Request declined. CFE will keep the request in the routing queue.',
      )
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to record the mentor response.')
    } finally {
      setSubmittingDecision(false)
    }
  }

  const handleSchedule = async () => {
    if (!canSchedule) {
      return
    }

    setSubmittingSchedule(true)
    setError('')

    try {
      const body = await scheduleMentorAction(token, {
        calendlyLink: scheduleDraft.calendlyLink,
        meetingAt: new Date(scheduleDraft.meetingAt).toISOString(),
      })

      setDetail((current) => ({
        ...current,
        request: body.request,
      }))
      setFlashMessage(`Session confirmed for ${formatFullDate(body.request.meetingAt)}`)
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : 'Unable to schedule this request.')
    } finally {
      setSubmittingSchedule(false)
    }
  }

  const handleFeedback = async () => {
    if (!canLeaveFeedback) {
      return
    }

    setSubmittingFeedback(true)
    setError('')

    try {
      const body = await saveMentorActionFeedback(token, feedbackDraft)
      setDetail((current) => ({
        ...current,
        request: body.request,
      }))
      setFlashMessage('Feedback saved and shared with CFE.')
    } catch (feedbackError) {
      setError(feedbackError instanceof Error ? feedbackError.message : 'Unable to save mentor feedback.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (!hasToken && mode === 'api') {
    return (
      <div className="space-y-6 pb-10">
        <SectionCard className="bg-slate-950 text-white sm:p-10">
          <Badge tone="amber">Secure mentor desk</Badge>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Open this page from a CFE-generated secure link.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-300">
            Generate a link from the CFE workspace, then open it here to accept or decline the request, schedule the meeting, and leave feedback.
          </p>
          <div className="mt-8">
            <Link
              to="/cfe"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              Back to CFE workspace
            </Link>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 pb-10"
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard className="bg-slate-950 text-white sm:p-10">
          <Badge tone="amber">Mentor Desk</Badge>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Review one vetted request without the admin clutter.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-300">
            Decide quickly, share a slot, and leave one useful note after the meeting.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Response"
              value={response ? response : loading ? 'Loading' : 'Pending'}
              detail="Accept or decline without needing a login."
              accent="amber"
            />
            <StatCard
              label="Status"
              value={request ? request.status.replace('_', ' ') : 'Waiting'}
              detail="Updates as you schedule and submit feedback."
              accent="cyan"
            />
            <StatCard
              label="Artifacts"
              value={request?.artifactList?.length || 0}
              detail="Context attached before you engage."
              accent="emerald"
            />
          </div>
        </SectionCard>

        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mentor context</p>
          {loading ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
              Loading mentor request...
            </div>
          ) : mentor ? (
            <>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{mentor.name}</h2>
                  <p className="mt-2 text-[15px] leading-7 text-slate-500">{mentor.title}</p>
                </div>
                <Badge tone="blue">{mentor.tolerance} tolerance</Badge>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500">{mentor.bio}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {mentor.focus.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
              No mentor request is loaded yet.
            </div>
          )}
        </SectionCard>
      </div>

      {flashMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
          {flashMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <SectionHeading
            eyebrow="Request summary"
            title={request ? request.ventureName : 'Waiting for a secure link'}
            description="The problem, desired outcome, and supporting material."
          />

          {request ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-lg font-semibold text-slate-950">{request.ventureName}</h3>
                      <Badge tone="amber">{request.stage}</Badge>
                      <Badge tone="blue">{request.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{request.challenge}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-950">TRL {request.trl}</p>
                    <p className="mt-1 text-slate-500">BRL {request.brl}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-slate-600">{request.desiredOutcome}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {request.artifactList.map((artifact) => (
                    <Badge key={`${request.id}-${artifact}`} tone="blue">
                      {artifact}
                    </Badge>
                  ))}
                </div>
              </div>

              {!response && hasToken ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <SectionHeading
                    eyebrow="Decision"
                    title="Respond to the outreach"
                    description="If you decline, CFE keeps the request in routing."
                  />
                  <label className="mt-4 block">
                    <span className="text-sm font-medium text-slate-700">Decline reason</span>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                      value={decisionReason}
                      onChange={(event) => setDecisionReason(event.target.value)}
                      placeholder="Optional unless you decline"
                    />
                  </label>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={submittingDecision}
                      onClick={() => void handleDecision('accepted')}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                    >
                      <CheckCircle2 size={16} />
                      Accept request
                    </button>
                    <button
                      type="button"
                      disabled={submittingDecision || !decisionReason.trim()}
                      onClick={() => void handleDecision('declined')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Decline request
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-400">
              Open the desk from a secure mentor link to load a specific request.
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard>
            <SectionHeading
              eyebrow="Scheduling"
              title="Share the meeting slot"
              description="Sends details back into the CFE pipeline."
            />

            {request ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Link2 size={16} />
                    Meeting link
                  </span>
                  <input
                    value={scheduleDraft.calendlyLink}
                    onChange={(event) => setScheduleDraft((current) => ({ ...current, calendlyLink: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  />
                </label>
                <label className="block">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Clock3 size={16} />
                    Meeting slot
                  </span>
                  <input
                    type="datetime-local"
                    value={scheduleDraft.meetingAt}
                    onChange={(event) => setScheduleDraft((current) => ({ ...current, meetingAt: event.target.value }))}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  />
                </label>
                <button
                  type="button"
                  disabled={!canSchedule || submittingSchedule || !scheduleDraft.calendlyLink || !scheduleDraft.meetingAt}
                  onClick={() => void handleSchedule()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <CalendarCheck2 size={16} />
                  {submittingSchedule ? 'Saving slot...' : 'Share slot'}
                </button>
                {request.meetingAt ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                    Meeting confirmed for {formatFullDate(request.meetingAt)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard>
            <SectionHeading
              eyebrow="After the call"
              title="Leave one useful feedback note"
              description="Helps CFE decide on follow-up, another mentor, or a second session."
            />
            {request ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <MessagesSquare size={16} />
                    Mentor notes
                  </span>
                  <textarea
                    value={feedbackDraft.mentorNotes}
                    onChange={(event) =>
                      setFeedbackDraft((current) => ({
                        ...current,
                        mentorNotes: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                    placeholder="What changed after the conversation?"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={feedbackDraft.nextStepRequired}
                    onChange={(event) =>
                      setFeedbackDraft((current) => ({
                        ...current,
                        nextStepRequired: event.target.checked,
                      }))
                    }
                  />
                  A clear next step is required from the founder or CFE
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={feedbackDraft.secondSessionRecommended}
                    onChange={(event) =>
                      setFeedbackDraft((current) => ({
                        ...current,
                        secondSessionRecommended: event.target.checked,
                      }))
                    }
                  />
                  Recommend a second mentor session
                </label>
                <button
                  type="button"
                  disabled={!canLeaveFeedback || submittingFeedback || feedbackDraft.mentorNotes.trim().length < 5}
                  onClick={() => void handleFeedback()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <ShieldCheck size={16} />
                  {submittingFeedback ? 'Saving note...' : 'Save feedback'}
                </button>
              </div>
            ) : null}
          </SectionCard>
        </div>
      </div>
    </MotionDiv>
  )
}

export default MentorDashboard
