import type { AiGateway } from '../domain/interfaces'
import { meetingSummaryCases, mentorRecommendationCases, requestBriefCases } from '../../evals/cases'
import { HeuristicAiGateway } from './heuristicAiGateway'
import { createAiGateway } from './runtime'
import type { JudgeResult } from './openAiGateway'

export type EvalCaseResult = {
  caseId: string
  description: string
  modelProvider: 'heuristic' | 'openai'
  overallScore: number
  pass: boolean
  summary: string
  task: 'meeting_summary' | 'mentor_recommendation' | 'request_brief'
}

export type EvalReport = {
  averageScore: number
  judgeProvider: 'heuristic' | 'openai'
  modelProvider: 'heuristic' | 'openai'
  passed: number
  results: EvalCaseResult[]
  total: number
}

type JudgeGateway = {
  judgeCase(payload: Record<string, unknown>): Promise<JudgeResult>
}

const cases = [...requestBriefCases, ...meetingSummaryCases, ...mentorRecommendationCases]

export const runAiBenchmark = async (
  generator: AiGateway,
  judge: JudgeGateway,
  provider: 'heuristic' | 'openai',
  judgeProvider: 'heuristic' | 'openai',
): Promise<EvalReport> => {
  const results: EvalCaseResult[] = []

  for (const currentCase of cases) {
    const actualOutput =
      currentCase.task === 'request_brief'
        ? await generator.generateRequestBrief(currentCase.input)
        : currentCase.task === 'meeting_summary'
          ? await generator.generateMeetingSummary(currentCase.input)
          : await generator.recommendMentors(currentCase.input)

    const judgement = await judge.judgeCase({
      task: currentCase.task,
      description: currentCase.description,
      input: currentCase.input,
      actualOutput,
      referenceOutput: currentCase.reference,
    })

    results.push({
      caseId: currentCase.id,
      description: currentCase.description,
      task: currentCase.task,
      modelProvider: provider,
      overallScore: judgement.overallScore,
      pass: judgement.pass,
      summary: judgement.summary,
    })
  }

  const averageScore = Number((results.reduce((sum, item) => sum + item.overallScore, 0) / results.length).toFixed(2))

  return {
    total: results.length,
    passed: results.filter((item) => item.pass).length,
    averageScore,
    modelProvider: provider,
    judgeProvider,
    results,
  }
}

export const buildAiBenchmark = () => {
  const { gateway, mode } = createAiGateway()
  const judgeProvider = process.env.AI_JUDGE_PROVIDER || 'auto'

  if (judgeProvider === 'openai') {
    const judgeCapableGateway = gateway as AiGateway & JudgeGateway
    if (typeof judgeCapableGateway.judgeCase !== 'function') {
      throw new Error('AI_JUDGE_PROVIDER is openai but the configured AI gateway does not support judging')
    }

    return {
      generator: gateway,
      judge: judgeCapableGateway,
      mode,
      judgeMode: 'openai' as const,
    }
  }

  if (judgeProvider === 'auto' && typeof (gateway as AiGateway & Partial<JudgeGateway>).judgeCase === 'function') {
    return {
      generator: gateway,
      judge: gateway as AiGateway & JudgeGateway,
      mode,
      judgeMode: mode,
    }
  }

  return {
    generator: gateway,
    judge: new HeuristicAiGateway(),
    mode,
    judgeMode: 'heuristic' as const,
  }
}
