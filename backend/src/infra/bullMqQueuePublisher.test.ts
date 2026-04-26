// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const queueAdd = vi.fn(async () => undefined)
  const queueClose = vi.fn(async () => undefined)

  const QueueCtor = vi.fn(function (this: Record<string, unknown>, name: string, opts: Record<string, unknown>) {
    this.name = name
    this.opts = opts
    this.add = queueAdd
    this.close = queueClose
  })

  const ioRedisDisconnect = vi.fn()
  const IORedisCtor = vi.fn(function (this: Record<string, unknown>, ...args: unknown[]) {
    this.args = args
    this.disconnect = ioRedisDisconnect
  })

  return {
    queueAdd,
    queueClose,
    QueueCtor,
    ioRedisDisconnect,
    IORedisCtor,
  }
})

vi.mock('bullmq', () => ({
  Queue: mocks.QueueCtor,
}))

vi.mock('ioredis', () => ({
  default: mocks.IORedisCtor,
}))

describe('BullMqQueuePublisher', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('throws when no connection or redisUrl is configured', async () => {
    const { createBullMqQueuePublisher } = await import('./bullMqQueuePublisher')
    expect(() => createBullMqQueuePublisher({})).toThrow(/redisUrl/i)
  })

  it('creates an IORedis connection from the provided URL with worker-safe defaults', async () => {
    const { createBullMqQueuePublisher } = await import('./bullMqQueuePublisher')

    const publisher = createBullMqQueuePublisher({ redisUrl: 'redis://localhost:6379' })

    expect(mocks.IORedisCtor).toHaveBeenCalledTimes(1)
    const [arg0, arg1] = mocks.IORedisCtor.mock.calls[0]
    expect(arg0).toBe('redis://localhost:6379')
    expect(arg1).toMatchObject({
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
    expect(publisher.redisConnection).toBeDefined()
  })

  it('creates a queue lazily per topic and caches it across publishes', async () => {
    const { createBullMqQueuePublisher } = await import('./bullMqQueuePublisher')

    const publisher = createBullMqQueuePublisher({ redisUrl: 'redis://localhost:6379' })

    await publisher.publish('mentor.outreach_created', { mentorId: 'm-1' })
    await publisher.publish('mentor.outreach_created', { mentorId: 'm-2' })
    await publisher.publish('request.updated', { requestId: 'req-1' })

    expect(mocks.QueueCtor).toHaveBeenCalledTimes(2)
    const queueNames = mocks.QueueCtor.mock.calls.map((call) => call[0])
    expect(queueNames).toEqual(['mentor.outreach_created', 'request.updated'])

    expect(mocks.queueAdd).toHaveBeenCalledTimes(3)
    const firstCall = mocks.queueAdd.mock.calls[0] as unknown as [string, Record<string, unknown>, Record<string, unknown>]
    expect(firstCall[0]).toBe('mentor.outreach_created')
    expect(firstCall[1]).toEqual({ mentorId: 'm-1' })
    expect(firstCall[2]).toMatchObject({
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
    })
    expect(firstCall[2].removeOnComplete).toBeDefined()
    expect(firstCall[2].removeOnFail).toBeDefined()
  })

  it('reuses an injected IORedis connection without creating a new one', async () => {
    const { createBullMqQueuePublisher } = await import('./bullMqQueuePublisher')

    const externalConnection = {
      disconnect: vi.fn(),
    } as unknown as Parameters<typeof createBullMqQueuePublisher>[0]['connection']

    createBullMqQueuePublisher({ connection: externalConnection })
    expect(mocks.IORedisCtor).not.toHaveBeenCalled()
  })

  it('closes all queues and disconnects redis when it owns the connection', async () => {
    const { createBullMqQueuePublisher } = await import('./bullMqQueuePublisher')

    const publisher = createBullMqQueuePublisher({ redisUrl: 'redis://localhost:6379' })
    await publisher.publish('topic-a', {})
    await publisher.publish('topic-b', {})

    await publisher.close()

    expect(mocks.queueClose).toHaveBeenCalledTimes(2)
    expect(mocks.ioRedisDisconnect).toHaveBeenCalledTimes(1)
  })

  it('does not disconnect an externally provided connection on close', async () => {
    const { createBullMqQueuePublisher } = await import('./bullMqQueuePublisher')

    const externalDisconnect = vi.fn()
    const externalConnection = {
      disconnect: externalDisconnect,
    } as unknown as Parameters<typeof createBullMqQueuePublisher>[0]['connection']

    const publisher = createBullMqQueuePublisher({ connection: externalConnection })
    await publisher.publish('topic-a', {})

    await publisher.close()

    expect(mocks.queueClose).toHaveBeenCalledTimes(1)
    expect(externalDisconnect).not.toHaveBeenCalled()
  })
})
