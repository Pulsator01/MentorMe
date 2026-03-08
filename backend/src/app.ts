import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import { z } from 'zod'
import { PlatformService } from './domain/platformService'
import type { EmailGateway, PlatformRepository, QueuePublisher, StorageService } from './domain/interfaces'

type AppOptions = {
  repository: PlatformRepository
  email: EmailGateway
  storage: StorageService
  queue: QueuePublisher
  exposeTokens?: boolean
  jwtIssuer: string
  jwtAudience: string
  jwtSecret: string
  cookieSecret: string
}

const artifactCompleteSchema = z.object({
  artifactId: z.string().min(1),
})

export const createApp = (options: AppOptions) => {
  const app = Fastify({ logger: false })
  const events = new EventTarget()
  const service = new PlatformService({
    repository: options.repository,
    email: options.email,
    storage: options.storage,
    queue: options.queue,
    jwtIssuer: options.jwtIssuer,
    jwtAudience: options.jwtAudience,
    jwtSecret: options.jwtSecret,
  })

  app.register(cors, { origin: true, credentials: true })
  app.register(cookie, { secret: options.cookieSecret })
  app.register(sensible)

  const readAuthUser = async (request: { headers: Record<string, unknown> }) => {
    const authorization = String(request.headers.authorization || '')

    if (!authorization.startsWith('Bearer ')) {
      throw app.httpErrors.unauthorized()
    }

    try {
      return await service.authenticate(authorization.replace('Bearer ', ''))
    } catch {
      throw app.httpErrors.unauthorized()
    }
  }

  const emitEvent = (name: string, detail: Record<string, unknown>) => {
    events.dispatchEvent(new CustomEvent(name, { detail }))
  }

  app.post('/auth/magic-link/request', async (request, reply) => {
    const payload = z.object({ email: z.string().email() }).parse(request.body)
    const result = await service.requestMagicLink(payload.email)
    return reply.code(202).send({
      accepted: true,
      ...(options.exposeTokens && result.token ? { debugToken: result.token } : {}),
    })
  })

  app.post('/auth/magic-link/verify', async (request, reply) => {
    try {
      const payload = z.object({ token: z.string().min(10) }).parse(request.body)
      const result = await service.verifyMagicLink(payload.token)
      reply.setCookie('mentor_me_refresh', result.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.mentor_me_refresh
      if (!refreshToken) {
        return reply.unauthorized()
      }
      const result = await service.refreshSession(refreshToken)
      return reply.send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/logout', async (request, reply) => {
    const refreshToken = request.cookies.mentor_me_refresh
    if (refreshToken) {
      service.logout(refreshToken)
    }
    reply.clearCookie('mentor_me_refresh', { path: '/' })
    return reply.code(204).send()
  })

  app.get('/me', async (request) => {
    const user = await readAuthUser(request)
    return service.getMe(user)
  })

  app.get('/ventures', async (request) => {
    const user = await readAuthUser(request)
    return service.listVentures(user)
  })

  app.get('/requests', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return service.listRequests(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/ventures/:ventureId', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ ventureId: z.string().min(1) }).parse(request.params)
      return service.getVenture(user, params.ventureId)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/ventures/:ventureId/requests', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ ventureId: z.string().min(1) }).parse(request.params)
      return service.listRequestsForVenture(user, params.ventureId)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/ventures/:ventureId/requests', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ ventureId: z.string().min(1) }).parse(request.params)
      const result = service.createRequest(user, params.ventureId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return reply.code(201).send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/submit', async (_request, reply) => reply.code(501).send({ message: 'Use venture request creation in v1.' }))

  app.post('/requests/:requestId/return', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = service.returnRequest(user, params.requestId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/approve', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = service.approveRequest(user, params.requestId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/close', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = service.closeRequest(user, params.requestId)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/artifacts/presign', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      return reply.code(201).send(await service.presignArtifact(user, params.requestId, request.body))
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/artifacts/complete', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const body = artifactCompleteSchema.parse(request.body)
      return service.completeArtifact(user, params.requestId, body.artifactId)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/mentors', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return service.listMentors(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentors', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const mentor = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        title: z.string(),
        location: z.string(),
        focus: z.array(z.string()),
        stages: z.array(z.string()),
        domains: z.array(z.string()),
        tolerance: z.enum(['Low', 'Medium', 'High']),
        monthlyLimit: z.number().int().positive(),
        visibility: z.enum(['Active', 'Paused']),
        responseWindow: z.string(),
        calendlyUrl: z.string(),
        bio: z.string(),
      }).parse(request.body)
      return reply.code(201).send(service.createMentor(user, mentor))
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.patch('/mentors/:mentorId', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ mentorId: z.string().min(1) }).parse(request.params)
      return service.updateMentor(user, params.mentorId, request.body as Record<string, unknown>)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/mentor-outreach', async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      return reply.code(201).send(await service.createMentorOutreach(user, params.requestId))
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentor-actions/:token/respond', async (_request, reply) =>
    reply.code(501).send({ message: 'Mentor accept/decline is not required for the current UI flow.' }),
  )

  app.post('/mentor-actions/:token/schedule', async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(10) }).parse(request.params)
      const result = service.mentorSchedule(params.token, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentor-actions/:token/feedback', async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(10) }).parse(request.params)
      const result = service.mentorFeedback(params.token, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/webhooks/calendly', async (request, reply) => {
    const eventId = String(request.headers['x-calendly-event-id'] || '')
    if (!eventId) {
      return reply.badRequest('Missing x-calendly-event-id header')
    }
    return reply.code(202).send(service.calendlyWebhook(eventId, request.body as Record<string, unknown>))
  })

  app.get('/notifications/stream', async (_request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.hijack()

    const send = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail
      reply.raw.write(`data: ${JSON.stringify(detail)}\n\n`)
    }

    events.addEventListener('request.updated', send)
    reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
    reply.raw.on('close', () => {
      events.removeEventListener('request.updated', send)
      reply.raw.end()
    })
  })

  return app
}
