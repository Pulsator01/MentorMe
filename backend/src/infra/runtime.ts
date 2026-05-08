import type { EmailGateway, QueuePublisher, StorageService } from '../domain/interfaces'
import { createBullMqQueuePublisher, type BullMqQueuePublisher } from './bullMqQueuePublisher'
import { createInlineQueuePublisher } from './inlineQueuePublisher'
import { createResendEmailGateway } from './resendEmailGateway'
import { createS3StorageService, type S3StorageService } from './s3StorageService'
import { createStubEmailGateway } from './stubEmailGateway'
import { createStubStorageService } from './stubStorageService'

export type EmailRuntimeMode = 'resend' | 'stub'
export type StorageRuntimeMode = 's3' | 'stub'
export type QueueRuntimeMode = 'bullmq' | 'inline'

export type EmailRuntime = {
  gateway: EmailGateway
  mode: EmailRuntimeMode
}

export type StorageRuntime = {
  service: StorageService
  mode: StorageRuntimeMode
  cleanup?: () => Promise<void>
}

export type QueueRuntime = {
  publisher: QueuePublisher
  mode: QueueRuntimeMode
  cleanup?: () => Promise<void>
  bullmq?: BullMqQueuePublisher
}

const isTrue = (value: string | undefined): boolean => value === 'true' || value === '1'

export const createEmailRuntime = (env: NodeJS.ProcessEnv = process.env): EmailRuntime => {
  const apiKey = env.RESEND_API_KEY
  const from = env.EMAIL_FROM
  const appBaseUrl = env.APP_BASE_URL || 'http://localhost:5173'
  const isProduction = env.NODE_ENV === 'production'
  const allowStubEmail = isTrue(env.ALLOW_STUB_EMAIL)

  if (apiKey && from) {
    return {
      mode: 'resend',
      gateway: createResendEmailGateway({
        apiKey,
        from,
        appBaseUrl,
        replyTo: env.EMAIL_REPLY_TO,
      }),
    }
  }

  if (isProduction && !allowStubEmail) {
    throw new Error('RESEND_API_KEY and EMAIL_FROM must be set when NODE_ENV=production')
  }

  return {
    mode: 'stub',
    gateway: createStubEmailGateway(),
  }
}

export const createStorageRuntime = (env: NodeJS.ProcessEnv = process.env): StorageRuntime => {
  const bucket = env.S3_BUCKET
  const region = env.S3_REGION || env.AWS_REGION
  const accessKeyId = env.S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY
  const isProduction = env.NODE_ENV === 'production'
  const allowStubStorage = isTrue(env.ALLOW_STUB_STORAGE)

  if (bucket && region && accessKeyId && secretAccessKey) {
    const service = createS3StorageService({
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE ? isTrue(env.S3_FORCE_PATH_STYLE) : undefined,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
      presignTtlSeconds: env.S3_PRESIGN_TTL_SECONDS ? Number(env.S3_PRESIGN_TTL_SECONDS) : undefined,
    })

    return {
      mode: 's3',
      service,
      cleanup: async () => {
        ;(service as S3StorageService).destroy()
      },
    }
  }

  if (isProduction && !allowStubStorage) {
    throw new Error('S3_BUCKET, S3_REGION/AWS_REGION, and S3 credentials must be set when NODE_ENV=production')
  }

  return {
    mode: 'stub',
    service: createStubStorageService(),
  }
}

export const createQueueRuntime = (env: NodeJS.ProcessEnv = process.env): QueueRuntime => {
  const redisUrl = env.REDIS_URL

  if (redisUrl) {
    const publisher = createBullMqQueuePublisher({ redisUrl })
    return {
      mode: 'bullmq',
      publisher,
      bullmq: publisher,
      cleanup: async () => {
        await publisher.close()
      },
    }
  }

  return {
    mode: 'inline',
    publisher: createInlineQueuePublisher(),
  }
}

export type InfraRuntime = {
  email: EmailRuntime
  storage: StorageRuntime
  queue: QueueRuntime
  cleanup: () => Promise<void>
}

export const createInfraRuntime = (env: NodeJS.ProcessEnv = process.env): InfraRuntime => {
  const email = createEmailRuntime(env)
  const storage = createStorageRuntime(env)
  const queue = createQueueRuntime(env)

  return {
    email,
    storage,
    queue,
    cleanup: async () => {
      const tasks: Array<Promise<unknown>> = []
      if (storage.cleanup) tasks.push(storage.cleanup())
      if (queue.cleanup) tasks.push(queue.cleanup())
      await Promise.allSettled(tasks)
    },
  }
}
