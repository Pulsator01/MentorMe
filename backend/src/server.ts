import { createApp } from './app'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'

const port = Number(process.env.API_PORT || 3001)

const app = createApp({
  repository: createSeededInMemoryPlatformRepository(),
  email: createStubEmailGateway(),
  storage: createStubStorageService(),
  queue: createInlineQueuePublisher(),
  jwtIssuer: process.env.JWT_ISSUER || 'mentor-me-local',
  jwtAudience: process.env.JWT_AUDIENCE || 'mentor-me-web',
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  cookieSecret: process.env.COOKIE_SECRET || 'development-cookie-secret',
  exposeTokens: process.env.EXPOSE_DEBUG_TOKENS === 'true',
})

app
  .listen({ host: '0.0.0.0', port })
  .then(() => {
    app.log.info(`MentorMe API listening on ${port}`)
  })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
