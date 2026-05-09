import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
    getCurrentMentorActions,
    respondToMentorAction,
    respondToMentorRequest,
    scheduleMentorAction,
    scheduleMentorRequest,
    saveMentorActionFeedback,
    saveMentorRequestFeedback,
  } = useAppState()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [detail, setDetail] = useState(null)
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
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
  const getCurrentMentorActionsRef = useRef(getCurrentMentorActions)

  useEffect(() => {
    getCurrentMentorActionsRef.current = getCurrentMentorActions
  }, [getCurrentMentorActions])

  const applyDetail = (body) => {
    setDetail(body)
    setScheduleDraft({
      calendlyLink: body.request?.calendlyLink || body.mentor?.calendly || body.mentor?.calendlyUrl || '',
      meetingAt: toDatetimeLocal(body.request?.meetingAt),
    })
    setFeedbackDraft({
      mentorNotes: body.request?.mentorNotes || '',
      nextStepRequired: true,
      secondSessionRecommended: false,
    })
  }

  useEffect(() => {
    if (token) {
      return undefined
    }

    if (mode === 'api') {
      return undefined
    }

    const localRequest = requests.find((item) => item.status === 'awaiting_mentor') || requests[0]
    const localMentor = mentors.find((item) => item.id === localRequest?.mentorId) || mentors[0]

    if (localRequest && localMentor) {
      const localDetail = {
        mentor: localMentor,
        mentorAction: {
          purpose: 'mentor_request',
          response: ['scheduled', 'follow_up', 'closed'].includes(localRequest.status) ? 'accepted' : undefined,
        },
        request: localRequest,
      }
      setActions([localDetail])
      applyDetail(localDetail)
    } else {
      setDetail(null)
      setActions([])
    }

    setLoading(false)
    setError('')
    return undefined
  }, [mentors, mode, requests, token])

  useEffect(() => {
    if (token || mode !== 'api') {
      return undefined
    }

    let active = true
    setLoading(true)
    setError('')

    const load = async () => {
      try {
        const body = await getCurrentMentorActionsRef.current()

        if (!active) {
          return
        }

        const nextActions = body.actions || []
        setActions(nextActions)
        if (nextActions[0]) {
          applyDetail({ mentor: body.mentor, ...nextActions[0] })
        } else {
          setDetail(body.mentor ? { mentor: body.mentor, mentorAction: null, request: null } : null)
        }
      } catch (loadError) {
        if (!active) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : 'Unable to load your mentor workspace.')
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
  }, [mode, token])

  useEffect(() => {
    if (!token) {
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

        setActions([{ mentorAction: body.mentorAction, request: body.request }])
        applyDetail(body)
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
  }, [getMentorAction, token])

  const mentor = detail?.mentor
  const request = detail?.request
  const mentorAction = detail?.mentorAction
  const response = mentorAction?.response
  const hasToken = Boolean(token)
  const hasLoadedRequest = Boolean(request?.id)
  const canSchedule = hasLoadedRequest && response === 'accepted' && request?.status === 'awaiting_mentor'
  const canLeaveFeedback = hasLoadedRequest && ['scheduled', 'follow_up'].includes(request?.status || '')

  const handleDecision = async (decision) => {
    if (!request?.id) {
      return
    }

    setSubmittingDecision(true)
    setError('')

    try {
      const payload = {
        decision,
        ...(decision === 'declined' ? { reason: decisionReason } : {}),
      }
      const body = hasToken
        ? await respondToMentorAction(token, payload)
        : await respondToMentorRequest(request.id, payload)

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
      const payload = {
        calendlyLink: scheduleDraft.calendlyLink,
        meetingAt: new Date(scheduleDraft.meetingAt).toISOString(),
      }
      const body = hasToken
        ? await scheduleMentorAction(token, payload)
        : await scheduleMentorRequest(request.id, payload)

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
      const body = hasToken
        ? await saveMentorActionFeedback(token, feedbackDraft)
        : await saveMentorRequestFeedback(request.id, feedbackDraft)
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
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Review your assigned mentor requests without the admin clutter.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-300">
            Sign in directly, or open a secure CFE link when one is shared, to decide, schedule, and leave feedback.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Response"
              value={response ? response : loading ? 'Loading' : 'Pending'}
              detail="Respond from your account or a secure link."
              accent="amber"
            />
            <StatCard
              label="Status"
              value={request ? request.status.replace('_', ' ') : 'Waiting'}
              detail="Updates as you schedule and submit feedback."
              accent="cyan"
            />
            <StatCard
              label="Assignments"
              value={actions.length}
              detail="Requests currently routed to you."
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
            title={request ? request.ventureName : 'No assigned requests'}
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

              {!response && hasLoadedRequest ? (
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
              You do not have assigned mentor requests right now. Secure links will still open specific requests here.
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
