import { createApp } from './app'
import { createAiGateway } from './ai/runtime'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'
import { createArgon2PasswordHasher } from './infra/passwordHasher'
import { createGoogleOAuthGateway } from './infra/googleOAuthGateway'
import { createRuntimeRepository } from './runtime'
import type { GoogleOAuthGateway } from './domain/interfaces'

const port = Number(process.env.PORT || process.env.API_PORT || 3001)
const runtime = createRuntimeRepository()
const ai = createAiGateway()

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
  email: createStubEmailGateway(),
  storage: createStubStorageService(),
  queue: createInlineQueuePublisher(),
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

if (runtime.cleanup) {
  app.addHook('onClose', async () => {
    await runtime.cleanup?.()
  })
}

app
  .listen({ host: '0.0.0.0', port })
  .then(() => {
    app.log.info(
      `MentorMe API listening on ${port} using ${runtime.mode} persistence, ${ai.mode} AI, Google OAuth ${googleOAuth ? 'enabled' : 'disabled'}`,
    )
  })
  .catch((error) => {
    app.log.error(error)
    process.exit(1)
  })
