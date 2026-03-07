import { useMemo, useState } from 'react'
import { CalendarCheck2, CheckCircle2, Clock3, Link2, MessagesSquare, Video } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { Badge, ProgressBar, SectionCard, SectionHeading, StatCard } from '../components/ui'

const formatFullDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

function MentorDashboard() {
  const { mentors, requests, scheduleRequest, saveFeedback } = useAppState()
  const [flashMessage, setFlashMessage] = useState('')
  const [draftSlots, setDraftSlots] = useState({})
  const [feedbackDrafts, setFeedbackDrafts] = useState({})
  const [currentMentorId, setCurrentMentorId] = useState(mentors[0]?.id || '')
  const primaryMentor = mentors.find((mentor) => mentor.id === currentMentorId) || mentors[0]
  const mentorRequests = useMemo(
    () => requests.filter((request) => request.mentorId === primaryMentor.id),
    [primaryMentor.id, requests],
  )
  const incoming = mentorRequests.filter((request) => request.status === 'awaiting_mentor')
  const scheduled = mentorRequests.filter((request) => request.status === 'scheduled')
  const followUps = mentorRequests.filter((request) => request.status === 'follow_up')
  const mentorLoad = useMemo(
    () =>
      mentorRequests.filter((request) => ['awaiting_mentor', 'scheduled', 'follow_up'].includes(request.status)).length,
    [mentorRequests],
  )

  const getSlotDraft = (requestId, mentorCalendly = '') => ({
    calendlyLink: draftSlots[requestId]?.calendlyLink ?? mentorCalendly,
    meetingAt: draftSlots[requestId]?.meetingAt ?? '',
  })

  const handleSlotChange = (requestId, field, value, mentorCalendly = '') => {
    setDraftSlots((current) => ({
      ...current,
      [requestId]: {
        calendlyLink: current[requestId]?.calendlyLink ?? mentorCalendly,
        meetingAt: current[requestId]?.meetingAt ?? '',
        [field]: value,
      },
    }))
  }

  const handleShareSlot = (requestId, mentorCalendly) => {
    const slot = getSlotDraft(requestId, mentorCalendly)

    if (!slot?.calendlyLink || !slot?.meetingAt) {
      return
    }

    scheduleRequest(requestId, slot.calendlyLink, slot.meetingAt)
    setFlashMessage(`Session confirmed for ${formatFullDate(slot.meetingAt)}`)
  }

  const handleSaveFeedback = (requestId) => {
    const note = feedbackDrafts[requestId]

    if (!note?.trim()) {
      return
    }

    saveFeedback(requestId, note)
    setFlashMessage('Feedback saved and shared with CFE')
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard className="bg-slate-950 text-white">
          <Badge tone="amber">Mentor Desk</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Review only the requests CFE already believes deserve your time.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            This desk is designed for low-friction mentor engagement: accept or pass, share a Calendly link, and leave feedback after the call.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard label="Pending" value={incoming.length} detail="CFE-approved requests waiting for a response." accent="amber" />
            <StatCard label="Scheduled" value={scheduled.length} detail="Meetings with a confirmed slot and link." accent="cyan" />
            <StatCard label="Feedback notes" value={followUps.length} detail="Sessions already documented for next-step planning." accent="emerald" />
          </div>
        </SectionCard>

        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Mentor profile</p>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Viewing mentor</span>
            <select
              value={primaryMentor.id}
              onChange={(event) => setCurrentMentorId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
            >
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>
                  {mentor.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{primaryMentor.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{primaryMentor.bio}</p>
            </div>
            <Badge tone="blue">{primaryMentor.tolerance} tolerance</Badge>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current load</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {mentorLoad}/{primaryMentor.monthlyLimit} active matches
              </p>
              <div className="mt-4">
                <ProgressBar value={mentorLoad} max={primaryMentor.monthlyLimit} tone="amber" />
              </div>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Response expectation</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{primaryMentor.responseWindow}</p>
              <p className="mt-2 text-sm text-slate-600">CFE uses this window to avoid stale approvals and mentor irritation.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {primaryMentor.focus.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        </SectionCard>
      </div>

      {flashMessage ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flashMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Incoming from CFE"
            title="Accepted requests should take one minute to process"
            description="Mentors should see the ask, the artifacts, and enough stage context to decide quickly."
          />
          <div className="space-y-4">
            {incoming.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                No approved requests are waiting. Once CFE approves a submission, it appears here automatically.
              </div>
            ) : null}

            {incoming.map((request) => {
              const mentor = mentors.find((item) => item.id === request.mentorId)
              const draft = getSlotDraft(request.id, mentor?.calendly || '')

              return (
                <div
                  key={request.id}
                  data-testid={`mentor-request-${request.id.toLowerCase()}`}
                  className="rounded-[26px] border border-slate-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-950">{request.ventureName}</h3>
                        <Badge tone="amber">{request.stage}</Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{request.challenge}</p>
                    </div>
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-950">TRL {request.trl}</p>
                      <p className="mt-1">BRL {request.brl}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.artifactList.map((artifact) => (
                      <Badge key={artifact} tone="blue">
                        {artifact}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Link2 size={16} />
                        Calendly link
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                        value={draft.calendlyLink}
                        onChange={(event) => handleSlotChange(request.id, 'calendlyLink', event.target.value, mentor?.calendly || '')}
                      />
                    </label>
                    <label className="block">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Clock3 size={16} />
                        Meeting slot
                      </span>
                      <input
                        type="datetime-local"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                        value={draft.meetingAt}
                        onChange={(event) => handleSlotChange(request.id, 'meetingAt', event.target.value, mentor?.calendly || '')}
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-sm text-slate-500">
                      CFE will circulate the meeting details, remind the student, and request a note after the session.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleShareSlot(request.id, mentor?.calendly || '')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <CalendarCheck2 size={16} />
                      Share slot
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard>
            <SectionHeading
              eyebrow="Upcoming meetings"
              title="Keep an eye on what is already on the calendar"
              description="Meetings stay visible with their context so mentors can prep quickly and CFE can chase attendance if needed."
            />
            <div className="space-y-4">
              {scheduled.map((request) => (
                <div key={request.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{request.ventureName}</h3>
                      <p className="mt-2 text-sm text-slate-600">{formatFullDate(request.meetingAt)}</p>
                    </div>
                    <a
                      href={request.calendlyLink}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                    >
                      <Video size={16} />
                      Open link
                    </a>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{request.desiredOutcome}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeading
              eyebrow="After the meeting"
              title="Return a concise note to CFE"
              description="The note closes the loop, informs next steps, and helps CFE decide whether another mentor or a second session is warranted."
            />
            <div className="space-y-4">
              {scheduled.map((request) => (
                <div key={request.id} className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <MessagesSquare size={18} className="text-slate-500" />
                    <h3 className="text-lg font-semibold text-slate-950">{request.ventureName}</h3>
                  </div>
                  <textarea
                    className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                    placeholder="What changed after the conversation? What should CFE do next?"
                    value={feedbackDrafts[request.id] || ''}
                    onChange={(event) =>
                      setFeedbackDrafts((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveFeedback(request.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <CheckCircle2 size={16} />
                      Save feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default MentorDashboard
