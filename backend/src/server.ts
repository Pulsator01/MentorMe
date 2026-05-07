import * as Sentry from '@sentry/node'
import { createApp, type HttpSecurityOptions } from './app'
import { createAiGateway } from './ai/runtime'
import { createInfraRuntime } from './infra/runtime'
import { createRuntimeRepository } from './runtime'
import { createBetterAuth } from './infra/betterAuth'
import {
  DEFAULT_COHORT_ID,
  DEFAULT_COHORT_NAME,
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_ORGANIZATION_SLUG,
  ensureDefaultTenant,
} from './infra/defaultTenant'

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
    process.env.RATE_LIMIT_GLOBAL_WINDOW_MS !== undefined

  if (corsAllowedOrigins.length === 0 && !hasRateEnv) {
    return undefined
  }

  return {
    ...(corsAllowedOrigins.length > 0 ? { corsAllowedOrigins } : {}),
    ...(hasRateEnv
      ? {
          rateLimitGlobalMax: parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_MAX, 400),
          rateLimitGlobalWindowMs: parsePositiveInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 60_000),
        }
      : {}),
  }
}

const DEV_COOKIE_PLACEHOLDER = 'development-cookie-secret'
const DEV_AUTH_SECRET_PLACEHOLDER = 'development-better-auth-secret'

const resolveSecrets = () => {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const isProduction = nodeEnv === 'production'

  const cookieSecret = (process.env.COOKIE_SECRET || '').trim() || (!isProduction ? DEV_COOKIE_PLACEHOLDER : '')
  const betterAuthSecret = (process.env.BETTER_AUTH_SECRET || '').trim() || (!isProduction ? DEV_AUTH_SECRET_PLACEHOLDER : '')

  if (isProduction) {
    if (!process.env.COOKIE_SECRET?.trim() || !process.env.BETTER_AUTH_SECRET?.trim()) {
      console.error('FATAL: COOKIE_SECRET and BETTER_AUTH_SECRET must be set to non-empty values when NODE_ENV=production')
      process.exit(1)
    }
  }

  return { cookieSecret, betterAuthSecret }
}

const bootstrap = async () => {
  const { cookieSecret, betterAuthSecret } = resolveSecrets()
  const port = Number(process.env.PORT || process.env.API_PORT || 3001)
  const runtime = createRuntimeRepository()
  const ai = createAiGateway()
  const infra = createInfraRuntime()

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

  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID || DEFAULT_ORGANIZATION_ID
  const defaultOrgName = process.env.DEFAULT_ORGANIZATION_NAME || DEFAULT_ORGANIZATION_NAME
  const defaultOrgSlug = process.env.DEFAULT_ORGANIZATION_SLUG || DEFAULT_ORGANIZATION_SLUG
  const defaultCohortId = process.env.DEFAULT_COHORT_ID || DEFAULT_COHORT_ID
  const defaultCohortName = process.env.DEFAULT_COHORT_NAME || DEFAULT_COHORT_NAME
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173'
  const apiBaseUrl = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`

  if (runtime.prisma) {
    await ensureDefaultTenant(runtime.prisma, {
      organizationId: defaultOrgId,
      organizationName: defaultOrgName,
      organizationSlug: defaultOrgSlug,
      cohortId: defaultCohortId,
      cohortName: defaultCohortName,
    })
  }

  const auth = runtime.prisma
    ? createBetterAuth({
        prisma: runtime.prisma,
        secret: betterAuthSecret,
        baseURL: apiBaseUrl,
        appBaseUrl,
        trustedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS).concat(appBaseUrl),
        email: infra.email.gateway,
        defaultOrganizationId: defaultOrgId,
        defaultCohortId,
        googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        cookieSecure: process.env.NODE_ENV === 'production',
      })
    : undefined

  const app = await createApp({
    repository: runtime.repository,
    email: infra.email.gateway,
    storage: infra.storage.service,
    queue: infra.queue.publisher,
    ai: ai.gateway,
    auth,
    cookieSecret,
    calendlyWebhookSigningSecret: process.env.CALENDLY_WEBHOOK_SIGNING_SECRET,
    exposeTokens: process.env.EXPOSE_DEBUG_TOKENS === 'true',
    defaultOrganizationId: defaultOrgId,
    appBaseUrl,
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
      `MentorMe API listening on ${port} | persistence=${runtime.mode} | ai=${ai.mode} | email=${infra.email.mode} | storage=${infra.storage.mode} | queue=${infra.queue.mode} | auth=${auth ? 'better-auth' : 'disabled'} | sentry=${sentryDsn ? 'enabled' : 'disabled'} | trustProxy=${trustProxy}`,
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
