// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { HeuristicAiGateway } from './ai/heuristicAiGateway'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'
import type { PasswordHasher } from './infra/passwordHasher'

const stubPasswordHasher: PasswordHasher = {
  async hash(plain: string) {
    return `hashed:${plain}`
  },
  async verify(hash: string, plain: string) {
    return hash === `hashed:${plain}`
  },
}

const buildSecurityHarnessApp = async () =>
  await createApp({
    repository: createSeededInMemoryPlatformRepository(),
    email: createStubEmailGateway(),
    storage: createStubStorageService(),
    queue: createInlineQueuePublisher(),
    ai: new HeuristicAiGateway(),
    passwordHasher: stubPasswordHasher,
    exposeTokens: true,
    jwtIssuer: 'mentor-me-security',
    jwtAudience: 'mentor-me-web',
    jwtSecret: 'security-test-secret',
    cookieSecret: 'cookie-secret',
    defaultOrganizationId: 'org-mentorme',
    appBaseUrl: 'http://localhost:5173',
  })

describe('HTTP security hardening', () => {
  it('sets baseline security headers from @fastify/helmet', async () => {
    const app = await buildSecurityHarnessApp()
    const response = await app.inject({ method: 'GET', url: '/healthz' })
    expect(response.statusCode).toBe(200)
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
    await app.close()
  })

  it('reflects allowed browser origins when an allowlist is configured', async () => {
    const app = await createApp({
      repository: createSeededInMemoryPlatformRepository(),
      email: createStubEmailGateway(),
      storage: createStubStorageService(),
      queue: createInlineQueuePublisher(),
      ai: new HeuristicAiGateway(),
      passwordHasher: stubPasswordHasher,
      exposeTokens: true,
      jwtIssuer: 'mentor-me-security',
      jwtAudience: 'mentor-me-web',
      jwtSecret: 'security-test-secret',
      cookieSecret: 'cookie-secret',
      defaultOrganizationId: 'org-mentorme',
      appBaseUrl: 'http://localhost:5173',
      httpSecurity: {
        disableRateLimit: true,
        corsAllowedOrigins: ['https://app.mentorme.test'],
      },
    })

    const blocked = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'https://evil.example' },
    })
    expect(blocked.statusCode).toBe(200)
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()

    const allowed = await app.inject({
      method: 'GET',
      url: '/healthz',
      headers: { origin: 'https://app.mentorme.test' },
    })
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.mentorme.test')
    await app.close()
  })

  it('returns 429 when the global rate limit is exceeded', async () => {
    const app = await createApp({
      repository: createSeededInMemoryPlatformRepository(),
      email: createStubEmailGateway(),
      storage: createStubStorageService(),
      queue: createInlineQueuePublisher(),
      ai: new HeuristicAiGateway(),
      passwordHasher: stubPasswordHasher,
      exposeTokens: true,
      jwtIssuer: 'mentor-me-security',
      jwtAudience: 'mentor-me-web',
      jwtSecret: 'security-test-secret',
      cookieSecret: 'cookie-secret',
      defaultOrganizationId: 'org-mentorme',
      appBaseUrl: 'http://localhost:5173',
      httpSecurity: {
        rateLimitGlobalMax: 2,
        rateLimitGlobalWindowMs: 60_000,
      },
    })

    // Logout has no per-route rateLimit override; it uses the global bucket only.
    const first = await app.inject({ method: 'POST', url: '/auth/logout' })
    const second = await app.inject({ method: 'POST', url: '/auth/logout' })
    const third = await app.inject({ method: 'POST', url: '/auth/logout' })

    expect(first.headers['x-ratelimit-limit']).toBe('2')
    expect(second.headers['x-ratelimit-limit']).toBe('2')

    expect(first.statusCode).not.toBe(429)
    expect(second.statusCode).not.toBe(429)
    expect(third.statusCode).toBe(429)
    expect(third.headers['x-ratelimit-limit']).toBeDefined()
    await app.close()
  })
})
