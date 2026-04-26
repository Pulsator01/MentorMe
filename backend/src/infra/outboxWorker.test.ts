// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OutboxEvent } from '../domain/types'
import type { PlatformRepository } from '../domain/interfaces'

const mocks = vi.hoisted(() => {
  const handlersByTopic = new Map<string, (job: unknown) => Promise<unknown>>()
  const failureHandlersByTopic = new Map<string, (job: unknown, err: unknown) => void>()
  const closedTopics: string[] = []

  const WorkerCtor = vi.fn(function (
    this: Record<string, unknown>,
    topic: string,
    handler: (job: unknown) => Promise<unknown>,
  ) {
    this.topic = topic
    this.handler = handler
    handlersByTopic.set(topic, handler)
    this.on = vi.fn((event: string, listener: (job: unknown, err: unknown) => void) => {
      if (event === 'failed') {
        failureHandlersByTopic.set(topic, listener)
      }
    })
    this.close = vi.fn(async () => {
      closedTopics.push(topic)
    })
  })

  return {
    WorkerCtor,
    handlersByTopic,
    failureHandlersByTopic,
    closedTopics,
  }
})

vi.mock('bullmq', () => ({
  Worker: mocks.WorkerCtor,
}))

const buildRepository = (events: OutboxEvent[] = []): PlatformRepository => {
  const store = new Map<string, OutboxEvent>(events.map((event) => [event.id, event]))

  const repo: Partial<PlatformRepository> = {
    async findOutboxEventById(id: string) {
      return store.get(id)
    },
    async saveOutboxEvent(event: OutboxEvent) {
      store.set(event.id, event)
      return event
    },
  }

  return repo as PlatformRepository
}

const sampleEvent = (overrides: Partial<OutboxEvent> = {}): OutboxEvent => ({
  id: overrides.id || 'out-test-1',
  topic: overrides.topic || 'request.submitted',
  aggregateType: overrides.aggregateType || 'mentor_request',
  aggregateId: overrides.aggregateId || 'req-1',
  payload: overrides.payload || { ventureId: 'venture-1' },
  status: overrides.status || 'pending',
  createdAt: overrides.createdAt || '2026-04-26T00:00:00.000Z',
})

beforeEach(() => {
  mocks.WorkerCtor.mockClear()
  mocks.handlersByTopic.clear()
  mocks.failureHandlersByTopic.clear()
  mocks.closedTopics.length = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('startOutboxWorkers', () => {
  it('creates one BullMQ Worker per topic by default', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')
    const { OUTBOX_TOPICS } = await import('../domain/platformService')

    const running = startOutboxWorkers({
      repository: buildRepository(),
      connection: { kind: 'connection' } as never,
    })

    expect(mocks.WorkerCtor).toHaveBeenCalledTimes(OUTBOX_TOPICS.length)
    expect(running.workers.length).toBe(OUTBOX_TOPICS.length)
  })

  it('honors a custom topics list and concurrency', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')

    startOutboxWorkers({
      repository: buildRepository(),
      connection: { kind: 'connection' } as never,
      topics: ['custom.topic'],
      concurrency: 12,
    })

    expect(mocks.WorkerCtor).toHaveBeenCalledTimes(1)
    const call = mocks.WorkerCtor.mock.calls[0] as unknown as [string, (job: unknown) => Promise<unknown>, { concurrency: number }]
    expect(call[0]).toBe('custom.topic')
    expect(call[2]).toMatchObject({ concurrency: 12 })
  })

  it('marks the corresponding outbox event as processed when a job runs', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')

    const event = sampleEvent({ id: 'out-abc' })
    const repository = buildRepository([event])
    const saveSpy = vi.spyOn(repository, 'saveOutboxEvent')

    startOutboxWorkers({
      repository,
      connection: { kind: 'connection' } as never,
    })

    const handler = mocks.handlersByTopic.get('request.submitted')
    expect(handler).toBeDefined()

    const result = await handler!({
      id: 'job-1',
      data: { outboxId: 'out-abc' },
    })

    expect(result).toEqual({ processed: true, outboxId: 'out-abc' })
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({ id: 'out-abc', status: 'processed' }))
  })

  it('skips processing when the outboxId is missing on the job payload', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')

    const repository = buildRepository()
    const saveSpy = vi.spyOn(repository, 'saveOutboxEvent')

    startOutboxWorkers({
      repository,
      connection: {} as never,
    })

    const handler = mocks.handlersByTopic.get('request.submitted')!
    const result = await handler({ id: 'job-2', data: {} })

    expect(result).toEqual({ skipped: true, reason: 'missing-outbox-id' })
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('skips processing when the referenced event no longer exists', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')

    const repository = buildRepository()
    const saveSpy = vi.spyOn(repository, 'saveOutboxEvent')

    startOutboxWorkers({
      repository,
      connection: {} as never,
    })

    const handler = mocks.handlersByTopic.get('request.submitted')!
    const result = await handler({ id: 'job-3', data: { outboxId: 'out-missing' } })

    expect(result).toEqual({ skipped: true, reason: 'unknown-event' })
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('does not re-save when the event is already processed (idempotent)', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')

    const event = sampleEvent({ id: 'out-already', status: 'processed' })
    const repository = buildRepository([event])
    const saveSpy = vi.spyOn(repository, 'saveOutboxEvent')

    startOutboxWorkers({
      repository,
      connection: {} as never,
    })

    const handler = mocks.handlersByTopic.get('request.submitted')!
    const result = await handler({ id: 'job-4', data: { outboxId: 'out-already' } })

    expect(result).toEqual({ skipped: true, reason: 'already-processed' })
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('logs failures via the configured logger', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')

    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }

    startOutboxWorkers({
      repository: buildRepository(),
      connection: {} as never,
      topics: ['test.topic'],
      logger,
    })

    const failureHandler = mocks.failureHandlersByTopic.get('test.topic')
    expect(failureHandler).toBeDefined()

    failureHandler!({ id: 'job-fail', attemptsMade: 3 }, new Error('boom'))

    expect(logger.error).toHaveBeenCalledWith(
      'outbox.job.failed',
      expect.objectContaining({ topic: 'test.topic', jobId: 'job-fail', attemptsMade: 3, error: 'boom' }),
    )
  })

  it('closes all workers when close() is called', async () => {
    const { startOutboxWorkers } = await import('./outboxWorker')

    const running = startOutboxWorkers({
      repository: buildRepository(),
      connection: {} as never,
      topics: ['t1', 't2', 't3'],
    })

    await running.close()
    expect(mocks.closedTopics).toEqual(expect.arrayContaining(['t1', 't2', 't3']))
    expect(mocks.closedTopics.length).toBe(3)
  })
})
