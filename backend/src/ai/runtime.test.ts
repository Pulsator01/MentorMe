// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  heuristicInstance: { kind: 'heuristic' },
  openAiInstance: { kind: 'openai' },
  heuristicCtor: vi.fn(() => ({ kind: 'heuristic' })),
  openAiCtor: vi.fn(() => ({ kind: 'openai' })),
}))

vi.mock('./heuristicAiGateway', () => ({
  HeuristicAiGateway: mocks.heuristicCtor,
}))

vi.mock('./openAiGateway', () => ({
  OpenAiGateway: mocks.openAiCtor,
}))

describe('createAiGateway', () => {
  const originalProvider = process.env.AI_PROVIDER
  const originalApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.AI_PROVIDER
    delete process.env.OPENAI_API_KEY
    mocks.heuristicCtor.mockReturnValue(mocks.heuristicInstance)
    mocks.openAiCtor.mockReturnValue(mocks.openAiInstance)
  })

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.AI_PROVIDER
    } else {
      process.env.AI_PROVIDER = originalProvider
    }

    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY
    } else {
      process.env.OPENAI_API_KEY = originalApiKey
    }
  })

  it('falls back to the heuristic gateway when no API key is configured', async () => {
    const { createAiGateway } = await import('./runtime')
    const runtime = createAiGateway()

    expect(runtime.mode).toBe('heuristic')
    expect(runtime.gateway).toBe(mocks.heuristicInstance)
    expect(mocks.openAiCtor).not.toHaveBeenCalled()
  })

  it('prefers the OpenAI gateway in auto mode when credentials exist', async () => {
    process.env.OPENAI_API_KEY = 'test-key'

    const { createAiGateway } = await import('./runtime')
    const runtime = createAiGateway()

    expect(runtime.mode).toBe('openai')
    expect(runtime.gateway).toBe(mocks.openAiInstance)
    expect(mocks.openAiCtor).toHaveBeenCalledTimes(1)
  })

  it('fails fast when OpenAI is forced without a key', async () => {
    process.env.AI_PROVIDER = 'openai'

    const { createAiGateway } = await import('./runtime')

    expect(() => createAiGateway()).toThrow('AI_PROVIDER is set to openai but OPENAI_API_KEY is missing')
  })
})
