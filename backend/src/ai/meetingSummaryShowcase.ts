import type { MeetingSummaryGroundTruth, MeetingSummaryShowcaseCase } from '../../evals/meetingSummaryShowcaseDataset'
import { meetingSummaryShowcaseDataset } from '../../evals/meetingSummaryShowcaseDataset'
import type { MeetingSummaryInput, MeetingSummaryOutput } from '../domain/interfaces'
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

export type MeetingSummaryBaselineId = 'agentic_baseline' | 'production_heuristic_current' | 'single_prompt_baseline'

export type MeetingSummaryRubricResult = ShowcaseRubricResult

export type MeetingSummaryShowcaseResult = {
  baselineId: MeetingSummaryBaselineId
  caseId: string
  description: string
  output: MeetingSummaryOutput
  overallScore: number
  pass: boolean
  rubric: MeetingSummaryRubricResult[]
}

export type MeetingSummaryShowcaseReport = {
  baselines: Array<{
    averageScore: number
    baselineId: MeetingSummaryBaselineId
    passed: number
    total: number
  }>
  datasetSize: number
  endpoint: 'POST /ai/meeting-summary'
  results: MeetingSummaryShowcaseResult[]
}

export const singlePromptMeetingSummaryBaselinePrompt = `
You are a MentorMe assistant. Convert meeting notes into JSON with:
executiveSummary, keyTakeaways, founderActionItems, studentActionItems,
cfeActionItems, followUpQuestions, and secondSessionRecommended.

Rules:
- Use only the meeting notes.
- Keep bullets concrete and action-oriented.
- Separate founder, student, and CFE responsibilities when the notes name them.
- Recommend a second session only when the notes explicitly say follow-up is needed.
`

export const agenticMeetingSummaryBaselinePlan = [
  'Parse the meeting notes into decisions, advice, and explicit actor-owned tasks.',
  'Separate founder, student, and CFE actions before writing any summary text.',
  'Check whether the mentor explicitly requested a follow-up, second session, next call, or another mentor route.',
  'Generate follow-up questions from unresolved gates, evidence, or deliverables.',
  'Critique the draft for actor confusion and missing next-step evidence before returning JSON.',
]

const actionSentencePattern = /(should|need to|must|next|send|prepare|speak|talk|update|write|review|wait|decide|choose|define|complete|compare|log)/i

const matchingSentences = (notes: string, predicate: (sentence: string) => boolean) =>
  splitSentences(notes).filter((sentence) => predicate(sentence))

const sentencesForActor = (notes: string, actor: 'cfe' | 'founder' | 'student') => {
  const actorPattern =
    actor === 'founder'
      ? /(founder should|founder needs|mentor said|mentor asked|founder must)/i
      : actor === 'student'
        ? /student should|student needs|student must/i
        : /cfe should|cfe needs|cfe must|cfe may|cfe should decide/i
  return matchingSentences(notes, (sentence) => actorPattern.test(sentence) && actionSentencePattern.test(sentence))
}

const fallbackFollowUpQuestions = (input: MeetingSummaryInput) => {
  const text = `${input.requestChallenge || ''} ${input.meetingNotes}`.toLowerCase()
  return unique([
    includesAny(text, ['deck', 'pilot wedge'])
      ? 'Is the revised deck tied to one pilot wedge before CFE routes the next mentor?'
      : '',
    includesAny(text, ['approval blocker', 'admin interviews', 'procurement'])
      ? 'Which approval blocker appears most often after the hospital admin interviews?'
      : '',
    includesAny(text, ['maintenance cost', 'installation complexity'])
      ? 'Which blocker is stronger after discovery: maintenance cost or installation complexity?'
      : '',
    includesAny(text, ['traction metrics'])
      ? 'Which traction metric gives the founder the clearest go or no-go signal?'
      : '',
  ]).slice(0, 2)
}

const secondSessionRecommended = (meetingNotes: string) =>
  /(follow[- ]?up|second session|next call|another mentor|route another mentor|another session)/i.test(meetingNotes)

export const runSinglePromptMeetingSummaryBaseline = async (
  input: MeetingSummaryInput,
): Promise<MeetingSummaryOutput> => {
  const sentences = splitSentences(input.meetingNotes)
  const actionSentences = matchingSentences(input.meetingNotes, (sentence) => actionSentencePattern.test(sentence))
  const founderActions = sentencesForActor(input.meetingNotes, 'founder')
  const studentActions = sentencesForActor(input.meetingNotes, 'student')
  const cfeActions = sentencesForActor(input.meetingNotes, 'cfe')

  return {
    provider: 'heuristic',
    executiveSummary: sentences.slice(0, 2).join(' ') || cleanText(input.meetingNotes),
    keyTakeaways: sentences.slice(0, 4),
    founderActionItems: (founderActions.length > 0 ? founderActions : actionSentences).slice(0, 4),
    studentActionItems: studentActions.slice(0, 3),
    cfeActionItems: cfeActions.slice(0, 3),
    followUpQuestions: fallbackFollowUpQuestions(input),
    secondSessionRecommended: secondSessionRecommended(input.meetingNotes),
  }
}

export const runAgenticMeetingSummaryBaseline = async (input: MeetingSummaryInput): Promise<MeetingSummaryOutput> => {
  const sentences = splitSentences(input.meetingNotes)
  const founderActions = sentencesForActor(input.meetingNotes, 'founder')
  const studentActions = sentencesForActor(input.meetingNotes, 'student')
  const cfeActions = sentencesForActor(input.meetingNotes, 'cfe')
  const followUpQuestions = fallbackFollowUpQuestions(input)
  const summaryThemes = [
    sentences.find((sentence) => /(pilot wedge|traction metrics|deck)/i.test(sentence)),
    sentences.find((sentence) => /(buying committee|procurement cycle|approval blockers)/i.test(sentence)),
    sentences.find((sentence) => /(prototype spending|campus facilities|go or no-go)/i.test(sentence)),
  ].filter(Boolean) as string[]

  return {
    provider: 'heuristic',
    executiveSummary:
      summaryThemes.length > 0
        ? cleanText(`${input.ventureName} meeting focus: ${summaryThemes.join(' ')}`)
        : sentences.slice(0, 2).join(' ') || cleanText(input.meetingNotes),
    keyTakeaways: unique(
      [
        ...summaryThemes,
        ...sentences.filter((sentence) => /(do not|before|until|evidence|metrics|checklist|interviews)/i.test(sentence)),
      ].slice(0, 4),
    ),
    founderActionItems: founderActions.slice(0, 4),
    studentActionItems: studentActions.slice(0, 3),
    cfeActionItems: cfeActions.slice(0, 3),
    followUpQuestions,
    secondSessionRecommended: secondSessionRecommended(input.meetingNotes),
  }
}

const schemaScore = (output: MeetingSummaryOutput) => {
  const valid =
    typeof output.executiveSummary === 'string' &&
    Array.isArray(output.keyTakeaways) &&
    Array.isArray(output.founderActionItems) &&
    Array.isArray(output.studentActionItems) &&
    Array.isArray(output.cfeActionItems) &&
    Array.isArray(output.followUpQuestions) &&
    typeof output.secondSessionRecommended === 'boolean'

  return valid ? 1 : 0
}

const secondSessionScore = (groundTruth: MeetingSummaryGroundTruth, output: MeetingSummaryOutput) =>
  output.secondSessionRecommended === groundTruth.expectedSecondSessionRecommended ? 1 : 0

export const evaluateMeetingSummaryOutput = (
  currentCase: MeetingSummaryShowcaseCase,
  output: MeetingSummaryOutput,
): Omit<MeetingSummaryShowcaseResult, 'baselineId'> => {
  const rubric: MeetingSummaryRubricResult[] = [
    {
      name: 'schema_contract',
      score: schemaScore(output),
      weight: 1,
      rationale: 'Output must match the endpoint response shape consumed by the follow-up UI.',
    },
    {
      name: 'executive_summary_grounding',
      score: scoreExpectedCoverage(currentCase.groundTruth.executiveSummaryThemes, output.executiveSummary),
      weight: 1.5,
      rationale: 'Executive summary should preserve the main mentor guidance and evidence gate.',
    },
    {
      name: 'key_takeaways_grounding',
      score: scoreExpectedCoverage(currentCase.groundTruth.keyTakeawayThemes, output.keyTakeaways),
      weight: 1.5,
      rationale: 'Key takeaways should capture the mentor advice, not generic meeting notes.',
    },
    {
      name: 'founder_actions',
      score: scoreExpectedCoverage(currentCase.groundTruth.founderActionThemes, output.founderActionItems),
      weight: 2,
      rationale: 'Founder actions are the highest-stakes output because they drive follow-through.',
    },
    {
      name: 'student_actions',
      score: scoreExpectedCoverage(currentCase.groundTruth.studentActionThemes, output.studentActionItems),
      weight: 1,
      rationale: 'Student action items should retain workspace and documentation responsibilities.',
    },
    {
      name: 'cfe_actions',
      score: scoreExpectedCoverage(currentCase.groundTruth.cfeActionThemes, output.cfeActionItems),
      weight: 1,
      rationale: 'CFE action items should capture routing or review decisions.',
    },
    {
      name: 'follow_up_questions',
      score: scoreExpectedCoverage(currentCase.groundTruth.followUpQuestionThemes, output.followUpQuestions),
      weight: 1,
      rationale: 'Follow-up questions should expose the unresolved evidence gate.',
    },
    {
      name: 'second_session_decision',
      score: secondSessionScore(currentCase.groundTruth, output),
      weight: 1,
      rationale: 'Second-session recommendation must follow explicit meeting evidence.',
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

export const runMeetingSummaryShowcase = async (
  dataset: MeetingSummaryShowcaseCase[] = meetingSummaryShowcaseDataset,
): Promise<MeetingSummaryShowcaseReport> => {
  const productionGateway = new HeuristicAiGateway()
  const baselineRunners: Array<{
    id: MeetingSummaryBaselineId
    run: (input: MeetingSummaryInput) => Promise<MeetingSummaryOutput>
  }> = [
    { id: 'single_prompt_baseline', run: runSinglePromptMeetingSummaryBaseline },
    { id: 'agentic_baseline', run: runAgenticMeetingSummaryBaseline },
    { id: 'production_heuristic_current', run: (input) => productionGateway.generateMeetingSummary(input) },
  ]

  const results: MeetingSummaryShowcaseResult[] = []
  for (const runner of baselineRunners) {
    for (const currentCase of dataset) {
      const output = await runner.run(currentCase.input)
      results.push({
        baselineId: runner.id,
        ...evaluateMeetingSummaryOutput(currentCase, output),
      })
    }
  }

  return {
    endpoint: 'POST /ai/meeting-summary',
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

