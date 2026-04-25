import type {
  MeetingSummaryInput,
  MeetingSummaryOutput,
  MentorRecommendationInput,
  MentorRecommendationOutput,
  RequestBriefInput,
  RequestBriefOutput,
} from '../domain/interfaces'
import type { AiTask } from '../domain/types'

export type AiInvocationMeta = {
  attemptCount: number
  caveats: string[]
  confidence: number
  fallbackUsed: boolean
  finishReason: string
  latencyMs: number
  model: string
  promptVersion: string
  requestedProvider: 'auto' | 'heuristic' | 'openai'
  shouldAbstain: boolean
  usageInputTokens: number
  usageOutputTokens: number
  usageTotalTokens: number
}

const AI_META_KEY = '__mentorMeAiMeta'

const clampConfidence = (value: number) => Number(Math.max(0, Math.min(0.99, value)).toFixed(2))

export const estimateTokens = (value: unknown) => {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return Math.max(1, Math.ceil((text || '').length / 4))
}

export const promptVersionByTask: Record<AiTask, string> = {
  request_brief: 'request-brief-v2',
  mentor_recommendation: 'mentor-recommendation-v2',
  meeting_summary: 'meeting-summary-v2',
}

export const attachAiMeta = <T extends Record<string, unknown>>(output: T, meta: AiInvocationMeta): T => {
  Object.defineProperty(output, AI_META_KEY, {
    configurable: true,
    enumerable: false,
    value: meta,
    writable: false,
  })
  return output
}

export const getAiMeta = (output: unknown): AiInvocationMeta | undefined =>
  output && typeof output === 'object' ? (output as Record<string, unknown>)[AI_META_KEY] as AiInvocationMeta | undefined : undefined

export const withAdjustedMeta = <T extends Record<string, unknown>>(
  output: T,
  update: Partial<AiInvocationMeta>,
): T => {
  const current = getAiMeta(output)
  if (!current) {
    return output
  }
  return attachAiMeta(output, {
    ...current,
    ...update,
    caveats: update.caveats || current.caveats,
  })
}

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)))

export const assessRequestBrief = (input: RequestBriefInput, output: RequestBriefOutput) => {
  const completenessBoost = [input.domain, input.stage, input.desiredOutcomeHint, input.artifactRefs?.length ? 'artifacts' : '']
    .filter(Boolean).length * 0.06
  const missingPenalty = output.missingInformation.length * 0.12
  const confidence = clampConfidence(0.58 + completenessBoost - missingPenalty)
  const shouldAbstain = input.rawNotes.trim().length < 90 || output.missingInformation.length >= 3
  const caveats = unique([
    shouldAbstain ? 'The founder notes are still thin, so CFE should request more context before routing.' : '',
    ...output.missingInformation.slice(0, 2),
  ])
  return { confidence, shouldAbstain, caveats }
}

export const assessMeetingSummary = (input: MeetingSummaryInput, output: MeetingSummaryOutput) => {
  const actionCount =
    output.founderActionItems.length + output.studentActionItems.length + output.cfeActionItems.length
  const confidence = clampConfidence(0.42 + Math.min(0.38, actionCount * 0.06) + (output.keyTakeaways.length > 1 ? 0.08 : 0))
  const shouldAbstain = input.meetingNotes.trim().length < 80 || actionCount < 2
  const caveats = unique([
    shouldAbstain ? 'The meeting notes are too thin to trust the summary without a human pass.' : '',
    output.followUpQuestions.length > 0 ? `Follow-up still needed: ${output.followUpQuestions[0]}` : '',
  ])
  return { confidence, shouldAbstain, caveats }
}

export const assessMentorRecommendation = (input: MentorRecommendationInput, output: MentorRecommendationOutput) => {
  const topScore = output.shortlist[0]?.score || 0
  const confidence = clampConfidence(0.38 + Math.min(0.42, topScore / 160) + Math.min(0.1, output.shortlist.length * 0.03))
  const shouldAbstain = output.shortlist.length === 0 || topScore < 62 || (!input.domain && input.challenge.trim().length < 55)
  const caveats = unique([
    shouldAbstain ? 'The founder ask is not specific enough for a high-confidence mentor ranking.' : '',
    ...output.shortlist.map((item) => item.caution || '').filter(Boolean).slice(0, 2),
  ])
  return { confidence, shouldAbstain, caveats }
}

export const assessAiOutput = (
  task: AiTask,
  input: RequestBriefInput | MeetingSummaryInput | MentorRecommendationInput,
  output: RequestBriefOutput | MeetingSummaryOutput | MentorRecommendationOutput,
) => {
  if (task === 'request_brief') {
    return assessRequestBrief(input as RequestBriefInput, output as RequestBriefOutput)
  }

  if (task === 'meeting_summary') {
    return assessMeetingSummary(input as MeetingSummaryInput, output as MeetingSummaryOutput)
  }

  return assessMentorRecommendation(input as MentorRecommendationInput, output as MentorRecommendationOutput)
}
