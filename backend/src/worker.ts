import { createRuntimeRepository } from './runtime'

const runtime = createRuntimeRepository()

void (async () => {
  try {
    const pendingEvents = (await runtime.repository.listOutboxEvents()).filter((event) => event.status === 'pending')

    console.log(`MentorMe worker started with ${runtime.mode} persistence. Pending outbox events: ${pendingEvents.length}`)
  } finally {
    await runtime.cleanup?.()
  }
})()
