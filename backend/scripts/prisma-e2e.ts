import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { createApp } from '../src/app'
import { HeuristicAiGateway } from '../src/ai/heuristicAiGateway'
import { createInlineQueuePublisher } from '../src/infra/inlineQueuePublisher'
import { createStubEmailGateway } from '../src/infra/stubEmailGateway'
import { createStubStorageService } from '../src/infra/stubStorageService'
import { createArgon2PasswordHasher } from '../src/infra/passwordHasher'
import { createRuntimeRepository } from '../src/runtime'
import { resetAndSeedDatabase } from '../prisma/seedData'

type JsonRecord = Record<string, unknown>

const expectEnv = (name: string) => {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} must be set before running the Prisma E2E smoke`)
  }

  return value
}

const requestJson = async <T>(baseUrl: string, path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers || {})

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${path}: ${text}`)
  }

  if (!text) {
    throw new Error(`Expected JSON response body for ${path}`)
  }

  return JSON.parse(text) as T
}

const loginAs = async (baseUrl: string, email: string) => {
  const requestBody = await requestJson<{ debugToken: string }>(baseUrl, '/auth/magic-link/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })

  assert.ok(requestBody.debugToken, `Expected a debug token for ${email}`)

  const verifyBody = await requestJson<{ accessToken: string }>(baseUrl, '/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token: requestBody.debugToken }),
  })

  assert.ok(verifyBody.accessToken, `Expected an access token for ${email}`)
  return verifyBody.accessToken
}

const authorizedJson = async <T>(baseUrl: string, token: string, path: string, init: RequestInit = {}) =>
  await requestJson<T>(baseUrl, path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  })

const run = async () => {
  expectEnv('DATABASE_URL')

  const seedPrisma = new PrismaClient()
  await resetAndSeedDatabase(seedPrisma)
  await seedPrisma.$disconnect()

  const runtime = createRuntimeRepository()
  assert.equal(runtime.mode, 'prisma', 'The live E2E must run with Prisma persistence')

  const app = createApp({
    repository: runtime.repository,
    email: createStubEmailGateway(),
    storage: createStubStorageService(),
    queue: createInlineQueuePublisher(),
    ai: new HeuristicAiGateway(),
    passwordHasher: createArgon2PasswordHasher(),
    exposeTokens: true,
    jwtIssuer: process.env.JWT_ISSUER || 'mentor-me-local',
    jwtAudience: process.env.JWT_AUDIENCE || 'mentor-me-web',
    jwtSecret: process.env.JWT_SECRET || 'development-secret',
    cookieSecret: process.env.COOKIE_SECRET || 'development-cookie-secret',
    defaultOrganizationId: process.env.DEFAULT_ORGANIZATION_ID || 'org-mentorme',
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
  })

  try {
    await app.listen({ host: '127.0.0.1', port: 0 })
    const address = app.server.address()

    assert.ok(address && typeof address === 'object', 'Expected the API server to expose a bound port')
    const baseUrl = `http://127.0.0.1:${address.port}`

    const docsBody = await requestJson<{ info: { title: string }; paths: JsonRecord }>(baseUrl, '/docs/json')
    assert.equal(docsBody.info.title, 'MentorMe API')
    assert.ok(docsBody.paths['/mentor-actions/{token}/respond'], 'OpenAPI document should include mentor action paths')

    const founderToken = await loginAs(baseUrl, 'aarav.sharma@mentorme.test')
    const founderVentures = await authorizedJson<{ ventures: Array<{ id: string }> }>(baseUrl, founderToken, '/ventures')
    assert.deepEqual(founderVentures.ventures.map((venture) => venture.id), ['v-ecodrone'])

    const createBody = await authorizedJson<{ request: { id: string; status: string; artifactList: string[] } }>(
      baseUrl,
      founderToken,
      '/ventures/v-ecodrone/requests',
      {
        method: 'POST',
        body: JSON.stringify({
          stage: 'Pilot',
          trl: 5,
          brl: 4,
          challenge: 'Need help preparing a campus pilot and investor update.',
          desiredOutcome: 'Leave with a sharper pilot plan and investor-ready milestone framing.',
          preferredMentorIds: ['m-radhika'],
          artifactRefs: ['pilot-plan-v1.pdf', 'investor-update-v2.md'],
        }),
      },
    )

    assert.equal(createBody.request.status, 'cfe_review')
    assert.deepEqual(createBody.request.artifactList, ['pilot-plan-v1.pdf', 'investor-update-v2.md'])

    const cfeToken = await loginAs(baseUrl, 'ritu.cfe@mentorme.test')
    const approveBody = await authorizedJson<{ request: { status: string } }>(
      baseUrl,
      cfeToken,
      `/requests/${createBody.request.id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ ownerName: 'Ritu from CFE' }),
      },
    )
    assert.equal(approveBody.request.status, 'awaiting_mentor')

    const outreachBody = await authorizedJson<{ mentorActionToken: string }>(
      baseUrl,
      cfeToken,
      `/requests/${createBody.request.id}/mentor-outreach`,
      { method: 'POST' },
    )
    assert.ok(outreachBody.mentorActionToken)

    const respondBody = await requestJson<{ decision: string }>(
      baseUrl,
      `/mentor-actions/${outreachBody.mentorActionToken}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ decision: 'accepted' }),
      },
    )
    assert.equal(respondBody.decision, 'accepted')

    const meetingAt = '2026-03-20T09:00:00.000Z'
    const calendlyLink = 'https://calendly.com/dr-radhika/engineering-review'
    const scheduleBody = await requestJson<{ request: { status: string; meetingAt: string; calendlyLink: string } }>(
      baseUrl,
      `/mentor-actions/${outreachBody.mentorActionToken}/schedule`,
      {
        method: 'POST',
        body: JSON.stringify({ meetingAt, calendlyLink }),
      },
    )
    assert.equal(scheduleBody.request.status, 'scheduled')
    assert.equal(scheduleBody.request.meetingAt, meetingAt)
    assert.equal(scheduleBody.request.calendlyLink, calendlyLink)

    const feedbackBody = await requestJson<{ request: { status: string; mentorNotes: string } }>(
      baseUrl,
      `/mentor-actions/${outreachBody.mentorActionToken}/feedback`,
      {
        method: 'POST',
        body: JSON.stringify({
          mentorNotes: 'Pilot plan is solid. Tighten the system-risk narrative before investor follow-ups.',
          nextStepRequired: true,
          secondSessionRecommended: false,
        }),
      },
    )
    assert.equal(feedbackBody.request.status, 'follow_up')

    const founderRequests = await authorizedJson<{
      requests: Array<{ id: string; status: string; mentorNotes: string; artifactList: string[] }>
    }>(baseUrl, founderToken, '/requests')

    const createdRequest = founderRequests.requests.find((request) => request.id === createBody.request.id)
    assert.ok(createdRequest, 'Expected the founder to see the newly-created request')
    assert.equal(createdRequest.status, 'follow_up')
    assert.equal(
      createdRequest.mentorNotes,
      'Pilot plan is solid. Tighten the system-risk narrative before investor follow-ups.',
    )
    assert.deepEqual(createdRequest.artifactList, ['pilot-plan-v1.pdf', 'investor-update-v2.md'])

    const verifyPrisma = new PrismaClient()
    const [meetingCount, feedbackCount, outboxCount] = await Promise.all([
      verifyPrisma.meeting.count({ where: { requestId: createBody.request.id } }),
      verifyPrisma.meetingFeedback.count({ where: { requestId: createBody.request.id } }),
      verifyPrisma.outboxEvent.count({ where: { aggregateId: createBody.request.id } }),
    ])
    await verifyPrisma.$disconnect()

    assert.equal(meetingCount, 1, 'Expected one persisted meeting for the E2E request')
    assert.equal(feedbackCount, 1, 'Expected one persisted feedback record for the E2E request')
    assert.ok(outboxCount >= 4, 'Expected multiple outbox events for the E2E request lifecycle')

    console.log(`Prisma E2E smoke passed against ${baseUrl}`)
  } finally {
    await app.close()
  }
}

void run().catch((error) => {
  console.error(error)
  process.exit(1)
})
