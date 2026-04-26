import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BrainCircuit, FileUp, Lightbulb, Send, Target } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import {
  Badge,
  ProgressBar,
  SectionCard,
  SectionHeading,
  cn,
} from '../../components/ui'
import FounderSubNav from './FounderSubNav'
import {
  filterFounderRequests,
  getFallbackReasons,
  getMatchScore,
  stageOptions,
} from './founderHelpers'

const DEFAULT_AI_NOTES =
  'We have a working MVP and a few pilot conversations, but our fundraising story is still messy. I need help deciding what proof matters most and how to position the next mentor meeting so it produces a sharper investor narrative.'

const DEFAULT_CHALLENGE = 'Need help framing our fundraising story and sequencing pilot conversations.'
const DEFAULT_OUTCOME = 'Leave with a sharper mentor brief, meeting prep, and a clear next step after the first call.'

function NewRequestPage() {
  const {
    venture,
    mentors,
    requests,
    submitRequest,
    generateAiMentorRecommendations,
    generateAiRequestBrief,
  } = useAppState()
  const navigate = useNavigate()

  const [artifactInput, setArtifactInput] = useState('')
  const [flashMessage, setFlashMessage] = useState('')
  const [aiNotes, setAiNotes] = useState(DEFAULT_AI_NOTES)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiError, setAiError] = useState('')
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false)
  const [aiMentorRecommendations, setAiMentorRecommendations] = useState(null)
  const [mentorRecommendationError, setMentorRecommendationError] = useState('')
  const [isGeneratingMentorRecommendations, setIsGeneratingMentorRecommendations] = useState(false)
  const [form, setForm] = useState({
    ventureName: venture.name,
    stage: venture.stage,
    domain: venture.domain,
    trl: venture.trl,
    brl: venture.brl,
    challenge: DEFAULT_CHALLENGE,
    desiredOutcome: DEFAULT_OUTCOME,
    artifactList: ['Pitch deck v4', 'Pilot learning note'],
  })

  const founderRequests = useMemo(
    () => filterFounderRequests(requests, venture),
    [requests, venture],
  )

  const availableMentors = useMemo(
    () => mentors.filter((mentor) => mentor.visibility === 'Active'),
    [mentors],
  )

  const [selectedMentorId, setSelectedMentorId] = useState(availableMentors[0]?.id || '')

  const fallbackRecommendedMentors = useMemo(
    () =>
      availableMentors
        .map((mentor) => ({
          ...mentor,
          score: getMatchScore(mentor, form),
          reasons: getFallbackReasons(mentor, form),
          recommendationProvider: 'fallback',
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3),
    [availableMentors, form],
  )

  const recommendedMentors = useMemo(() => {
    if (!aiMentorRecommendations?.shortlist?.length) {
      return fallbackRecommendedMentors
    }

    return aiMentorRecommendations.shortlist
      .map((item) => {
        const mentor = availableMentors.find((candidate) => candidate.id === item.mentorId)
        if (!mentor) {
          return null
        }

        return {
          ...mentor,
          score: item.score,
          reasons: item.reasons,
          caution: item.caution,
          recommendationProvider: aiMentorRecommendations.provider,
        }
      })
      .filter(Boolean)
  }, [aiMentorRecommendations, availableMentors, fallbackRecommendedMentors])

  const selectedMentor =
    recommendedMentors.find((mentor) => mentor.id === selectedMentorId) || recommendedMentors[0] || null

  useEffect(() => {
    if (recommendedMentors.some((mentor) => mentor.id === selectedMentorId)) {
      return
    }

    setSelectedMentorId(recommendedMentors[0]?.id || '')
  }, [recommendedMentors, selectedMentorId])

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

  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true)
    setAiError('')

    try {
      const result = await generateAiRequestBrief({
        ventureName: form.ventureName,
        domain: form.domain,
        stage: form.stage,
        trl: Number(form.trl),
        brl: Number(form.brl),
        rawNotes: aiNotes,
        desiredOutcomeHint: form.desiredOutcome,
        artifactRefs: form.artifactList,
      })
      setAiSuggestion(result.suggestion)
    } catch (error) {
      setAiError(error.message || 'The AI brief assistant is unavailable right now.')
    } finally {
      setIsGeneratingBrief(false)
    }
  }

  const handleApplySuggestion = () => {
    if (!aiSuggestion) {
      return
    }

    setForm((current) => ({
      ...current,
      challenge: aiSuggestion.challenge,
      desiredOutcome: aiSuggestion.desiredOutcome,
    }))
    setAiMentorRecommendations(null)
    setMentorRecommendationError('')
    setFlashMessage(`Applied ${aiSuggestion.provider} brief suggestion`)
  }

  const handleGenerateMentorRecommendations = async () => {
    setIsGeneratingMentorRecommendations(true)
    setMentorRecommendationError('')

    try {
      const result = await generateAiMentorRecommendations({
        ventureName: form.ventureName,
        domain: form.domain,
        stage: form.stage,
        trl: Number(form.trl),
        brl: Number(form.brl),
        challenge: form.challenge,
        desiredOutcome: form.desiredOutcome,
        maxResults: 3,
      })
      setAiMentorRecommendations(result.recommendations)
      if (result.recommendations.shortlist[0]?.mentorId) {
        setSelectedMentorId(result.recommendations.shortlist[0].mentorId)
      }
    } catch (error) {
      setMentorRecommendationError(error.message || 'The AI mentor matcher is unavailable right now.')
    } finally {
      setIsGeneratingMentorRecommendations(false)
    }
  }

  const handleViewPipeline = () => {
    navigate('/founders/pipeline')
  }

  return (
    <div className="space-y-5 pb-8">
      <FounderSubNav />

      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Request composer</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Build the right mentor ask before CFE routes it.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Describe the venture clearly, attach proof, and let CFE handle the routing. The AI brief and mentor matcher only nudge the draft — CFE still owns the final routing decision.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current venture</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{venture.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{venture.stage}</Badge>
              <Badge tone="blue">TRL {venture.trl}</Badge>
              <Badge tone="emerald">BRL {venture.brl}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{venture.summary}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">{founderRequests.length} requests in pipeline</p>
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
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">AI request brief assistant</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Paste rough notes first, then apply the suggested challenge and outcome to the form.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateBrief()}
                  disabled={isGeneratingBrief}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BrainCircuit size={16} />
                  {isGeneratingBrief ? 'Generating...' : 'Draft with AI'}
                </button>
              </div>
              <textarea
                className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-300"
                value={aiNotes}
                onChange={(event) => setAiNotes(event.target.value)}
              />
              {aiError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                  {aiError}
                </div>
              ) : null}
              {aiSuggestion ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">AI suggestion</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{aiSuggestion.briefSummary}</p>
                    </div>
                    <Badge tone={aiSuggestion.provider === 'openai' ? 'emerald' : 'amber'}>{aiSuggestion.provider}</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Mentor fit tags</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {aiSuggestion.mentorFitTags.map((item) => (
                          <Badge key={item} tone="blue">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Missing info</p>
                      <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                        {(aiSuggestion.missingInformation.length > 0
                          ? aiSuggestion.missingInformation
                          : ['No major missing information flagged by the current assistant.']).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">CFE routing note</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{aiSuggestion.cfeRoutingNote}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleApplySuggestion}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Send size={16} />
                      Apply to form
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

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
              className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
            >
              <span>{flashMessage}</span>
              <button
                type="button"
                onClick={handleViewPipeline}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900 transition hover:border-emerald-400"
              >
                Open pipeline
                <ArrowRight size={14} aria-hidden="true" />
              </button>
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
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateMentorRecommendations}
                    disabled={isGeneratingMentorRecommendations || availableMentors.length === 0}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <BrainCircuit size={16} />
                    {isGeneratingMentorRecommendations
                      ? 'Ranking mentors...'
                      : aiMentorRecommendations
                        ? 'Refresh AI ranking'
                        : 'Recommend with AI'}
                  </button>
                  {selectedMentor ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                      Selected: {selectedMentor.name}
                    </div>
                  ) : null}
                </div>
              }
            />
            {mentorRecommendationError ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                {mentorRecommendationError}
              </div>
            ) : null}
            {aiMentorRecommendations ? (
              <div className="mb-4 rounded-3xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">{aiMentorRecommendations.provider} ranking</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{aiMentorRecommendations.routingNote}</p>
                  </div>
                  <Badge tone="blue">{aiMentorRecommendations.shortlist.length} mentors shortlisted</Badge>
                </div>
                {aiMentorRecommendations.searchTags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aiMentorRecommendations.searchTags.slice(0, 5).map((tag) => (
                      <Badge key={tag} tone="blue">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm leading-6 text-slate-600">
                  The fallback shortlist uses domain overlap, stage fit, and mentor tolerance. Run the AI matcher to rank active mentors from the database with clearer routing reasons for CFE.
                </p>
              </div>
            )}
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
                        {mentor.recommendationProvider === 'fallback' ? 'Fallback fit' : 'AI rank'}
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
                  {mentor.reasons?.length ? (
                    <div
                      className={cn(
                        'mt-4 rounded-2xl border px-4 py-3',
                        selectedMentorId === mentor.id
                          ? 'border-slate-700 bg-slate-800/70'
                          : 'border-slate-200 bg-slate-50',
                      )}
                    >
                      <p className={cn('text-xs font-semibold uppercase tracking-[0.22em]', selectedMentorId === mentor.id ? 'text-slate-300' : 'text-slate-500')}>
                        Why this mentor
                      </p>
                      <ul className={cn('mt-2 space-y-2 text-sm leading-6', selectedMentorId === mentor.id ? 'text-slate-200' : 'text-slate-600')}>
                        {mentor.reasons.slice(0, 3).map((reason) => (
                          <li key={`${mentor.id}-${reason}`} className="flex gap-2">
                            <span aria-hidden="true">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {mentor.caution ? (
                    <div
                      className={cn(
                        'mt-3 rounded-2xl border px-4 py-3 text-sm leading-6',
                        selectedMentorId === mentor.id
                          ? 'border-amber-400/40 bg-amber-400/10 text-amber-100'
                          : 'border-amber-200 bg-amber-50 text-amber-900',
                      )}
                    >
                      Caution: {mentor.caution}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeading
              eyebrow="After you submit"
              title="Track everything from the pipeline page"
              description="The pipeline page collects every founder request with filters for status, attachments, and resubmission."
            />
            <Link
              to="/founders/pipeline"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
            >
              Open pipeline
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default NewRequestPage
