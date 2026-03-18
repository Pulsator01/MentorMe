import { PrismaClient } from '@prisma/client'
import { resetAndSeedDatabase } from './seedData'

const prisma = new PrismaClient()

export const main = async () => {
  await resetAndSeedDatabase(prisma)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
