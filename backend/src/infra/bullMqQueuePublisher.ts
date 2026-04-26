import { Queue, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import type { Redis as IORedisInstance, RedisOptions } from 'ioredis'
import type { QueuePublisher } from '../domain/interfaces'

export type BullMqQueuePublisherOptions = {
  redisUrl?: string
  connection?: IORedisInstance
  redisOptions?: RedisOptions
  defaultJobOptions?: ConstructorParameters<typeof Queue>[1] extends infer Options
    ? Options extends { defaultJobOptions?: infer JobOptions }
      ? JobOptions
      : Record<string, unknown>
    : Record<string, unknown>
}

const buildConnection = (input: BullMqQueuePublisherOptions): IORedisInstance => {
  if (input.connection) {
    return input.connection
  }

  const baseOptions: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
    ...input.redisOptions,
  }

  if (input.redisUrl) {
    return new IORedis(input.redisUrl, baseOptions)
  }

  return new IORedis(baseOptions)
}

export class BullMqQueuePublisher implements QueuePublisher {
  private readonly connection: IORedisInstance
  private readonly queues = new Map<string, Queue>()
  private readonly defaultJobOptions?: BullMqQueuePublisherOptions['defaultJobOptions']
  private readonly ownsConnection: boolean

  constructor(options: BullMqQueuePublisherOptions = {}) {
    if (!options.connection && !options.redisUrl && !options.redisOptions) {
      throw new Error('BullMQ publisher requires redisUrl, redisOptions, or an existing connection')
    }

    this.connection = buildConnection(options)
    this.ownsConnection = !options.connection
    this.defaultJobOptions = options.defaultJobOptions
  }

  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    const queue = this.getQueue(topic)
    await queue.add(topic, payload, {
      removeOnComplete: { age: 60 * 60 * 24 * 3, count: 1_000 },
      removeOnFail: { age: 60 * 60 * 24 * 14 },
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
    })
  }

  getQueue(topic: string): Queue {
    const existing = this.queues.get(topic)
    if (existing) {
      return existing
    }

    const queue = new Queue(topic, {
      connection: this.connection as unknown as ConnectionOptions,
      defaultJobOptions: this.defaultJobOptions,
    })
    this.queues.set(topic, queue)
    return queue
  }

  async close(): Promise<void> {
    const closures = Array.from(this.queues.values()).map((queue) => queue.close())
    await Promise.allSettled(closures)
    this.queues.clear()

    if (this.ownsConnection) {
      this.connection.disconnect()
    }
  }

  get redisConnection(): IORedisInstance {
    return this.connection
  }
}

export const createBullMqQueuePublisher = (options: BullMqQueuePublisherOptions): BullMqQueuePublisher =>
  new BullMqQueuePublisher(options)
