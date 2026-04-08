// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import { HeuristicAiGateway } from './ai/heuristicAiGateway'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'

type SeedConfigurator = Parameters<typeof createSeededInMemoryPlatformRepository>[0]

const parseJson = <T>(response: { body: string }) => JSON.parse(response.body) as T

const buildTestApp = (configureRepository?: SeedConfigurator) => {
  const repository = createSeededInMemoryPlatformRepository(configureRepository)
  const email = createStubEmailGateway()
  const storage = createStubStorageService()
  const queue = createInlineQueuePublisher()
  const ai = new HeuristicAiGateway()
  const generateRequestBrief = vi.spyOn(ai, 'generateRequestBrief')
  const generateMeetingSummary = vi.spyOn(ai, 'generateMeetingSummary')

  const app = createApp({
    repository,
    email,
    storage,
    queue,
    ai,
    exposeTokens: true,
    jwtIssuer: 'mentor-me-test',
    jwtAudience: 'mentor-me-web',
    jwtSecret: 'test-secret',
    cookieSecret: 'cookie-secret',
  })

  return { app, repository, email, storage, queue, ai, generateRequestBrief, generateMeetingSummary }
}

describe('MentorMe backend workflow', () => {
  beforeEach(async () => {
    // no-op placeholder to keep future global setup symmetric
  })

  it('exposes a deployment health check endpoint', async () => {
    const { app } = buildTestApp()

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
    })

    expect(response.statusCode).toBe(200)
    expect(parseJson<{ status: string }>(response).status).toBe('ok')
  })

  it('issues a magic link, verifies it, and returns the authenticated user context', async () => {
    const { app } = buildTestApp()

    const requestRes = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email: 'aarav.sharma@mentorme.test' },
    })

    expect(requestRes.statusCode).toBe(202)
    const requestBody = parseJson<{ debugToken: string }>(requestRes)
    expect(requestBody.debugToken).toBeTruthy()

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: requestBody.debugToken },
    })

    expect(verifyRes.statusCode).toBe(200)
    const verifyBody = parseJson<{ accessToken: string; user: { role: string } }>(verifyRes)
    expect(verifyBody.user.role).toBe('founder')
    expect(verifyBody.accessToken).toBeTruthy()

    const meRes = await app.inject({
      method: 'GET',
      url: '/me',
      headers: {
        authorization: `Bearer ${verifyBody.accessToken}`,
      },
    })

    expect(meRes.statusCode).toBe(200)
    expect(parseJson<{ user: { email: string } }>(meRes).user.email).toBe('aarav.sharma@mentorme.test')
  })

  it('scopes venture data to the authenticated founder and creates a new request in cfe_review', async () => {
    const { app } = buildTestApp()
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const venturesRes = await app.inject({
      method: 'GET',
      url: '/ventures',
      headers: { authorization: `Bearer ${founderToken}` },
    })

    expect(venturesRes.statusCode).toBe(200)
    const venturesBody = parseJson<{ ventures: Array<{ name: string }> }>(venturesRes)
    expect(venturesBody.ventures).toHaveLength(1)
    expect(venturesBody.ventures[0].name).toBe('EcoDrone Systems')

    const createRes = await app.inject({
      method: 'POST',
      url: '/ventures/v-ecodrone/requests',
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        stage: 'MVP',
        trl: 4,
        brl: 3,
        challenge: 'Need help sharpening fundraising narrative.',
        desiredOutcome: 'Leave with a pitch story and next-step plan.',
        preferredMentorIds: ['m-naval'],
        artifactRefs: [],
      },
    })

    expect(createRes.statusCode).toBe(201)
    expect(parseJson<{ request: { status: string } }>(createRes).request.status).toBe('cfe_review')

    const requestsRes = await app.inject({
      method: 'GET',
      url: '/ventures/v-ecodrone/requests',
      headers: { authorization: `Bearer ${founderToken}` },
    })

    expect(requestsRes.statusCode).toBe(200)
    expect(parseJson<{ requests: Array<{ challenge: string }> }>(requestsRes).requests[0].challenge).toBe(
      'Need help sharpening fundraising narrative.',
    )
  })

  it('keeps request listings scoped by venture id even when ventures share the same display name', async () => {
    const { app } = buildTestApp((state) => {
      state.users.push({
        id: 'user-founder-isha',
        organizationId: state.organization.id,
        cohortId: state.cohort.id,
        email: 'isha.verma@mentorme.test',
        name: 'Isha Verma',
        role: 'founder',
      })
      state.ventures.push({
        id: 'v-ecodrone-2',
        organizationId: state.organization.id,
        cohortId: state.cohort.id,
        name: 'EcoDrone Systems',
        founderName: 'Isha Verma',
        domain: 'Industrial drones',
        stage: 'Idea',
        trl: 2,
        brl: 1,
        location: 'Mumbai, India',
        summary: 'A second venture with the same public-facing name.',
        nextMilestone: 'Validate customer discovery.',
        programNote: 'Requires careful scoping.',
      })
      state.ventureMemberships.push({
        id: 'vm-003',
        organizationId: state.organization.id,
        ventureId: 'v-ecodrone-2',
        userId: 'user-founder-isha',
        role: 'founder',
      })
      state.requests.push({
        id: 'REQ-900',
        organizationId: state.organization.id,
        ventureId: 'v-ecodrone-2',
        founderUserId: 'user-founder-isha',
        mentorId: 'm-naval',
        stage: 'Idea',
        trl: 2,
        brl: 1,
        status: 'cfe_review',
        challenge: 'Need another venture with the same display name.',
        desiredOutcome: 'Make sure the original founder cannot see this.',
        mentorNotes: '',
        createdAt: '2026-03-08T09:00:00.000Z',
        updatedAt: '2026-03-08T09:00:00.000Z',
        submittedAt: '2026-03-08T09:00:00.000Z',
      })
    })
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const requestsRes = await app.inject({
      method: 'GET',
      url: '/requests',
      headers: { authorization: `Bearer ${founderToken}` },
    })

    expect(requestsRes.statusCode).toBe(200)
    const requestsBody = parseJson<{ requests: Array<{ id: string }> }>(requestsRes)
    expect(requestsBody.requests.map((request) => request.id)).not.toContain('REQ-900')
  })

  it('lets CFE return and approve requests while preserving the audit trail', async () => {
    const { app, repository } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const returnRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/return',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        reason: 'Need sharper supporting material before routing.',
      },
    })

    expect(returnRes.statusCode).toBe(200)
    expect(parseJson<{ request: { status: string } }>(returnRes).request.status).toBe('needs_work')

    const approveRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/approve',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        ownerName: 'Ritu from CFE',
      },
    })

    expect(approveRes.statusCode).toBe(200)
    expect(parseJson<{ request: { status: string } }>(approveRes).request.status).toBe('awaiting_mentor')

    const events = await repository.listAuditEventsForEntity('mentor_request', 'REQ-002')
    expect(events.map((event) => event.action)).toContain('request.returned')
    expect(events.map((event) => event.action)).toContain('request.approved')
  })

  it('lets founders resubmit a returned request back into CFE review', async () => {
    const { app, repository } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const returnRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/return',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        reason: 'Please add a clearer fundraising memo before routing.',
      },
    })

    expect(returnRes.statusCode).toBe(200)
    expect(parseJson<{ request: { status: string } }>(returnRes).request.status).toBe('needs_work')

    const submitRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/submit',
      headers: { authorization: `Bearer ${founderToken}` },
    })

    expect(submitRes.statusCode).toBe(200)
    expect(parseJson<{ request: { status: string } }>(submitRes).request.status).toBe('cfe_review')

    const events = await repository.listAuditEventsForEntity('mentor_request', 'REQ-002')
    expect(events.map((event) => event.action)).toContain('request.resubmitted')
  })

  it('lets CFE update mentor visibility and exposes PATCH in CORS preflight responses', async () => {
    const { app, repository } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const updateRes = await app.inject({
      method: 'PATCH',
      url: '/mentors/m-naval',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        visibility: 'Paused',
      },
    })

    expect(updateRes.statusCode).toBe(200)
    expect(parseJson<{ mentor: { visibility: string } }>(updateRes).mentor.visibility).toBe('Paused')
    expect((await repository.findMentorById('m-naval'))?.visibility).toBe('Paused')

    const preflightRes = await app.inject({
      method: 'OPTIONS',
      url: '/mentors/m-naval',
      headers: {
        origin: 'http://127.0.0.1:4173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type',
      },
    })

    expect(preflightRes.statusCode).toBe(204)
    expect(preflightRes.headers['access-control-allow-origin']).toBe('http://127.0.0.1:4173')
    expect(preflightRes.headers['access-control-allow-credentials']).toBe('true')
    expect(preflightRes.headers['access-control-allow-methods']).toContain('PATCH')
  })

  it('reserves and completes artifact uploads through the presign flow', async () => {
    const { app, storage } = buildTestApp()
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const presignRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/artifacts/presign',
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        filename: 'pitch-deck-v5.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
      },
    })

    expect(presignRes.statusCode).toBe(201)
    const presignBody = parseJson<{ uploadUrl: string; artifact: { id: string } }>(presignRes)
    expect(presignBody.uploadUrl).toContain('pitch-deck-v5.pdf')
    expect(storage.presignedUploads).toHaveLength(1)

    const completeRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/artifacts/complete',
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        artifactId: presignBody.artifact.id,
      },
    })

    expect(completeRes.statusCode).toBe(200)
    expect(parseJson<{ artifact: { status: string } }>(completeRes).artifact.status).toBe('uploaded')
  })

  it('persists artifact refs from founder request creation into subsequent request reads', async () => {
    const { app } = buildTestApp()
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const createRes = await app.inject({
      method: 'POST',
      url: '/ventures/v-ecodrone/requests',
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        stage: 'MVP',
        trl: 4,
        brl: 3,
        challenge: 'Need feedback on the deck and technical validation packet.',
        desiredOutcome: 'Route this with the supporting material still attached.',
        preferredMentorIds: ['m-naval'],
        artifactRefs: ['pitch-deck-v6.pdf', 'technical-spec-v2.md'],
      },
    })

    expect(createRes.statusCode).toBe(201)
    const createdBody = parseJson<{ request: { id: string; artifactList: string[] } }>(createRes)
    expect(createdBody.request.artifactList).toEqual(['pitch-deck-v6.pdf', 'technical-spec-v2.md'])

    const requestsRes = await app.inject({
      method: 'GET',
      url: '/requests',
      headers: { authorization: `Bearer ${founderToken}` },
    })

    const requestsBody = parseJson<{ requests: Array<{ id: string; artifactList: string[] }> }>(requestsRes)
    const createdRequest = requestsBody.requests.find((request) => request.id === createdBody.request.id)
    expect(createdRequest?.artifactList).toEqual(['pitch-deck-v6.pdf', 'technical-spec-v2.md'])
  })

  it('uses mentor action tokens to schedule a meeting and submit feedback', async () => {
    const { app } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const outreachRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/mentor-outreach',
      headers: { authorization: `Bearer ${cfeToken}` },
    })

    expect(outreachRes.statusCode).toBe(201)
    const token = parseJson<{ mentorActionToken: string }>(outreachRes).mentorActionToken

    const scheduleRes = await app.inject({
      method: 'POST',
      url: `/mentor-actions/${token}/schedule`,
      payload: {
        calendlyLink: 'https://calendly.com/naval-shah/mentor-hour',
        meetingAt: '2026-03-15T09:00:00.000Z',
      },
    })

    expect(scheduleRes.statusCode).toBe(200)
    expect(parseJson<{ request: { status: string } }>(scheduleRes).request.status).toBe('scheduled')

    const feedbackRes = await app.inject({
      method: 'POST',
      url: `/mentor-actions/${token}/feedback`,
      payload: {
        mentorNotes: 'Tighten the investor narrative around pilot proof.',
        nextStepRequired: true,
        secondSessionRecommended: false,
      },
    })

    expect(feedbackRes.statusCode).toBe(200)
    expect(parseJson<{ request: { status: string } }>(feedbackRes).request.status).toBe('follow_up')
  })

  it('records mentor accept and decline responses through secure action links', async () => {
    const { app, repository } = buildTestApp((state) => {
      state.requests.push({
        id: 'REQ-901',
        organizationId: state.organization.id,
        ventureId: 'v-ecodrone',
        founderUserId: 'user-founder-aarav',
        mentorId: 'm-radhika',
        stage: 'Pilot',
        trl: 5,
        brl: 4,
        status: 'awaiting_mentor',
        challenge: 'Need a second routing target in case the first mentor declines.',
        desiredOutcome: 'Keep the request live while testing the mentor response endpoint.',
        mentorNotes: '',
        createdAt: '2026-03-10T09:00:00.000Z',
        updatedAt: '2026-03-10T09:00:00.000Z',
        submittedAt: '2026-03-10T09:00:00.000Z',
      })
    })
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const acceptOutreachRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-003/mentor-outreach',
      headers: { authorization: `Bearer ${cfeToken}` },
    })

    expect(acceptOutreachRes.statusCode).toBe(201)
    const acceptOutreachBody = parseJson<{ mentorActionToken: string }>(acceptOutreachRes)

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/mentor-actions/${acceptOutreachBody.mentorActionToken}/respond`,
      payload: {
        decision: 'accepted',
      },
    })

    expect(acceptRes.statusCode).toBe(200)
    expect(parseJson<{ decision: string }>(acceptRes).decision).toBe('accepted')
    expect((await repository.findRequestById('REQ-003'))?.mentorId).toBe('m-radhika')

    const declineOutreachRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-901/mentor-outreach',
      headers: { authorization: `Bearer ${cfeToken}` },
    })

    expect(declineOutreachRes.statusCode).toBe(201)
    const declineOutreachBody = parseJson<{ mentorActionToken: string }>(declineOutreachRes)

    const declineRes = await app.inject({
      method: 'POST',
      url: `/mentor-actions/${declineOutreachBody.mentorActionToken}/respond`,
      payload: {
        decision: 'declined',
        reason: 'Capacity is full this month.',
      },
    })

    expect(declineRes.statusCode).toBe(200)
    expect(parseJson<{ decision: string }>(declineRes).decision).toBe('declined')
    expect((await repository.findRequestById('REQ-901'))?.mentorId).toBeUndefined()
    expect((await repository.findRequestById('REQ-901'))?.status).toBe('awaiting_mentor')

    const events = await repository.listAuditEventsForEntity('mentor_request', 'REQ-901')
    expect(events.map((event) => event.action)).toContain('mentor.declined')
  })

  it('loads secure mentor action details for a generated outreach link', async () => {
    const { app } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const outreachRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-003/mentor-outreach',
      headers: { authorization: `Bearer ${cfeToken}` },
    })

    expect(outreachRes.statusCode).toBe(201)
    const token = parseJson<{ mentorActionToken: string }>(outreachRes).mentorActionToken

    const detailRes = await app.inject({
      method: 'GET',
      url: `/mentor-actions/${token}`,
    })

    expect(detailRes.statusCode).toBe(200)
    const detailBody = parseJson<{
      mentor: { id: string; name: string }
      mentorAction: { purpose: string; response?: string }
      request: { id: string; status: string }
    }>(detailRes)
    expect(detailBody.mentor.id).toBe('m-radhika')
    expect(detailBody.mentor.name).toBe('Dr. Radhika Gupta')
    expect(detailBody.mentorAction.purpose).toBe('mentor_request')
    expect(detailBody.mentorAction.response).toBeUndefined()
    expect(detailBody.request.id).toBe('REQ-003')
    expect(detailBody.request.status).toBe('awaiting_mentor')
  })

  it('serves Swagger UI and a usable OpenAPI document for endpoint testing', async () => {
    const { app } = buildTestApp()

    const jsonRes = await app.inject({
      method: 'GET',
      url: '/docs/json',
    })

    expect(jsonRes.statusCode).toBe(200)
    const jsonBody = parseJson<{ openapi: string; info: { title: string }; paths: Record<string, unknown> }>(jsonRes)
    expect(jsonBody.openapi).toBe('3.1.0')
    expect(jsonBody.info.title).toBe('MentorMe API')
    expect(jsonBody.paths['/healthz']).toBeTruthy()
    expect(jsonBody.paths['/ventures/{ventureId}/requests']).toBeTruthy()
    expect(jsonBody.paths['/mentor-actions/{token}']).toBeTruthy()
    expect(jsonBody.paths['/mentor-actions/{token}/respond']).toBeTruthy()
    expect(jsonBody.paths['/ai/request-brief']).toBeTruthy()
    expect(jsonBody.paths['/ai/meeting-summary']).toBeTruthy()

    const uiRes = await app.inject({
      method: 'GET',
      url: '/docs/',
    })

    expect(uiRes.statusCode).toBe(200)
    expect(uiRes.headers['content-type']).toContain('text/html')
    expect(uiRes.body.toLowerCase()).toContain('swagger-ui')
  })

  it('generates a structured founder brief through the AI endpoint', async () => {
    const { app, generateRequestBrief } = buildTestApp()
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const response = await app.inject({
      method: 'POST',
      url: '/ai/request-brief',
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        ventureName: 'EcoDrone Systems',
        domain: 'Industrial drones',
        stage: 'MVP',
        trl: 4,
        brl: 3,
        rawNotes:
          'We built an MVP but the current investor story is messy and the founder is not sure how to sequence pilot conversations. Need help framing the next mentor discussion around traction proof and pilot focus.',
        desiredOutcomeHint: 'Leave with a sharper investor story and pilot plan.',
        artifactRefs: ['Pitch deck v4'],
      },
    })

    expect(response.statusCode).toBe(200)
    const body = parseJson<{ suggestion: { provider: string; mentorFitTags: string[] } }>(response)
    expect(body.suggestion.provider).toBe('heuristic')
    expect(body.suggestion.mentorFitTags.length).toBeGreaterThan(0)
    expect(generateRequestBrief).toHaveBeenCalledTimes(1)
  })

  it('generates a structured meeting summary through the AI endpoint', async () => {
    const { app, generateMeetingSummary } = buildTestApp()
    const studentToken = await loginAs(app, 'ria.student@mentorme.test')

    const response = await app.inject({
      method: 'POST',
      url: '/ai/meeting-summary',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        ventureName: 'EcoDrone Systems',
        mentorName: 'Naval Bhatia',
        requestChallenge: 'Need help tightening fundraising framing and pilot sequencing.',
        desiredOutcome: 'Leave with a better investor story and cleaner pilot next steps.',
        meetingNotes:
          'Mentor asked the founder to choose one pilot wedge, define the two traction metrics that matter, and send a tighter 8-slide deck before asking for the next intro. Student should update the pre-read and CFE should review whether an operations mentor is needed.',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = parseJson<{ summary: { provider: string; founderActionItems: string[] } }>(response)
    expect(body.summary.provider).toBe('heuristic')
    expect(body.summary.founderActionItems.length).toBeGreaterThan(0)
    expect(generateMeetingSummary).toHaveBeenCalledTimes(1)
  })

  it('handles Calendly webhooks idempotently by provider event id and stores the scheduled event link', async () => {
    const { app, repository } = buildTestApp()

    const payload = {
      event: 'invitee.created',
      payload: {
        event: 'https://api.calendly.com/scheduled_events/evt_123',
        invitee: 'https://api.calendly.com/scheduled_events/evt_123/invitees/inv_123',
        tracking: { mentorRequestId: 'REQ-003' },
        scheduled_at: '2026-03-09T11:00:00.000Z',
        cancel_url: 'https://calendly.com/cancel/inv_123',
      },
    }

    const firstRes = await app.inject({
      method: 'POST',
      url: '/webhooks/calendly',
      headers: {
        'x-calendly-event-id': 'evt_123',
      },
      payload,
    })
    const secondRes = await app.inject({
      method: 'POST',
      url: '/webhooks/calendly',
      headers: {
        'x-calendly-event-id': 'evt_123',
      },
      payload,
    })

    expect(firstRes.statusCode).toBe(202)
    expect(secondRes.statusCode).toBe(202)
    expect(parseJson<{ duplicate: boolean }>(secondRes).duplicate).toBe(true)
    expect((await repository.listMeetingsForRequest('REQ-003'))[0].joinLink).toBe(
      'https://api.calendly.com/scheduled_events/evt_123',
    )
    expect((await repository.findRequestById('REQ-003'))?.calendlyLink).toBe('https://api.calendly.com/scheduled_events/evt_123')
  })

  it('rejects unauthenticated notification stream requests', async () => {
    const { app } = buildTestApp()

    const notificationsRes = await app.inject({
      method: 'GET',
      url: '/notifications/stream',
    })

    expect(notificationsRes.statusCode).toBe(400)
    expect(notificationsRes.body).toContain('Unauthorized')
  })
})

async function loginAs(app: ReturnType<typeof createApp>, email: string) {
  const requestRes = await app.inject({
    method: 'POST',
    url: '/auth/magic-link/request',
    payload: { email },
  })

  const verifyRes = await app.inject({
    method: 'POST',
    url: '/auth/magic-link/verify',
    payload: { token: parseJson<{ debugToken: string }>(requestRes).debugToken },
  })

  return parseJson<{ accessToken: string }>(verifyRes).accessToken
}
