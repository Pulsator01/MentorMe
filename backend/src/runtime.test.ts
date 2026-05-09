// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlatformRepository } from './domain/interfaces'

const mocks = vi.hoisted(() => {
  const prismaDisconnect = vi.fn()
  const prismaClient = { $disconnect: prismaDisconnect }

  return {
    memoryRepository: { kind: 'memory' } as unknown as PlatformRepository,
    prismaRepository: { kind: 'prisma' } as unknown as PlatformRepository,
    prismaDisconnect,
    prismaClient,
    prismaConstructor: vi.fn(() => prismaClient),
    createMemoryRepository: vi.fn(),
    createPrismaRepository: vi.fn(),
  }
})

vi.mock('@prisma/client', () => ({
  PrismaClient: mocks.prismaConstructor,
}))

vi.mock('./infra/inMemoryRepository', () => ({
  createSeededInMemoryPlatformRepository: mocks.createMemoryRepository,
}))

vi.mock('./infra/prismaRepository', () => ({
  createPrismaPlatformRepository: mocks.createPrismaRepository,
}))

describe('createRuntimeRepository', () => {
  const originalPersistenceBackend = process.env.PERSISTENCE_BACKEND
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalNodeEnv = process.env.NODE_ENV
  const originalAllowMemoryBackend = process.env.ALLOW_MEMORY_BACKEND

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.createMemoryRepository.mockReturnValue(mocks.memoryRepository)
    mocks.createPrismaRepository.mockReturnValue(mocks.prismaRepository)
    delete process.env.PERSISTENCE_BACKEND
    delete process.env.DATABASE_URL
    delete process.env.NODE_ENV
    delete process.env.ALLOW_MEMORY_BACKEND
  })

  afterEach(() => {
    if (originalPersistenceBackend === undefined) {
      delete process.env.PERSISTENCE_BACKEND
    } else {
      process.env.PERSISTENCE_BACKEND = originalPersistenceBackend
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }

    if (originalAllowMemoryBackend === undefined) {
      delete process.env.ALLOW_MEMORY_BACKEND
    } else {
      process.env.ALLOW_MEMORY_BACKEND = originalAllowMemoryBackend
    }
  })

  it('forces seeded memory persistence when explicitly requested', async () => {
    process.env.PERSISTENCE_BACKEND = 'memory'
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/mentorme'

    const { createRuntimeRepository } = await import('./runtime')
    const runtime = createRuntimeRepository()

    expect(runtime.mode).toBe('memory')
    expect(runtime.repository).toBe(mocks.memoryRepository)
    expect(runtime.cleanup).toBeUndefined()
    expect(mocks.createMemoryRepository).toHaveBeenCalledTimes(1)
    expect(mocks.prismaConstructor).not.toHaveBeenCalled()
  })

  it('creates a Prisma-backed repository when a database url is available', async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/mentorme'

    const { createRuntimeRepository } = await import('./runtime')
    const runtime = createRuntimeRepository()

    expect(runtime.mode).toBe('prisma')
    expect(runtime.repository).toBe(mocks.prismaRepository)
    expect(mocks.prismaConstructor).toHaveBeenCalledTimes(1)
    expect(mocks.createPrismaRepository).toHaveBeenCalledWith(mocks.prismaClient)

    await runtime.cleanup?.()
    expect(mocks.prismaDisconnect).toHaveBeenCalledTimes(1)
  })

  it('falls back to seeded memory persistence when no database is configured', async () => {
    const { createRuntimeRepository } = await import('./runtime')
    const runtime = createRuntimeRepository()

    expect(runtime.mode).toBe('memory')
    expect(runtime.repository).toBe(mocks.memoryRepository)
    expect(mocks.createMemoryRepository).toHaveBeenCalledTimes(1)
    expect(mocks.createPrismaRepository).not.toHaveBeenCalled()
  })

  it('fails closed in production when DATABASE_URL is missing', async () => {
    process.env.NODE_ENV = 'production'

    const { createRuntimeRepository } = await import('./runtime')

    expect(() => createRuntimeRepository()).toThrow(/DATABASE_URL/)
    expect(mocks.createMemoryRepository).not.toHaveBeenCalled()
  })
})
