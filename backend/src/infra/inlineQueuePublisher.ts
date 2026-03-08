import type { QueuePublisher } from '../domain/interfaces'

export const createInlineQueuePublisher = (): QueuePublisher & { published: Array<Record<string, unknown>> } => {
  const published: Array<Record<string, unknown>> = []

  return {
    published,
    async publish(topic, payload) {
      published.push({ topic, payload })
    },
  }
}
