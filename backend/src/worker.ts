import { createInfraRuntime } from './infra/runtime'
import { startOutboxWorkers, type RunningOutboxWorker } from './infra/outboxWorker'
import { createRuntimeRepository } from './runtime'

const consoleLogger = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', msg, ...meta }))
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', msg, ...meta }))
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', msg, ...meta }))
  },
}

const runtime = createRuntimeRepository()
const infra = createInfraRuntime()

let outboxWorkers: RunningOutboxWorker | undefined

const shutdown = async (signal: string) => {
  consoleLogger.info('worker.shutdown', { signal })
  try {
    if (outboxWorkers) {
      await outboxWorkers.close()
    }
    await infra.cleanup()
    if (runtime.cleanup) {
      await runtime.cleanup()
    }
  } catch (error) {
    consoleLogger.error('worker.shutdown.error', { error: error instanceof Error ? error.message : String(error) })
  } finally {
    process.exit(0)
  }
}

process.once('SIGINT', () => {
  void shutdown('SIGINT')
})
process.once('SIGTERM', () => {
  void shutdown('SIGTERM')
})

void (async () => {
  try {
    const pendingEvents = (await runtime.repository.listOutboxEvents()).filter((event) => event.status === 'pending')
    consoleLogger.info('worker.boot', {
      persistence: runtime.mode,
      queue: infra.queue.mode,
      pendingOutboxEvents: pendingEvents.length,
    })

    if (infra.queue.mode === 'bullmq' && infra.queue.bullmq) {
      outboxWorkers = startOutboxWorkers({
        repository: runtime.repository,
        connection: infra.queue.bullmq.redisConnection,
        logger: consoleLogger,
      })
      consoleLogger.info('worker.subscribed', {
        topicCount: outboxWorkers.workers.length,
      })
    } else {
      consoleLogger.warn('worker.queue_disabled', {
        reason: 'REDIS_URL not configured; running in passive mode (no BullMQ subscription)',
      })
      await infra.cleanup()
      if (runtime.cleanup) {
        await runtime.cleanup()
      }
    }
  } catch (error) {
    consoleLogger.error('worker.boot.error', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
})()
