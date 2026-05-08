import type {
  MentorRecommendationGroundTruth,
  MentorRecommendationShowcaseCase,
} from '../../evals/mentorRecommendationShowcaseDataset'
import { mentorRecommendationShowcaseDataset } from '../../evals/mentorRecommendationShowcaseDataset'
import type {
  MentorRecommendationCandidate,
  MentorRecommendationInput,
  MentorRecommendationOutput,
} from '../domain/interfaces'
import { HeuristicAiGateway } from './heuristicAiGateway'
import {
  cleanText,
  computeOverallScore,
  includesAny,
  scoreExpectedCoverage,
  tokenize,
  unique,
  type ShowcaseRubricResult,
} from './showcaseScoring'

export type MentorRecommendationBaselineId =
  | 'agentic_baseline'
  | 'production_heuristic_current'
  | 'single_prompt_baseline'

export type MentorRecommendationRubricResult = ShowcaseRubricResult

export type MentorRecommendationShowcaseResult = {
  baselineId: MentorRecommendationBaselineId
  caseId: string
  description: string
  output: MentorRecommendationOutput
  overallScore: number
  pass: boolean
  rubric: MentorRecommendationRubricResult[]
}

export type MentorRecommendationShowcaseReport = {
  baselines: Array<{
    averageScore: number
    baselineId: MentorRecommendationBaselineId
    passed: number
    total: number
  }>
  datasetSize: number
  endpoint: 'POST /ai/mentor-recommendations'
  results: MentorRecommendationShowcaseResult[]
}

export const singlePromptMentorRecommendationBaselinePrompt = `
You are a MentorMe assistant. Rank mentor candidates for a founder request and
return JSON with provider, routingNote, searchTags, and shortlist.

Rules:
- Score candidates using only the founder ask and candidate profiles.
- Prefer domain, stage, and focus overlap.
- Include concise reasons for each shortlisted mentor.
- Do not include mentors who do not match the request.
`

export const agenticMentorRecommendationBaselinePlan = [
  'Parse the founder request into domain, stage, readiness, functional need, and desired outcome.',
  'Filter candidates for obvious domain or functional mismatch before ranking.',
  'Score each remaining mentor across domain, focus, stage, tolerance, and capacity.',
  'Generate reasons tied to concrete candidate evidence, not generic praise.',
  'Critique the shortlist for irrelevant mentors, missing tags, weak CFE routing context, and order mistakes.',
]

const keywordTags = (input: MentorRecommendationInput) => {
  const text = `${input.domain || ''} ${input.stage || ''} ${input.challenge} ${input.desiredOutcome || ''}`.toLowerCase()
  return unique([
    input.domain ? input.domain.toLowerCase() : '',
    input.stage ? input.stage.toLowerCase() : '',
    includesAny(text, ['fundrais', 'investor story', 'narrative']) ? 'fundraising' : '',
    includesAny(text, ['pilot', 'pilot wedge', 'pilot conversations']) ? 'pilot design' : '',
    includesAny(text, ['regulat', 'compliance']) ? 'regulatory' : '',
    includesAny(text, ['hospital', 'procurement', 'buyer']) ? 'healthcare buyer discovery' : '',
    includesAny(text, ['customer discovery', 'facility', 'facilities', 'interviews']) ? 'customer discovery' : '',
    includesAny(text, ['hardware', 'prototype', 'installation', 'maintenance']) ? 'hardware ops' : '',
    includesAny(text, ['water treatment', 'greywater']) ? 'water treatment' : '',
    includesAny(text, ['industrial drones', 'drone']) ? 'industrial drones' : '',
  ]).slice(0, 7)
}

const candidateText = (candidate: MentorRecommendationCandidate) =>
  `${candidate.name} ${candidate.title} ${candidate.bio} ${candidate.focus.join(' ')} ${candidate.domains.join(' ')} ${candidate.stages.join(' ')}`

const overlapTags = (candidate: MentorRecommendationCandidate, tags: string[]) =>
  tags.filter((tag) => candidateText(candidate).toLowerCase().includes(tag.toLowerCase()))

const scoreCandidate = (
  candidate: MentorRecommendationCandidate,
  input: MentorRecommendationInput,
  tags: string[],
  mode: 'agentic' | 'single_prompt',
) => {
  const queryTokens = new Set(tokenize(`${input.domain || ''} ${input.challenge} ${input.desiredOutcome || ''}`))
  const candidateTokens = new Set(tokenize(candidateText(candidate)))
  const tokenHits = Array.from(queryTokens).filter((token) => candidateTokens.has(token))
  const tagHits = overlapTags(candidate, tags)
  const domainHits = candidate.domains.filter((domain) =>
    tags.some((tag) => domain.toLowerCase().includes(tag) || tag.includes(domain.toLowerCase())),
  )
  const focusHits = candidate.focus.filter((focus) =>
    tags.some((tag) => focus.toLowerCase().includes(tag) || tag.includes(focus.toLowerCase())),
  )
  const stageMatch = input.stage
    ? candidate.stages.some((stage) => stage.toLowerCase() === input.stage?.toLowerCase())
    : false

  let score = mode === 'agentic' ? 36 : 32
  score += tagHits.length * (mode === 'agentic' ? 9 : 7)
  score += domainHits.length * 10
  score += focusHits.length * 11
  score += stageMatch ? 16 : 0
  score += candidate.tolerance === 'High' ? 7 : candidate.tolerance === 'Medium' ? 4 : 1
  score += Math.min(6, candidate.monthlyLimit * 2)
  score += Math.min(mode === 'agentic' ? 8 : 5, tokenHits.length)

  const reasons = unique([
    domainHits.length > 0 ? `Domain fit: ${domainHits.slice(0, 2).join(', ')}` : '',
    focusHits.length > 0 ? `Functional fit: ${focusHits.slice(0, 2).join(', ')}` : '',
    stageMatch && input.stage ? `Stage fit for ${input.stage}` : '',
    includesAny(input.challenge, ['fundrais', 'investor story'])
      ? 'Can help the founder tighten fundraising and investor story.'
      : '',
    includesAny(input.challenge, ['pilot', 'prototype', 'installation', 'maintenance'])
      ? 'Can help structure pilot or prototype execution risks.'
      : '',
    includesAny(input.challenge, ['regulatory', 'procurement', 'hospital'])
      ? 'Can help with regulatory, procurement, or hospital buyer process risk.'
      : '',
    candidate.tolerance === 'High' ? 'High tolerance fits an evolving founder ask.' : '',
  ]).slice(0, 4)

  return {
    mentorId: candidate.id,
    mentorName: candidate.name,
    title: candidate.title,
    score: Math.min(99, score),
    reasons: reasons.length > 0 ? reasons : ['General fit based on the supplied mentor profile and request.'],
    ...(candidate.monthlyLimit <= 1 ? { caution: 'Limited monthly capacity; CFE should reserve this mentor for a tight brief.' } : {}),
  }
}

const runRankingBaseline = async (
  input: MentorRecommendationInput & { candidates: MentorRecommendationCandidate[] },
  mode: 'agentic' | 'single_prompt',
): Promise<MentorRecommendationOutput> => {
  const searchTags = keywordTags(input)
  const limit = Math.min(Math.max(input.maxResults || 3, 1), 5)
  const shortlist = input.candidates
    .map((candidate) => scoreCandidate(candidate, input, searchTags, mode))
    .filter((candidate) => (mode === 'single_prompt' ? candidate.score >= 60 : candidate.score >= 68))
    .sort((left, right) => right.score - left.score || left.mentorName.localeCompare(right.mentorName))
    .slice(0, limit)

  return {
    provider: 'heuristic',
    searchTags,
    routingNote:
      shortlist.length > 0
        ? `CFE should confirm ${searchTags.slice(0, 4).join(', ')} fit and outreach timing before sending this shortlist.`
        : 'CFE should tighten the founder request or expand the mentor roster before routing.',
    shortlist,
  }
}

export const runSinglePromptMentorRecommendationBaseline = (
  input: MentorRecommendationInput & { candidates: MentorRecommendationCandidate[] },
) => runRankingBaseline(input, 'single_prompt')

export const runAgenticMentorRecommendationBaseline = (
  input: MentorRecommendationInput & { candidates: MentorRecommendationCandidate[] },
) => runRankingBaseline(input, 'agentic')

const schemaScore = (output: MentorRecommendationOutput) => {
  const valid =
    Array.isArray(output.searchTags) &&
    typeof output.routingNote === 'string' &&
    Array.isArray(output.shortlist) &&
    output.shortlist.every(
      (item) =>
        typeof item.mentorId === 'string' &&
        typeof item.mentorName === 'string' &&
        typeof item.title === 'string' &&
        typeof item.score === 'number' &&
        item.score >= 0 &&
        item.score <= 100 &&
        Array.isArray(item.reasons),
    )

  return valid ? 1 : 0
}

const expectedOrderScore = (groundTruth: MentorRecommendationGroundTruth, output: MentorRecommendationOutput) => {
  const actualIds = output.shortlist.map((item) => item.mentorId)
  if (groundTruth.expectedTopMentorIds.length === 0) {
    return actualIds.length === 0 ? 1 : 0
  }

  const score = groundTruth.expectedTopMentorIds.reduce((sum, mentorId, index) => {
    if (actualIds[index] === mentorId) {
      return sum + 1
    }

    return actualIds.includes(mentorId) ? sum + 0.5 : sum
  }, 0)

  return score / groundTruth.expectedTopMentorIds.length
}

const forbiddenMentorScore = (groundTruth: MentorRecommendationGroundTruth, output: MentorRecommendationOutput) => {
  const actualIds = new Set(output.shortlist.map((item) => item.mentorId))
  return groundTruth.forbiddenMentorIds.some((mentorId) => actualIds.has(mentorId)) ? 0 : 1
}

const reasonGroundingScore = (groundTruth: MentorRecommendationGroundTruth, output: MentorRecommendationOutput) => {
  const expectedMentors = Object.entries(groundTruth.reasonThemesByMentor)
  if (expectedMentors.length === 0) {
    return 1
  }

  const score = expectedMentors.reduce((sum, [mentorId, themes]) => {
    const outputMentor = output.shortlist.find((item) => item.mentorId === mentorId)
    if (!outputMentor) {
      return sum
    }

    const reasonText = cleanText(`${outputMentor.title} ${outputMentor.reasons.join(' ')}`)
    return sum + scoreExpectedCoverage(themes, reasonText)
  }, 0)

  return score / expectedMentors.length
}

export const evaluateMentorRecommendationOutput = (
  currentCase: MentorRecommendationShowcaseCase,
  output: MentorRecommendationOutput,
): Omit<MentorRecommendationShowcaseResult, 'baselineId'> => {
  const rubric: MentorRecommendationRubricResult[] = [
    {
      name: 'schema_contract',
      score: schemaScore(output),
      weight: 1,
      rationale: 'Output must match the endpoint response shape used by the request composer.',
    },
    {
      name: 'search_tag_grounding',
      score: scoreExpectedCoverage(currentCase.groundTruth.requiredSearchTags, output.searchTags),
      weight: 1.5,
      rationale: 'Search tags should preserve domain, stage, and functional need.',
    },
    {
      name: 'shortlist_order',
      score: expectedOrderScore(currentCase.groundTruth, output),
      weight: 2,
      rationale: 'The strongest mentor fits should appear first in the shortlist.',
    },
    {
      name: 'reason_grounding',
      score: reasonGroundingScore(currentCase.groundTruth, output),
      weight: 2,
      rationale: 'Reasons should cite concrete fit signals for each selected mentor.',
    },
    {
      name: 'irrelevant_mentor_exclusion',
      score: forbiddenMentorScore(currentCase.groundTruth, output),
      weight: 1.5,
      rationale: 'Clearly irrelevant mentors should not be included just because they are generally strong.',
    },
    {
      name: 'routing_note_grounding',
      score: scoreExpectedCoverage(currentCase.groundTruth.requiredRoutingNoteThemes, output.routingNote),
      weight: 1,
      rationale: 'Routing note should tell CFE what fit and timing to verify.',
    },
  ]
  const overallScore = computeOverallScore(rubric)

  return {
    caseId: currentCase.id,
    description: currentCase.description,
    output,
    rubric,
    overallScore,
    pass: overallScore >= 3.5 && schemaScore(output) === 1,
  }
}

export const runMentorRecommendationShowcase = async (
  dataset: MentorRecommendationShowcaseCase[] = mentorRecommendationShowcaseDataset,
): Promise<MentorRecommendationShowcaseReport> => {
  const productionGateway = new HeuristicAiGateway()
  const baselineRunners: Array<{
    id: MentorRecommendationBaselineId
    run: (
      input: MentorRecommendationInput & { candidates: MentorRecommendationCandidate[] },
    ) => Promise<MentorRecommendationOutput>
  }> = [
    { id: 'single_prompt_baseline', run: runSinglePromptMentorRecommendationBaseline },
    { id: 'agentic_baseline', run: runAgenticMentorRecommendationBaseline },
    { id: 'production_heuristic_current', run: (input) => productionGateway.recommendMentors(input) },
  ]

  const results: MentorRecommendationShowcaseResult[] = []
  for (const runner of baselineRunners) {
    for (const currentCase of dataset) {
      const output = await runner.run(currentCase.input)
      results.push({
        baselineId: runner.id,
        ...evaluateMentorRecommendationOutput(currentCase, output),
      })
    }
  }

  return {
    endpoint: 'POST /ai/mentor-recommendations',
    datasetSize: dataset.length,
    results,
    baselines: baselineRunners.map((runner) => {
      const matching = results.filter((result) => result.baselineId === runner.id)
      return {
        baselineId: runner.id,
        total: matching.length,
        passed: matching.filter((result) => result.pass).length,
        averageScore: Number(
          (matching.reduce((sum, result) => sum + result.overallScore, 0) / matching.length).toFixed(2),
        ),
      }
    }),
  }
}

