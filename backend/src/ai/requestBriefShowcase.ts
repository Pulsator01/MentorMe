import type { RequestBriefGroundTruth, RequestBriefShowcaseCase } from '../../evals/requestBriefShowcaseDataset'
import { requestBriefShowcaseDataset } from '../../evals/requestBriefShowcaseDataset'
import type { RequestBriefInput, RequestBriefOutput } from '../domain/interfaces'
import { HeuristicAiGateway } from './heuristicAiGateway'
import {
  cleanText,
  computeOverallScore,
  includesAny,
  scoreExpectedCoverage,
  splitSentences,
  unique,
  type ShowcaseRubricResult,
} from './showcaseScoring'

export type RequestBriefBaselineId = 'agentic_baseline' | 'production_heuristic_current' | 'single_prompt_baseline'

export type RequestBriefRubricResult = ShowcaseRubricResult

export type RequestBriefShowcaseResult = {
  baselineId: RequestBriefBaselineId
  caseId: string
  description: string
  output: RequestBriefOutput
  overallScore: number
  pass: boolean
  rubric: RequestBriefRubricResult[]
}

export type RequestBriefShowcaseReport = {
  baselines: Array<{
    averageScore: number
    baselineId: RequestBriefBaselineId
    passed: number
    total: number
  }>
  datasetSize: number
  endpoint: 'POST /ai/request-brief'
  results: RequestBriefShowcaseResult[]
}

export const singlePromptRequestBriefBaselinePrompt = `
You are a MentorMe assistant. Convert the founder notes into JSON with:
briefSummary, challenge, desiredOutcome, mentorFitTags, readinessSignals,
missingInformation, and cfeRoutingNote.

Rules:
- Preserve the founder's intent.
- Do not invent facts.
- Keep the output concise.
- If context is missing, list it in missingInformation.
`

export const agenticRequestBriefBaselinePlan = [
  'Parse venture context: stage, TRL, BRL, domain, artifacts, and stated desired outcome.',
  'Extract the real routing challenge from the notes, separating symptoms from decisions needed.',
  'Infer mentor-fit tags only from supplied context and obvious domain language.',
  'Run a gap check for missing outcome, missing artifacts, missing domain, and unclear routing decision.',
  'Critique the draft against CFE routing needs and revise the routing note before returning JSON.',
]

const keywordTags = (input: RequestBriefInput) => {
  const text = `${input.ventureName} ${input.domain || ''} ${input.stage || ''} ${input.rawNotes} ${input.desiredOutcomeHint || ''}`.toLowerCase()
  return unique([
    input.domain ? input.domain.toLowerCase() : '',
    input.stage ? input.stage.toLowerCase() : '',
    includesAny(text, ['fundrais', 'investor', 'traction proof']) ? 'fundraising' : '',
    includesAny(text, ['pilot', 'campus facilities']) ? 'pilot design' : '',
    includesAny(text, ['regulat', 'compliance']) ? 'regulatory' : '',
    includesAny(text, ['hospital', 'procurement', 'buyer']) ? 'hospital procurement' : '',
    includesAny(text, ['customer discovery', 'customer', 'facilities people', 'buyer']) ? 'customer discovery' : '',
    includesAny(text, ['hardware', 'prototype', 'installation', 'maintenance']) ? 'hardware ops' : '',
    includesAny(text, ['drone', 'crop surveying']) ? 'industrial drones' : '',
    includesAny(text, ['greywater', 'water treatment', 'recycling']) ? 'water treatment' : '',
  ]).slice(0, 6)
}

const readinessSignals = (input: RequestBriefInput) =>
  unique([
    input.trl ? `TRL ${input.trl}` : '',
    input.brl ? `BRL ${input.brl}` : '',
    input.stage ? `${input.stage} stage ask` : '',
    input.artifactRefs?.length ? `${input.artifactRefs.length} supporting artifact(s)` : '',
  ])

const missingContext = (input: RequestBriefInput) =>
  unique([
    !input.desiredOutcomeHint ? 'Clarify the concrete desired outcome.' : '',
    !input.artifactRefs?.length ? 'Attach a deck, memo, or test note.' : '',
    !input.domain ? 'Name the market or domain.' : '',
  ])

const desiredOutcomeFromInput = (input: RequestBriefInput, fallback: string) =>
  cleanText(input.desiredOutcomeHint || '') || fallback

export const runSinglePromptRequestBriefBaseline = async (input: RequestBriefInput): Promise<RequestBriefOutput> => {
  const sentences = splitSentences(input.rawNotes)
  const summary = sentences.slice(0, 2).join(' ') || cleanText(input.rawNotes)
  const tags = keywordTags(input).slice(0, 4)
  const missing = unique([
    !input.desiredOutcomeHint ? 'Clarify the concrete desired outcome.' : '',
    !input.artifactRefs?.length ? 'Attach a deck, memo, or note before routing.' : '',
  ])

  return {
    provider: 'heuristic',
    briefSummary: summary,
    challenge: sentences[0] || summary,
    desiredOutcome: desiredOutcomeFromInput(
      input,
      'Leave the session with clearer mentor guidance and a concrete next step.',
    ),
    mentorFitTags: tags.length > 0 ? tags : ['general strategy'],
    readinessSignals: readinessSignals(input),
    missingInformation: missing,
    cfeRoutingNote:
      missing.length > 0
        ? 'CFE should review the missing context before routing this request.'
        : 'CFE can review this request for mentor routing.',
  }
}

export const runAgenticRequestBriefBaseline = async (input: RequestBriefInput): Promise<RequestBriefOutput> => {
  const sentences = splitSentences(input.rawNotes)
  const tags = keywordTags(input)
  const missing = missingContext(input)
  const firstDecisionSentence =
    sentences.find((sentence) => /(need|unsure|not clear|blocker|help|before)/i.test(sentence)) || sentences[0] || cleanText(input.rawNotes)
  const blockerLanguage = includesAny(input.rawNotes, ['blocker', 'maintenance cost', 'installation complexity'])
    ? 'The founder needs to identify the real adoption blocker before committing more build time.'
    : ''
  const challenge = cleanText([firstDecisionSentence, blockerLanguage].filter(Boolean).join(' '))
  const desiredOutcome = desiredOutcomeFromInput(
    input,
    includesAny(input.rawNotes, ['blocker', 'prototype'])
      ? 'Leave with a sharper customer-discovery plan, the highest-risk blocker to validate, and a go/no-go decision for the next prototype.'
      : 'Leave with a mentor-ready next-step plan and a clearer routing decision from CFE.',
  )
  const routeable = missing.length === 0

  return {
    provider: 'heuristic',
    briefSummary: cleanText(
      `${input.ventureName} needs help with ${challenge.charAt(0).toLowerCase()}${challenge.slice(1)}`,
    ),
    challenge,
    desiredOutcome,
    mentorFitTags: tags.length > 0 ? tags : ['customer discovery'],
    readinessSignals: readinessSignals(input),
    missingInformation: missing,
    cfeRoutingNote: routeable
      ? `The ask is routeable. Prioritize mentors with ${tags.slice(0, 3).join(', ') || 'relevant operator'} experience.`
      : `Clarify missing context before outreach: ${missing.join(' ')}`,
  }
}

const schemaScore = (output: RequestBriefOutput) => {
  const valid =
    typeof output.briefSummary === 'string' &&
    typeof output.challenge === 'string' &&
    typeof output.desiredOutcome === 'string' &&
    Array.isArray(output.mentorFitTags) &&
    Array.isArray(output.readinessSignals) &&
    Array.isArray(output.missingInformation) &&
    typeof output.cfeRoutingNote === 'string'

  return valid ? 1 : 0
}

const missingInformationScore = (groundTruth: RequestBriefGroundTruth, output: RequestBriefOutput) => {
  if (groundTruth.missingInformation.length === 0) {
    return output.missingInformation.length === 0 ? 1 : 0.65
  }

  return scoreExpectedCoverage(groundTruth.missingInformation, output.missingInformation)
}

const routingDecisionScore = (groundTruth: RequestBriefGroundTruth, output: RequestBriefOutput) => {
  const note = output.cfeRoutingNote.toLowerCase()
  const decisionMatches =
    groundTruth.expectedRoutingDecision === 'route'
      ? includesAny(note, ['route', 'routing', 'outreach'])
      : includesAny(note, ['missing', 'clarify', 'before'])
  const mentionScore = scoreExpectedCoverage(groundTruth.cfeRoutingMustMention, output.cfeRoutingNote)

  return ((decisionMatches ? 1 : 0) + mentionScore) / 2
}

export const evaluateRequestBriefOutput = (
  currentCase: RequestBriefShowcaseCase,
  output: RequestBriefOutput,
): Omit<RequestBriefShowcaseResult, 'baselineId'> => {
  const textForChallenge = `${output.briefSummary} ${output.challenge}`
  const rubric: RequestBriefRubricResult[] = [
    {
      name: 'schema_contract',
      score: schemaScore(output),
      weight: 1,
      rationale: 'Output must match the endpoint response shape expected by the UI.',
    },
    {
      name: 'challenge_grounding',
      score: scoreExpectedCoverage(currentCase.groundTruth.challengeThemes, textForChallenge),
      weight: 2,
      rationale: 'Challenge should preserve the real founder problem from the input notes.',
    },
    {
      name: 'outcome_grounding',
      score: scoreExpectedCoverage(currentCase.groundTruth.desiredOutcomeThemes, output.desiredOutcome),
      weight: 2,
      rationale: 'Desired outcome should reflect the mentor session result the founder needs.',
    },
    {
      name: 'mentor_fit_tags',
      score: scoreExpectedCoverage(currentCase.groundTruth.mentorFitTags, output.mentorFitTags),
      weight: 1.5,
      rationale: 'Tags should help CFE pick the right mentor profile without invented categories.',
    },
    {
      name: 'readiness_signals',
      score: scoreExpectedCoverage(currentCase.groundTruth.readinessSignals, output.readinessSignals),
      weight: 1,
      rationale: 'Readiness signals should retain TRL, BRL, stage, and artifact context.',
    },
    {
      name: 'missing_information',
      score: missingInformationScore(currentCase.groundTruth, output),
      weight: 1.5,
      rationale: 'The assistant should not route vague requests without naming missing context.',
    },
    {
      name: 'cfe_routing_note',
      score: routingDecisionScore(currentCase.groundTruth, output),
      weight: 1.5,
      rationale: 'Routing note should tell CFE whether to route now or clarify first.',
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

export const runRequestBriefShowcase = async (
  dataset: RequestBriefShowcaseCase[] = requestBriefShowcaseDataset,
): Promise<RequestBriefShowcaseReport> => {
  const productionGateway = new HeuristicAiGateway()
  const baselineRunners: Array<{
    id: RequestBriefBaselineId
    run: (input: RequestBriefInput) => Promise<RequestBriefOutput>
  }> = [
    { id: 'single_prompt_baseline', run: runSinglePromptRequestBriefBaseline },
    { id: 'agentic_baseline', run: runAgenticRequestBriefBaseline },
    { id: 'production_heuristic_current', run: (input) => productionGateway.generateRequestBrief(input) },
  ]

  const results: RequestBriefShowcaseResult[] = []
  for (const runner of baselineRunners) {
    for (const currentCase of dataset) {
      const output = await runner.run(currentCase.input)
      results.push({
        baselineId: runner.id,
        ...evaluateRequestBriefOutput(currentCase, output),
      })
    }
  }

  return {
    endpoint: 'POST /ai/request-brief',
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
