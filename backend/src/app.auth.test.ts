// @vitest-environment node

import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeuristicAiGateway } from './ai/heuristicAiGateway'
import { createApp } from './app'
import type { BetterAuthInstance } from './infra/betterAuth'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'

const authLifecycleErrors = vi.hoisted(() => [] as Error[])

vi.mock('better-auth/node', async (importOriginal) => {
  const actual = await importOriginal<typeof import('better-auth/node')>()
  return {
    ...actual,
    toNodeHandler: vi.fn(() => async (_request: IncomingMessage, response: ServerResponse) => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      try {
        const body = (_request as IncomingMessage & { body?: unknown }).body
        if (!body || typeof body !== 'object') {
          response.statusCode = 400
          response.setHeader('content-type', 'application/json')
          response.end(JSON.stringify({ message: 'Missing auth body' }))
          return
        }

        if ((body as Record<string, unknown>).email === 'validation-error@mentorme.test') {
          response.statusCode = 400
          response.setHeader('content-type', 'application/json')
          response.end(JSON.stringify({ message: 'Validation failed' }))
          return
        }

        response.statusCode = 201
        response.setHeader('content-type', 'application/json')
        response.end(JSON.stringify({ ok: true, body }))
      } catch (error) {
        authLifecycleErrors.push(error as Error)
      }
    }),
  }
})

const buildAuthTestApp = () => createApp({
  repository: createSeededInMemoryPlatformRepository(),
  email: createStubEmailGateway(),
  storage: createStubStorageService(),
  queue: createInlineQueuePublisher(),
  ai: new HeuristicAiGateway(),
  auth: {} as BetterAuthInstance,
  exposeTokens: true,
  cookieSecret: 'cookie-secret',
  defaultOrganizationId: 'org-mentorme',
  appBaseUrl: 'http://localhost:5173',
  httpSecurity: {
    disableRateLimit: true,
  },
})

describe('Better Auth route lifecycle', () => {
  afterEach(() => {
    authLifecycleErrors.length = 0
  })

  it('lets the Better Auth raw handler own /api/auth/* responses without destabilizing health checks', async () => {
    const app = await buildAuthTestApp()

    try {
      const authResponses = []
      for (let attempt = 0; attempt < 3; attempt += 1) {
        authResponses.push(await app.inject({
          method: 'POST',
          url: '/api/auth/sign-up/email',
          headers: {
            origin: 'http://localhost:5173',
            'content-type': 'application/json',
          },
          payload: {
            name: `Lifecycle User ${attempt}`,
            email: `lifecycle-${attempt}@mentorme.test`,
            password: 'correct-horse-battery-staple',
            role: 'founder',
          },
        }))
      }

      await new Promise((resolve) => setTimeout(resolve, 20))

      const health = await app.inject({
        method: 'GET',
        url: '/healthz',
      })

      expect(authLifecycleErrors.map((error) => error.message)).toEqual([])
      expect(authResponses.map((response) => response.statusCode)).toEqual([201, 201, 201])
      expect(authResponses.map((response) => response.headers['access-control-allow-origin'])).toEqual([
        'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:5173',
      ])
      expect(authResponses.map((response) => response.json())).toEqual([
        {
          ok: true,
          body: {
            name: 'Lifecycle User 0',
            email: 'lifecycle-0@mentorme.test',
            password: 'correct-horse-battery-staple',
            role: 'founder',
          },
        },
        {
          ok: true,
          body: {
            name: 'Lifecycle User 1',
            email: 'lifecycle-1@mentorme.test',
            password: 'correct-horse-battery-staple',
            role: 'founder',
          },
        },
        {
          ok: true,
          body: {
            name: 'Lifecycle User 2',
            email: 'lifecycle-2@mentorme.test',
            password: 'correct-horse-battery-staple',
            role: 'founder',
          },
        },
      ])
      expect(health.statusCode).toBe(200)
      expect(health.json()).toEqual({ status: 'ok' })
    } finally {
      await app.close()
    }
  })

  it('keeps CORS headers on Better Auth error responses', async () => {
    const app = await buildAuthTestApp()

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up/email',
        headers: {
          origin: 'http://localhost:5173',
          'content-type': 'application/json',
        },
        payload: {
          name: 'Validation User',
          email: 'validation-error@mentorme.test',
          password: 'correct-horse-battery-staple',
          role: 'founder',
        },
      })

      expect(response.statusCode).toBe(400)
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
      expect(response.json()).toEqual({ message: 'Validation failed' })
    } finally {
      await app.close()
    }
  })
})
