import * as Sentry from '@sentry/node'
import { createApp, type HttpSecurityOptions } from './app'
import { createAiGateway } from './ai/runtime'
import { createInfraRuntime } from './infra/runtime'
import { createArgon2PasswordHasher } from './infra/passwordHasher'
import { createGoogleOAuthGateway } from './infra/googleOAuthGateway'
import { createRuntimeRepository } from './runtime'
import type { GoogleOAuthGateway } from './domain/interfaces'

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw === '') {
    return fallback
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback
}

const parseAllowedOrigins = (raw: string | undefined): string[] =>
  (raw || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)

const buildHttpSecurityFromEnv = (): HttpSecurityOptions | undefined => {
  const corsAllowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS)
  const hasRateEnv =
    process.env.RATE_LIMIT_GLOBAL_MAX !== undefined ||
    process.env.RATE_LIMIT_GLOBAL_WINDOW_MS !== undefined ||
    process.env.RATE_LIMIT_AUTH_MAX !== undefined ||
    process.env.RATE_LIMIT_AUTH_WINDOW_MS !== undefined

  if (corsAllowedOrigins.length === 0 && !hasRateEnv) {
    return undefined
  }

  return {
    ...(corsAllowedOrigins.length > 0 ? { corsAllowedOrigins } : {}),
    ...(hasRateEnv
      ? {
          rateLimitGlobalMax: parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_MAX, 400),
          rateLimitGlobalWindowMs: parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 60_000),
          rateLimitAuthMax: parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 40),
          rateLimitAuthWindowMs: parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 900_000),
        }
      : {}),
  }
}

const DEV_JWT_PLACEHOLDER = 'development-secret'
const DEV_COOKIE_PLACEHOLDER = 'development-cookie-secret'

const resolveAuthSecrets = () => {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const isProduction = nodeEnv === 'production'

  const jwtSecret = (process.env.JWT_SECRET || '').trim() || (!isProduction ? DEV_JWT_PLACEHOLDER : '')
  const cookieSecret = (process.env.COOKIE_SECRET || '').trim() || (!isProduction ? DEV_COOKIE_PLACEHOLDER : '')

  if (isProduction) {
    if (!process.env.JWT_SECRET?.trim() || !process.env.COOKIE_SECRET?.trim()) {
      console.error('FATAL: JWT_SECRET and COOKIE_SECRET must be set to non-empty values when NODE_ENV=production')
      process.exit(1)
    }
    if (process.env.JWT_SECRET === DEV_JWT_PLACEHOLDER || process.env.COOKIE_SECRET === DEV_COOKIE_PLACEHOLDER) {
      console.error('FATAL: Do not use development placeholder secrets in production')
      process.exit(1)
    }
  }

  return { jwtSecret, cookieSecret }
}

const bootstrap = async () => {
  const { jwtSecret, cookieSecret } = resolveAuthSecrets()
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

  const sentryDsn = process.env.SENTRY_DSN
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      tracesSampleRate: Math.min(1, Math.max(0, Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0))),
      integrations: [
        Sentry.fastifyIntegration({
          shouldHandleError(_error, _request, reply) {
            return reply.statusCode >= 500
          },
        }),
      ],
    })
  }

  const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.RENDER === 'true'

  const app = await createApp({
    repository: runtime.repository,
    email: infra.email.gateway,
    storage: infra.storage.service,
    queue: infra.queue.publisher,
    ai: ai.gateway,
    passwordHasher: createArgon2PasswordHasher(),
    googleOAuth,
    jwtIssuer: process.env.JWT_ISSUER || 'mentor-me-local',
    jwtAudience: process.env.JWT_AUDIENCE || 'mentor-me-web',
    jwtSecret,
    cookieSecret,
    calendlyWebhookSigningSecret: process.env.CALENDLY_WEBHOOK_SIGNING_SECRET,
    cookieDomain: process.env.COOKIE_DOMAIN,
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    exposeTokens: process.env.EXPOSE_DEBUG_TOKENS === 'true',
    defaultOrganizationId: process.env.DEFAULT_ORGANIZATION_ID || 'org-mentorme',
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
    trustProxy,
    httpSecurity: buildHttpSecurityFromEnv(),
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
      if (sentryDsn) {
        await Sentry.flush(2000).catch(() => {})
      }
      process.exit(0)
    }
  }

  process.once('SIGINT', () => {
    void handleShutdown('SIGINT')
  })
  process.once('SIGTERM', () => {
    void handleShutdown('SIGTERM')
  })

  try {
    await app.listen({ host: '0.0.0.0', port })
    app.log.info(
      `MentorMe API listening on ${port} | persistence=${runtime.mode} | ai=${ai.mode} | email=${infra.email.mode} | storage=${infra.storage.mode} | queue=${infra.queue.mode} | googleOAuth=${googleOAuth ? 'enabled' : 'disabled'} | sentry=${sentryDsn ? 'enabled' : 'disabled'} | trustProxy=${trustProxy}`,
    )
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

void bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
