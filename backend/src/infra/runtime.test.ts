// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const resendInstance = { kind: 'resend' } as unknown
  const stubEmailInstance = { kind: 'stub-email' } as unknown
  const s3Instance = {
    kind: 's3',
    destroy: vi.fn(),
  } as unknown as { kind: string; destroy: () => void }
  const stubStorageInstance = { kind: 'stub-storage' } as unknown
  const bullmqInstance = {
    kind: 'bullmq',
    close: vi.fn(async () => undefined),
  } as unknown as { kind: string; close: () => Promise<void> }
  const inlineQueueInstance = { kind: 'inline-queue' } as unknown

  return {
    resendInstance,
    stubEmailInstance,
    s3Instance,
    stubStorageInstance,
    bullmqInstance,
    inlineQueueInstance,
    createResend: vi.fn(() => resendInstance),
    createStubEmail: vi.fn(() => stubEmailInstance),
    createS3: vi.fn(() => s3Instance),
    createStubStorage: vi.fn(() => stubStorageInstance),
    createBullMq: vi.fn(() => bullmqInstance),
    createInlineQueue: vi.fn(() => inlineQueueInstance),
  }
})

vi.mock('./resendEmailGateway', () => ({
  createResendEmailGateway: mocks.createResend,
}))

vi.mock('./stubEmailGateway', () => ({
  createStubEmailGateway: mocks.createStubEmail,
}))

vi.mock('./s3StorageService', () => ({
  createS3StorageService: mocks.createS3,
}))

vi.mock('./stubStorageService', () => ({
  createStubStorageService: mocks.createStubStorage,
}))

vi.mock('./bullMqQueuePublisher', () => ({
  createBullMqQueuePublisher: mocks.createBullMq,
}))

vi.mock('./inlineQueuePublisher', () => ({
  createInlineQueuePublisher: mocks.createInlineQueue,
}))

const baseEnv: NodeJS.ProcessEnv = {
  RESEND_API_KEY: undefined,
  EMAIL_FROM: undefined,
  EMAIL_REPLY_TO: undefined,
  APP_BASE_URL: undefined,
  S3_BUCKET: undefined,
  S3_REGION: undefined,
  S3_ACCESS_KEY_ID: undefined,
  S3_SECRET_ACCESS_KEY: undefined,
  S3_ENDPOINT: undefined,
  S3_PUBLIC_BASE_URL: undefined,
  S3_FORCE_PATH_STYLE: undefined,
  S3_PRESIGN_TTL_SECONDS: undefined,
  AWS_REGION: undefined,
  AWS_ACCESS_KEY_ID: undefined,
  AWS_SECRET_ACCESS_KEY: undefined,
  REDIS_URL: undefined,
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createEmailRuntime', () => {
  it('returns the stub gateway when RESEND_API_KEY is missing', async () => {
    const { createEmailRuntime } = await import('./runtime')
    const runtime = createEmailRuntime({ ...baseEnv })
    expect(runtime.mode).toBe('stub')
    expect(runtime.gateway).toBe(mocks.stubEmailInstance)
    expect(mocks.createResend).not.toHaveBeenCalled()
  })

  it('falls back to the stub gateway when EMAIL_FROM is missing even if RESEND_API_KEY is set', async () => {
    const { createEmailRuntime } = await import('./runtime')
    const runtime = createEmailRuntime({ ...baseEnv, RESEND_API_KEY: 'rk_test', EMAIL_FROM: undefined })
    expect(runtime.mode).toBe('stub')
  })

  it('returns the Resend gateway with the configured options when both env vars are set', async () => {
    const { createEmailRuntime } = await import('./runtime')
    const runtime = createEmailRuntime({
      ...baseEnv,
      RESEND_API_KEY: 'rk_test',
      EMAIL_FROM: 'MentorMe <hello@mentorme.test>',
      EMAIL_REPLY_TO: 'support@mentorme.test',
      APP_BASE_URL: 'https://app.mentorme.test',
    })

    expect(runtime.mode).toBe('resend')
    expect(runtime.gateway).toBe(mocks.resendInstance)
    expect(mocks.createResend).toHaveBeenCalledWith({
      apiKey: 'rk_test',
      from: 'MentorMe <hello@mentorme.test>',
      appBaseUrl: 'https://app.mentorme.test',
      replyTo: 'support@mentorme.test',
    })
  })
})

describe('createStorageRuntime', () => {
  it('returns the stub storage when S3 env vars are missing', async () => {
    const { createStorageRuntime } = await import('./runtime')
    const runtime = createStorageRuntime({ ...baseEnv })
    expect(runtime.mode).toBe('stub')
    expect(runtime.service).toBe(mocks.stubStorageInstance)
    expect(mocks.createS3).not.toHaveBeenCalled()
  })

  it('returns the S3 storage service when bucket, region, and credentials are all set', async () => {
    const { createStorageRuntime } = await import('./runtime')
    const runtime = createStorageRuntime({
      ...baseEnv,
      S3_BUCKET: 'mentorme-uploads',
      S3_REGION: 'auto',
      S3_ACCESS_KEY_ID: 'AK1',
      S3_SECRET_ACCESS_KEY: 'sek',
      S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      S3_PUBLIC_BASE_URL: 'https://uploads.mentorme.test',
      S3_FORCE_PATH_STYLE: 'true',
      S3_PRESIGN_TTL_SECONDS: '120',
    })

    expect(runtime.mode).toBe('s3')
    expect(runtime.service).toBe(mocks.s3Instance)
    expect(mocks.createS3).toHaveBeenCalledWith({
      bucket: 'mentorme-uploads',
      region: 'auto',
      accessKeyId: 'AK1',
      secretAccessKey: 'sek',
      endpoint: 'https://account.r2.cloudflarestorage.com',
      forcePathStyle: true,
      publicBaseUrl: 'https://uploads.mentorme.test',
      presignTtlSeconds: 120,
    })
  })

  it('falls back to the stub storage when bucket is set but a credential is missing', async () => {
    const { createStorageRuntime } = await import('./runtime')
    const runtime = createStorageRuntime({
      ...baseEnv,
      S3_BUCKET: 'mentorme-uploads',
      S3_REGION: 'auto',
      S3_ACCESS_KEY_ID: 'AK1',
    })
    expect(runtime.mode).toBe('stub')
  })

  it('cleanup destroys the S3 client', async () => {
    const { createStorageRuntime } = await import('./runtime')
    const runtime = createStorageRuntime({
      ...baseEnv,
      S3_BUCKET: 'mentorme-uploads',
      S3_REGION: 'auto',
      S3_ACCESS_KEY_ID: 'AK1',
      S3_SECRET_ACCESS_KEY: 'sek',
    })

    await runtime.cleanup?.()
    expect(mocks.s3Instance.destroy).toHaveBeenCalledTimes(1)
  })
})

describe('createQueueRuntime', () => {
  it('returns the inline queue publisher when REDIS_URL is missing', async () => {
    const { createQueueRuntime } = await import('./runtime')
    const runtime = createQueueRuntime({ ...baseEnv })
    expect(runtime.mode).toBe('inline')
    expect(runtime.publisher).toBe(mocks.inlineQueueInstance)
    expect(mocks.createBullMq).not.toHaveBeenCalled()
  })

  it('returns the BullMQ publisher when REDIS_URL is set', async () => {
    const { createQueueRuntime } = await import('./runtime')
    const runtime = createQueueRuntime({ ...baseEnv, REDIS_URL: 'redis://localhost:6379' })
    expect(runtime.mode).toBe('bullmq')
    expect(runtime.publisher).toBe(mocks.bullmqInstance)
    expect(mocks.createBullMq).toHaveBeenCalledWith({ redisUrl: 'redis://localhost:6379' })
  })

  it('cleanup closes the BullMQ publisher', async () => {
    const { createQueueRuntime } = await import('./runtime')
    const runtime = createQueueRuntime({ ...baseEnv, REDIS_URL: 'redis://localhost:6379' })
    await runtime.cleanup?.()
    expect(mocks.bullmqInstance.close).toHaveBeenCalledTimes(1)
  })
})

describe('createInfraRuntime', () => {
  it('composes all three runtimes and exposes a single cleanup', async () => {
    const { createInfraRuntime } = await import('./runtime')
    const runtime = createInfraRuntime({
      ...baseEnv,
      RESEND_API_KEY: 'rk_test',
      EMAIL_FROM: 'MentorMe <hello@mentorme.test>',
      S3_BUCKET: 'mentorme-uploads',
      S3_REGION: 'auto',
      S3_ACCESS_KEY_ID: 'AK1',
      S3_SECRET_ACCESS_KEY: 'sek',
      REDIS_URL: 'redis://localhost:6379',
    })

    expect(runtime.email.mode).toBe('resend')
    expect(runtime.storage.mode).toBe('s3')
    expect(runtime.queue.mode).toBe('bullmq')

    await runtime.cleanup()
    expect(mocks.s3Instance.destroy).toHaveBeenCalledTimes(1)
    expect(mocks.bullmqInstance.close).toHaveBeenCalledTimes(1)
  })

  it('cleanup is safe when no real resources were initialized', async () => {
    const { createInfraRuntime } = await import('./runtime')
    const runtime = createInfraRuntime({ ...baseEnv })

    expect(runtime.email.mode).toBe('stub')
    expect(runtime.storage.mode).toBe('stub')
    expect(runtime.queue.mode).toBe('inline')

    await expect(runtime.cleanup()).resolves.toBeUndefined()
  })
})
