import { Worker, type ConnectionOptions, type Job, type WorkerOptions } from 'bullmq'
import type { Redis as IORedisInstance } from 'ioredis'
import type { PlatformRepository } from '../domain/interfaces'
import { OUTBOX_TOPICS, type OutboxTopic } from '../domain/platformService'

export type OutboxJobData = {
  outboxId?: string
  aggregateType?: string
  aggregateId?: string
  payload?: Record<string, unknown>
}

export type OutboxWorkerLogger = {
  info: (msg: string, meta?: Record<string, unknown>) => void
  warn: (msg: string, meta?: Record<string, unknown>) => void
  error: (msg: string, meta?: Record<string, unknown>) => void
}

export type OutboxWorkerOptions = {
  connection: IORedisInstance
  repository: PlatformRepository
  topics?: readonly string[]
  concurrency?: number
  logger?: OutboxWorkerLogger
}

export type RunningOutboxWorker = {
  workers: Worker[]
  close: () => Promise<void>
}

const noopLogger: OutboxWorkerLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

export const startOutboxWorkers = (options: OutboxWorkerOptions): RunningOutboxWorker => {
  const repository = options.repository
  const logger = options.logger || noopLogger
  const topics = options.topics || OUTBOX_TOPICS

  const baseWorkerOptions: WorkerOptions = {
    connection: options.connection as unknown as ConnectionOptions,
    concurrency: options.concurrency ?? 5,
  }

  const workers = topics.map((topic) => {
    const worker = new Worker(
      topic,
      async (job: Job<OutboxJobData>) => {
        const data = job.data || {}

        if (!data.outboxId) {
          logger.info('outbox.job.skipped', {
            topic,
            jobId: job.id,
            reason: 'missing-outbox-id',
          })
          return { skipped: true, reason: 'missing-outbox-id' }
        }

        const event = await repository.findOutboxEventById(data.outboxId)

        if (!event) {
          logger.warn('outbox.job.unknown_event', {
            topic,
            jobId: job.id,
            outboxId: data.outboxId,
          })
          return { skipped: true, reason: 'unknown-event' }
        }

        if (event.status === 'processed') {
          return { skipped: true, reason: 'already-processed' }
        }

        await repository.saveOutboxEvent({ ...event, status: 'processed' })
        logger.info('outbox.job.processed', {
          topic,
          jobId: job.id,
          outboxId: event.id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
        })
        return { processed: true, outboxId: event.id }
      },
      baseWorkerOptions,
    )

    worker.on('failed', (job, err) => {
      logger.error('outbox.job.failed', {
        topic,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        error: err instanceof Error ? err.message : String(err),
      })
    })

    return worker
  })

  return {
    workers,
    async close() {
      await Promise.allSettled(workers.map((worker) => worker.close()))
    },
  }
}

export type { OutboxTopic }
