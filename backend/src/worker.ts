import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'

const repository = createSeededInMemoryPlatformRepository()

const pendingEvents = repository.listOutboxEvents().filter((event) => event.status === 'pending')

console.log(`MentorMe worker started. Pending outbox events: ${pendingEvents.length}`)
