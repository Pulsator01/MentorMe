import { createApp } from './app'
import { createAiGateway } from './ai/runtime'
import { createInfraRuntime } from './infra/runtime'
import { createArgon2PasswordHasher } from './infra/passwordHasher'
import { createGoogleOAuthGateway } from './infra/googleOAuthGateway'
import { createRuntimeRepository } from './runtime'
import type { GoogleOAuthGateway } from './domain/interfaces'

const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const runtime = createRuntimeRepository()
const ai = createAiGateway()
const infra = createInfraRuntime()

const buildGoogleOAuth = (): GoogleOAuthGateway | undefined => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return undefined
  }

  return createGoogleOAuthGateway({ clientId, clientSecret, redirectUri })
}

const googleOAuth = buildGoogleOAuth()

const app = createApp({
  repository: runtime.repository,
  email: infra.email.gateway,
  storage: infra.storage.service,
  queue: infra.queue.publisher,
  ai: ai.gateway,
  passwordHasher: createArgon2PasswordHasher(),
  googleOAuth,
  jwtIssuer: process.env.JWT_ISSUER || 'mentor-me-local',
  jwtAudience: process.env.JWT_AUDIENCE || 'mentor-me-web',
  jwtSecret: process.env.JWT_SECRET || 'development-secret',
  cookieSecret: process.env.COOKIE_SECRET || 'development-cookie-secret',
  cookieDomain: process.env.COOKIE_DOMAIN,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  exposeTokens: process.env.EXPOSE_DEBUG_TOKENS === 'true',
  defaultOrganizationId: process.env.DEFAULT_ORGANIZATION_ID || 'org-mentorme',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
})

app.addHook('onClose', async () => {
  if (runtime.cleanup) {
    await runtime.cleanup()
  }
  await infra.cleanup()
})

const handleShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down`)
  try {
    await app.close()
  } catch (error) {
    app.log.error(error, 'Error while closing app')
  } finally {
    process.exit(0)
  }
}

process.once('SIGINT', () => {
  void handleShutdown('SIGINT')
})
process.once('SIGTERM', () => {
  void handleShutdown('SIGTERM')
})

app
  .listen({ host: '0.0.0.0', port })
  .then(() => {
    app.log.info(
      `MentorMe API listening on ${port} | persistence=${runtime.mode} | ai=${ai.mode} | email=${infra.email.mode} | storage=${infra.storage.mode} | queue=${infra.queue.mode} | googleOAuth=${googleOAuth ? 'enabled' : 'disabled'}`,
    )
  })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
