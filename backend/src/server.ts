import { createApp } from './app'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'
import { createRuntimeRepository } from './runtime'

const port = Number(process.env.API_PORT || 3001)
const runtime = createRuntimeRepository()

const app = createApp({
  repository: runtime.repository,
  email: createStubEmailGateway(),
  storage: createStubStorageService(),
  queue: createInlineQueuePublisher(),
  jwtIssuer: process.env.JWT_ISSUER || 'mentor-me-local',
  jwtAudience: process.env.JWT_AUDIENCE || 'mentor-me-web',
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  cookieSecret: process.env.COOKIE_SECRET || 'development-cookie-secret',
  exposeTokens: process.env.EXPOSE_DEBUG_TOKENS === 'true',
})

if (runtime.cleanup) {
  app.addHook('onClose', async () => {
    await runtime.cleanup?.()
  })
}

app
  .listen({ host: '0.0.0.0', port })
  .then(() => {
    app.log.info(`MentorMe API listening on ${port} using ${runtime.mode} persistence`)
  })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
