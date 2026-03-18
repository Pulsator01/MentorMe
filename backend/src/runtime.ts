import { PrismaClient } from '@prisma/client'
import type { PlatformRepository } from './domain/interfaces'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createPrismaPlatformRepository } from './infra/prismaRepository'

type RuntimeMode = 'memory' | 'prisma'

export type RuntimeRepository = {
  cleanup?: () => Promise<void>
  mode: RuntimeMode
  repository: PlatformRepository
}

export const createRuntimeRepository = (): RuntimeRepository => {
  const preference = process.env.PERSISTENCE_BACKEND

  if (preference === 'memory') {
    return {
      mode: 'memory',
      repository: createSeededInMemoryPlatformRepository(),
    }
  }

  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient()

    return {
      mode: 'prisma',
      repository: createPrismaPlatformRepository(prisma),
      cleanup: async () => {
        await prisma.$disconnect()
      },
    }
  }

  return {
    mode: 'memory',
    repository: createSeededInMemoryPlatformRepository(),
  }
}
