import { useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, CalendarClock, FileUp, Lightbulb, Send, Sparkles, Target } from 'lucide-react'
import { useAppState } from '../context/AppState'
import NudgeFeed from '../components/NudgeFeed'
import ReadinessGauge from '../components/ReadinessGauge'
import { Badge, ProgressBar, SectionCard, SectionHeading, StatCard, cn } from '../components/ui'

const stageOptions = ['Idea', 'TRL 3+', 'MVP', 'Pilot', 'Scale']

const domainTokens = (text = '') => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

const getMatchScore = (mentor, form) => {
  const tokens = domainTokens(`${form.domain} ${form.challenge}`)
  let score = 58

  mentor.focus.forEach((focus) => {
    if (tokens.some((token) => focus.toLowerCase().includes(token))) {
      score += 7
    }
  })

  mentor.domains.forEach((domain) => {
    if (tokens.some((token) => domain.toLowerCase().includes(token))) {
      score += 6
    }
  })

  if (mentor.stages.some((stage) => stage.toLowerCase() === form.stage.toLowerCase())) {
    score += 12
  }

  if (mentor.tolerance === 'High') {
    score += 6
  }

  return Math.min(99, score)
}

const formatDate = (value, opts) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(opts || {}),
  })

function StudentDashboard() {
  const { venture, mentors, requests, submitRequest } = useAppState()
  const [artifactInput, setArtifactInput] = useState('')
  const [flashMessage, setFlashMessage] = useState('')
  const [form, setForm] = useState({
    ventureName: venture.name,
    stage: venture.stage,
    domain: venture.domain,
    trl: venture.trl,
    brl: venture.brl,
    challenge: 'Need help framing our fundraising story and sequencing pilot conversations.',
    desiredOutcome: 'Leave with a sharper mentor brief, meeting prep, and a clear next step after the first call.',
    artifactList: ['Pitch deck v4', 'Pilot learning note'],
  })
  const founderRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.ventureName === venture.name && request.founderName === venture.founder,
      ),
    [requests, venture.founder, venture.name],
  )
  const availableMentors = useMemo(
    () => mentors.filter((mentor) => mentor.visibility === 'Active'),
    [mentors],
  )
  const [selectedMentorId, setSelectedMentorId] = useState(availableMentors[0]?.id || '')

  const recommendedMentors = useMemo(
    () =>
      availableMentors
        .map((mentor) => ({ ...mentor, score: getMatchScore(mentor, form) }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 4),
    [availableMentors, form],
  )

  const selectedMentor =
    recommendedMentors.find((mentor) => mentor.id === selectedMentorId) || recommendedMentors[0] || null
  const requestCounts = {
    open: founderRequests.filter((request) => ['cfe_review', 'awaiting_mentor', 'scheduled', 'needs_work'].includes(request.status)).length,
    scheduled: founderRequests.filter((request) => request.status === 'scheduled').length,
    followUps: founderRequests.filter((request) => request.status === 'follow_up').length,
  }

  const nudges = useMemo(
    () =>
      founderRequests
        .slice(0, 4)
        .map((request) => {
          if (request.status === 'scheduled') {
            return {
              id: request.id,
              title: `Prep for ${request.ventureName}`,
              time: formatDate(request.meetingAt, { year: 'numeric' }),
              description: `Upload a pre-read before meeting ${selectedMentor?.name || 'your mentor'} and confirm who from CFE will join.`,
              status: 'urgent',
              action: 'Upload pre-read',
            }
          }

          if (request.status === 'follow_up') {
            return {
              id: request.id,
              title: 'Close the loop after the session',
              time: 'Within 24h',
              description: 'Capture mentor feedback, next steps, and whether CFE should arrange a second touchpoint.',
              status: 'calm',
              action: 'Log follow-up',
            }
          }

          if (request.status === 'needs_work') {
            return {
              id: request.id,
              title: `${request.ventureName} is in needs work`,
              time: 'Action required',
              description: request.mentorNotes || 'CFE asked for better context before re-routing this request.',
              status: 'warning',
              action: 'Revise brief',
            }
          }

          return {
            id: request.id,
            title: `${request.ventureName} is in ${request.status.replace('_', ' ')}`,
            time: formatDate(request.createdAt, { year: 'numeric' }),
            description: 'CFE will review fit, misuse risk, and mentor tolerance before the request advances.',
            status: request.status === 'cfe_review' ? 'warning' : 'calm',
            action: request.status === 'cfe_review' ? 'Wait for approval' : 'Review request',
          }
        }),
    [founderRequests, selectedMentor?.name],
  )

  const handleAddArtifact = () => {
    const value = artifactInput.trim()

    if (!value) {
      return
    }

    setForm((current) => ({
      ...current,
      artifactList: [...current.artifactList, value],
    }))
    setArtifactInput('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    submitRequest({
      ...form,
      mentorId: selectedMentor?.id || '',
      founderName: venture.founder,
      trl: Number(form.trl),
      brl: Number(form.brl),
    })
    setFlashMessage('Request sent to CFE review')
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard className="relative overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.24),transparent_30%)]" />
          <div className="relative">
            <Badge tone="amber">Founder Studio</Badge>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight">Build the right mentor ask before CFE routes it.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              {venture.programNote} Students share stage, TRL, BRL, and working materials so mentors only see high-context requests.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <StatCard label="Open requests" value={requestCounts.open} detail="Live asks across review, routing, and upcoming sessions." accent="amber" />
              <StatCard label="Scheduled" value={requestCounts.scheduled} detail="Meetings with a link already shared back through CFE." accent="cyan" />
              <StatCard label="Follow-ups" value={requestCounts.followUps} detail="Sessions that still need a feedback note or second-step decision." accent="emerald" />
            </div>
          </div>
        </SectionCard>

        <SectionCard className="border-slate-200/70 bg-white/90">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Venture signal</p>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{venture.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{venture.summary}</p>
            </div>
            <ReadinessGauge trl={venture.trl} brl={venture.brl} size="sm" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Stage</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{venture.stage}</p>
              <p className="mt-2 text-sm text-slate-600">{venture.location}</p>
            </div>
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Next milestone</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{venture.nextMilestone}</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="AI guided matching"
            title="Shortlist mentors with enough patience for this stage"
            description="Match scores reflect domain fit, stage relevance, and mentor tolerance so CFE starts with a realistic shortlist."
          />
          <div className="space-y-4">
            {recommendedMentors.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                No active mentors match right now. Ask CFE to reactivate a mentor or expand the roster.
              </div>
            ) : null}
            {recommendedMentors.map((mentor) => (
              <button
                key={mentor.id}
                type="button"
                onClick={() => setSelectedMentorId(mentor.id)}
                className={cn(
                  'w-full rounded-[24px] border p-5 text-left transition-all',
                  selectedMentorId === mentor.id
                    ? 'border-amber-300 bg-amber-50 shadow-[0_16px_40px_rgba(251,191,36,0.18)]'
                    : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">{mentor.name}</h3>
                      <Badge tone={mentor.tolerance === 'High' ? 'emerald' : 'blue'}>{mentor.tolerance} tolerance</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{mentor.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold tracking-tight text-slate-950">{mentor.score}%</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Fit score</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mentor.focus.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Best for</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{mentor.bio}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Monthly headroom</p>
                    <div className="mt-2">
                      <ProgressBar
                        value={founderRequests.filter((request) => request.mentorId === mentor.id && ['awaiting_mentor', 'scheduled', 'follow_up'].includes(request.status)).length}
                        max={mentor.monthlyLimit}
                        tone={mentor.tolerance === 'High' ? 'emerald' : 'amber'}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Responds in {mentor.responseWindow}. CFE uses this to avoid overwhelming mentors.
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Request composer"
            title="Send a complete brief to CFE"
            description="Students should submit the context once. CFE then reviews fit, narrows the mentor list, and forwards only the strongest asks."
            action={
              selectedMentor ? (
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Selected mentor</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedMentor.name}</p>
                </div>
              ) : null
            }
          />

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Venture Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.ventureName}
                  onChange={(event) => setForm((current) => ({ ...current, ventureName: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Stage</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.stage}
                  onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}
                >
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">What do you need help with</span>
                <textarea
                  className="mt-2 min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.challenge}
                  onChange={(event) => setForm((current) => ({ ...current, challenge: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Desired outcome</span>
                <textarea
                  className="mt-2 min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.desiredOutcome}
                  onChange={(event) => setForm((current) => ({ ...current, desiredOutcome: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_1fr_1fr]">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <BrainCircuit size={16} />
                  Domain
                </span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.domain}
                  onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Lightbulb size={16} />
                  TRL {form.trl}
                </span>
                <input
                  type="range"
                  min="1"
                  max="9"
                  value={form.trl}
                  className="mt-4 w-full accent-amber-500"
                  onChange={(event) => setForm((current) => ({ ...current, trl: Number(event.target.value) }))}
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Target size={16} />
                  BRL {form.brl}
                </span>
                <input
                  type="range"
                  min="1"
                  max="9"
                  value={form.brl}
                  className="mt-4 w-full accent-sky-500"
                  onChange={(event) => setForm((current) => ({ ...current, brl: Number(event.target.value) }))}
                />
              </label>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Attach proof for CFE review</p>
                  <p className="mt-1 text-sm text-slate-500">Pitch decks, thought dumps, technical specs, or a short memo are enough.</p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <input
                    value={artifactInput}
                    onChange={(event) => setArtifactInput(event.target.value)}
                    placeholder="Add asset"
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-300 sm:w-56"
                  />
                  <button
                    type="button"
                    onClick={handleAddArtifact}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {form.artifactList.map((artifact) => (
                  <Badge key={artifact} tone="blue">
                    {artifact}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <FileUp size={16} className="text-slate-500" />
                <p className="text-sm text-slate-600">CFE will review fit, patience threshold, and whether this mentor is right for your current TRL.</p>
              </div>
              <button
                type="submit"
                disabled={!selectedMentor}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send size={16} />
                Send to CFE Review
              </button>
            </div>
          </form>

          {flashMessage ? (
            <div className="mt-5 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {flashMessage}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Pipeline and follow-through"
            title="See every request as CFE sees it"
            description="The request does not disappear after the first meeting. Scheduling, feedback, and next steps remain visible."
          />
          <div className="space-y-4">
            {founderRequests.map((request) => (
              <div key={request.id} className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">{request.ventureName}</h3>
                      <Badge
                        tone={
                          request.status === 'scheduled'
                            ? 'emerald'
                            : request.status === 'cfe_review'
                              ? 'amber'
                              : request.status === 'needs_work'
                                ? 'rose'
                              : request.status === 'follow_up'
                                ? 'blue'
                                : 'slate'
                        }
                      >
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{request.challenge}</p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">{request.stage}</p>
                    <p className="mt-1">TRL {request.trl} / BRL {request.brl}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span>Requested {formatDate(request.createdAt, { year: 'numeric' })}</span>
                  <span className="text-slate-300">•</span>
                  <span>{request.artifactList.length} attached items</span>
                  {request.meetingAt ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>Meeting {formatDate(request.meetingAt, { year: 'numeric' })}</span>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard>
            <SectionHeading
              eyebrow="Nudge system"
              title="Keep students and mentors from missing the handoff"
              description="The platform should nudge before the session, after the session, and when CFE needs more information."
            />
            <NudgeFeed items={nudges} />
          </SectionCard>

          <SectionCard className="bg-slate-950 text-white">
            <SectionHeading
              eyebrow="Meeting guardrails"
              title="Why CFE stays in the loop"
              description="Mentor access is scarce. Guardrails reduce misuse, respect each mentor's tolerance, and make follow-up traceable."
            />
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: CalendarClock, title: 'Prep first', text: 'Students must upload context before a match becomes real.' },
                { icon: ArrowRight, title: 'Approve centrally', text: 'CFE makes the final go or no-go call after narrowing the list.' },
                { icon: Sparkles, title: 'Capture feedback', text: 'Every meeting ends with a note, next step, and optional second session.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                  <item.icon size={18} className="text-amber-300" />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
