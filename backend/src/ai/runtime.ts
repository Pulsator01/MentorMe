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
  const heuristicFallback = new HeuristicAiGateway()
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 15000)
  const maxAttempts = Number(process.env.OPENAI_MAX_ATTEMPTS || 2)

  if (provider === 'openai') {
    if (!apiKey) {
      throw new Error('AI_PROVIDER is set to openai but OPENAI_API_KEY is missing')
    }

    return {
      mode: 'openai',
      gateway: new OpenAiGateway({
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL,
        fallbackGateway: heuristicFallback,
        judgeModel: process.env.OPENAI_JUDGE_MODEL || 'gpt-5',
        maxAttempts,
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        requestedProvider: 'openai',
        timeoutMs,
      }),
    }
  }

  if (provider === 'auto' && apiKey) {
    return {
      mode: 'openai',
      gateway: new OpenAiGateway({
        apiKey,
        baseUrl: process.env.OPENAI_BASE_URL,
        fallbackGateway: heuristicFallback,
        judgeModel: process.env.OPENAI_JUDGE_MODEL || 'gpt-5',
        maxAttempts,
        model: process.env.OPENAI_MODEL || 'gpt-5-mini',
        requestedProvider: 'auto',
        timeoutMs,
      }),
    }
  }

  return {
    mode: 'heuristic',
    gateway: heuristicFallback,
  }
}
