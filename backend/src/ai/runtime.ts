import type { AiGateway } from '../domain/interfaces'
import { HeuristicAiGateway } from './heuristicAiGateway'
import { OpenAiGateway } from './openAiGateway'

export type AiRuntimeMode = 'heuristic' | 'openai'

type JudgeLike = {
  judgeCase(payload: Record<string, unknown>): Promise<{
    criteria: Array<{ name: string; rationale: string; score: number }>
    overallScore: number
    pass: boolean
    summary: string
  }>
}

export const createAiGateway = (): { gateway: AiGateway & Partial<JudgeLike>; mode: AiRuntimeMode } => {
  const provider = process.env.AI_PROVIDER || 'auto'
  const apiKey = process.env.OPENAI_API_KEY

  if (provider === 'openai') {
    if (!apiKey) {
      throw new Error('AI_PROVIDER is set to openai but OPENAI_API_KEY is missing')
    }

    return {
      mode: 'openai',
      gateway: new OpenAiGateway({
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        judgeModel: process.env.OPENAI_JUDGE_MODEL || 'gpt-5',
      }),
    }
  }

  if (provider === 'auto' && apiKey) {
    return {
      mode: 'openai',
      gateway: new OpenAiGateway({
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        judgeModel: process.env.OPENAI_JUDGE_MODEL || 'gpt-5',
      }),
    }
  }

  return {
    mode: 'heuristic',
    gateway: new HeuristicAiGateway(),
  }
}
