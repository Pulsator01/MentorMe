import { PrismaClient } from '@prisma/client'
import type { PlatformRepository } from './domain/interfaces'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createPrismaPlatformRepository } from './infra/prismaRepository'

type RuntimeMode = 'memory' | 'prisma'

export type RuntimeRepository = {
  cleanup?: () => Promise<void>
  mode: RuntimeMode
  prisma?: PrismaClient
  repository: PlatformRepository
}

export const createRuntimeRepository = (): RuntimeRepository => {
  const preference = process.env.PERSISTENCE_BACKEND
  const isProduction = process.env.NODE_ENV === 'production'
  const allowMemoryBackend = process.env.ALLOW_MEMORY_BACKEND === 'true'

  if (preference === 'memory') {
    if (isProduction && !allowMemoryBackend) {
      throw new Error('DATABASE_URL must be set when NODE_ENV=production; set ALLOW_MEMORY_BACKEND=true only for an explicit production demo mode')
    }

    return {
      mode: 'memory',
      repository: createSeededInMemoryPlatformRepository(),
    }
  }

  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient()

    return {
      mode: 'prisma',
      prisma,
      repository: createPrismaPlatformRepository(prisma),
      cleanup: async () => {
        await prisma.$disconnect()
      },
    }
  }

  if (isProduction) {
    throw new Error('DATABASE_URL must be set when NODE_ENV=production')
  }

  return {
    mode: 'memory',
    repository: createSeededInMemoryPlatformRepository(),
  }
}
