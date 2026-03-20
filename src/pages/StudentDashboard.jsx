import { useMemo, useState } from 'react'
import { BrainCircuit, FileUp, Lightbulb, Send, Target } from 'lucide-react'
import { useAppState } from '../context/AppState'
import NudgeFeed from '../components/NudgeFeed'
import ReadinessGauge from '../components/ReadinessGauge'
import { Badge, ProgressBar, SectionCard, SectionHeading, StatCard, cn } from '../components/ui'

const stageOptions = ['Idea', 'TRL 3+', 'MVP', 'Pilot', 'Scale']

const domainTokens = (text = '') => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

const statusTone = {
  draft: 'slate',
  cfe_review: 'amber',
  needs_work: 'rose',
  awaiting_mentor: 'blue',
  scheduled: 'emerald',
  follow_up: 'blue',
  closed: 'slate',
}

const formatDate = (value, opts) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(opts || {}),
  })

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

function StudentDashboard() {
  const { venture, mentors, requests, submitRequest, resubmitRequest, uploadArtifact } = useAppState()
  const [artifactInput, setArtifactInput] = useState('')
  const [flashMessage, setFlashMessage] = useState('')
  const [resubmittingId, setResubmittingId] = useState('')
  const [uploadingRequestId, setUploadingRequestId] = useState('')
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
        .slice(0, 3),
    [availableMentors, form],
  )

  const selectedMentor =
    recommendedMentors.find((mentor) => mentor.id === selectedMentorId) || recommendedMentors[0] || null

  const requestCounts = {
    queued: founderRequests.filter((request) => ['draft', 'cfe_review', 'awaiting_mentor'].includes(request.status)).length,
    scheduled: founderRequests.filter((request) => request.status === 'scheduled').length,
    needsWork: founderRequests.filter((request) => request.status === 'needs_work').length,
  }

  const nudges = useMemo(
    () =>
      founderRequests.slice(0, 4).map((request) => {
        if (request.status === 'scheduled') {
          return {
            id: request.id,
            title: `Prepare for ${request.ventureName}`,
            time: formatDate(request.meetingAt, { year: 'numeric' }),
            description: `Upload the pre-read and confirm who from CFE will join the session with ${selectedMentor?.name || 'the mentor'}.`,
            status: 'urgent',
            action: 'Upload pre-read',
          }
        }

        if (request.status === 'follow_up') {
          return {
            id: request.id,
            title: 'Capture what changed after the meeting',
            time: 'Within 24h',
            description: 'Log the mentor recommendation, any follow-up needed from CFE, and whether a second session is worth it.',
            status: 'calm',
            action: 'Log follow-up',
          }
        }

        if (request.status === 'needs_work') {
          return {
            id: request.id,
            title: `${request.ventureName} is in needs work`,
            time: 'Action required',
            description: request.mentorNotes || 'CFE needs a sharper brief before routing this request again.',
            status: 'warning',
            action: 'Revise brief',
          }
        }

        return {
          id: request.id,
          title: `${request.ventureName} is in ${request.status.replace('_', ' ')}`,
          time: formatDate(request.createdAt, { year: 'numeric' }),
          description: 'CFE is checking fit, patience threshold, and whether the request is strong enough to send forward.',
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

  const handleResubmit = async (requestId) => {
    setResubmittingId(requestId)
    try {
      await resubmitRequest(requestId)
      setFlashMessage('Request re-submitted to CFE review')
    } finally {
      setResubmittingId('')
    }
  }

  const handleArtifactUpload = async (requestId, event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setUploadingRequestId(requestId)

    try {
      await uploadArtifact(requestId, file)
      setFlashMessage(`${file.name} attached to ${requestId}`)
    } finally {
      setUploadingRequestId('')
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Founder workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Build the right mentor ask before CFE routes it.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Founders should only do three things here: describe the venture clearly, attach enough context, and track what CFE does next.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <StatCard label="In queue" value={requestCounts.queued} detail="Draft, review, or mentor routing work that is still open." accent="amber" />
              <StatCard label="Scheduled" value={requestCounts.scheduled} detail="Sessions that already have a meeting slot attached." accent="cyan" />
              <StatCard label="Needs work" value={requestCounts.needsWork} detail="Requests that need a sharper brief before CFE sends them on." accent="rose" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current venture</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{venture.name}</h2>
              </div>
              <ReadinessGauge trl={venture.trl} brl={venture.brl} size="sm" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{venture.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{venture.stage}</Badge>
              <Badge tone="blue">{venture.domain}</Badge>
              <Badge tone="emerald">{venture.location}</Badge>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Next milestone</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{venture.nextMilestone}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Request composer"
            title="Send one clean brief to CFE"
            description="This form should feel closer to an intake sheet than a dashboard. Add the essentials once and let CFE handle the routing."
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

            <label className="block">
              <span className="text-sm font-medium text-slate-700">What do you need help with</span>
              <textarea
                className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                value={form.challenge}
                onChange={(event) => setForm((current) => ({ ...current, challenge: event.target.value }))}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Desired outcome</span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                value={form.desiredOutcome}
                onChange={(event) => setForm((current) => ({ ...current, desiredOutcome: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
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

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Attach proof for CFE review</p>
                  <p className="mt-1 text-sm text-slate-500">Pitch decks, technical notes, or a short memo are enough.</p>
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
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <FileUp size={16} className="text-slate-500" />
                <p className="text-sm text-slate-600">CFE will review fit, mentor patience, and whether the request is ready for exposure.</p>
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
            <div
              data-testid="founder-flash-message"
              className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            >
              {flashMessage}
            </div>
          ) : null}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard>
            <SectionHeading
              eyebrow="Suggested mentors"
              title="Pick a likely starting point"
              description="Founders do not directly connect with mentors here. This simply gives CFE a stronger first shortlist."
              action={
                selectedMentor ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                    Selected: {selectedMentor.name}
                  </div>
                ) : null
              }
            />
            <div className="space-y-3">
              {recommendedMentors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  No active mentors match right now. Ask CFE to reactivate a mentor or expand the roster.
                </div>
              ) : null}
              {recommendedMentors.map((mentor) => (
                <button
                  key={mentor.id}
                  type="button"
                  onClick={() => setSelectedMentorId(mentor.id)}
                  className={cn(
                    'w-full rounded-3xl border p-4 text-left transition',
                    selectedMentorId === mentor.id
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={cn('text-base font-semibold', selectedMentorId === mentor.id ? 'text-white' : 'text-slate-950')}>
                        {mentor.name}
                      </h3>
                      <p className={cn('mt-1 text-sm', selectedMentorId === mentor.id ? 'text-slate-300' : 'text-slate-600')}>
                        {mentor.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-2xl font-semibold tracking-tight', selectedMentorId === mentor.id ? 'text-white' : 'text-slate-950')}>
                        {mentor.score}%
                      </p>
                      <p className={cn('text-[11px] uppercase tracking-[0.22em]', selectedMentorId === mentor.id ? 'text-slate-400' : 'text-slate-500')}>
                        Match
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mentor.focus.slice(0, 2).map((item) => (
                      <Badge key={item} tone={selectedMentorId === mentor.id ? 'amber' : 'slate'}>
                        {item}
                      </Badge>
                    ))}
                    <Badge tone={mentor.tolerance === 'High' ? 'emerald' : 'blue'}>{mentor.tolerance} tolerance</Badge>
                  </div>
                  <div className="mt-4">
                    <ProgressBar
                      value={
                        founderRequests.filter(
                          (request) =>
                            request.mentorId === mentor.id &&
                            ['awaiting_mentor', 'scheduled', 'follow_up'].includes(request.status),
                        ).length
                      }
                      max={mentor.monthlyLimit}
                      tone={mentor.tolerance === 'High' ? 'emerald' : 'amber'}
                    />
                    <p className={cn('mt-2 text-sm', selectedMentorId === mentor.id ? 'text-slate-300' : 'text-slate-600')}>
                      Responds in {mentor.responseWindow}. Monthly capacity: {mentor.monthlyLimit} sessions.
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeading
              eyebrow="Nudges"
              title="Only show follow-through that matters"
              description="This is the founder-side timeline: review, prep, and revision requests from CFE."
            />
            <NudgeFeed items={nudges} />
          </SectionCard>
        </div>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Request tracker"
          title="See the venture pipeline without the clutter"
          description="Every request stays visible after submission so the founder can tell whether it is waiting, scheduled, or needs revision."
        />
        <div className="space-y-3">
          {founderRequests.map((request) => (
            <div
              key={request.id}
              data-testid={`founder-request-${request.id.toLowerCase()}`}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{request.ventureName}</h3>
                    <Badge tone={statusTone[request.status] || 'slate'}>{request.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{request.challenge}</p>
                </div>
                <div className="min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{request.stage}</p>
                  <p className="mt-1">TRL {request.trl} / BRL {request.brl}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                <span>Requested {formatDate(request.createdAt, { year: 'numeric' })}</span>
                <span>{request.artifactList.length} attached items</span>
                {request.meetingAt ? <span>Meeting {formatDate(request.meetingAt, { year: 'numeric' })}</span> : null}
              </div>
              {request.artifactList.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {request.artifactList.map((artifact) => (
                    <Badge key={`${request.id}-${artifact}`} tone="blue">
                      {artifact}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {request.status !== 'closed' ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Attach another artifact</p>
                      <p className="mt-1 text-sm text-slate-500">
                        This uses the presign and complete API flow for the selected request.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">
                      <FileUp size={16} />
                      {uploadingRequestId === request.id ? 'Uploading...' : 'Upload file'}
                      <input
                        type="file"
                        className="sr-only"
                        data-testid={`upload-artifact-${request.id.toLowerCase()}`}
                        aria-label={`Upload artifact for ${request.id}`}
                        disabled={uploadingRequestId === request.id}
                        onChange={(event) => void handleArtifactUpload(request.id, event)}
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              {request.status === 'needs_work' ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleResubmit(request.id)}
                    disabled={resubmittingId === request.id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send size={16} />
                    {resubmittingId === request.id ? 'Re-submitting...' : 'Re-submit to CFE'}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export default StudentDashboard
