// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import { HeuristicAiGateway } from './ai/heuristicAiGateway'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'
import type { GoogleOAuthGateway, GoogleOAuthProfile, GoogleOAuthTokens } from './domain/interfaces'
import type { PasswordHasher } from './infra/passwordHasher'

type SeedConfigurator = Parameters<typeof createSeededInMemoryPlatformRepository>[0]

interface StubGoogleOAuthOptions {
  redirectUri?: string
  exchange?: (code: string) => Promise<GoogleOAuthTokens>
  fetchProfile?: (accessToken: string) => Promise<GoogleOAuthProfile>
}

const createStubPasswordHasher = (): PasswordHasher => ({
  async hash(plain: string) {
    return `hashed:${plain}`
  },
  async verify(hash: string, plain: string) {
    return hash === `hashed:${plain}`
  },
})

const createStubGoogleOAuth = (options: StubGoogleOAuthOptions = {}): GoogleOAuthGateway => ({
  redirectUri: options.redirectUri || 'http://localhost:5173/auth/google/callback',
  buildAuthorizeUrl(state: string) {
    return `https://accounts.google.test/o/oauth2/v2/auth?state=${encodeURIComponent(state)}`
  },
  exchangeCode:
    options.exchange ||
    (async (code: string) => ({ accessToken: `google-access-${code}`, expiresInSeconds: 3600 })),
  fetchProfile:
    options.fetchProfile ||
    (async () => ({
      providerAccountId: 'google-acct-1',
      email: 'new.founder@mentorme.test',
      emailVerified: true,
      name: 'New Founder',
    })),
})

const parseJson = <T>(response: { body: string }) => JSON.parse(response.body) as T

interface BuildTestAppOptions {
  configureRepository?: SeedConfigurator
  googleOAuth?: GoogleOAuthGateway
}

const buildTestApp = (input: SeedConfigurator | BuildTestAppOptions = {}) => {
  const opts: BuildTestAppOptions =
    typeof input === 'function' ? { configureRepository: input } : input

  const repository = createSeededInMemoryPlatformRepository(opts.configureRepository)
  const email = createStubEmailGateway()
  const storage = createStubStorageService()
  const queue = createInlineQueuePublisher()
  const ai = new HeuristicAiGateway()
  const passwordHasher = createStubPasswordHasher()
  const generateRequestBrief = vi.spyOn(ai, 'generateRequestBrief')
  const generateMeetingSummary = vi.spyOn(ai, 'generateMeetingSummary')

  const app = createApp({
    repository,
    email,
    storage,
    queue,
    ai,
    passwordHasher,
    googleOAuth: opts.googleOAuth,
    exposeTokens: true,
    jwtIssuer: 'mentor-me-test',
    jwtAudience: 'mentor-me-web',
    jwtSecret: 'test-secret',
    cookieSecret: 'cookie-secret',
    defaultOrganizationId: 'org-mentorme',
    appBaseUrl: 'http://localhost:5173',
  })

  return {
    app,
    repository,
    email,
    storage,
    queue,
    ai,
    passwordHasher,
    generateRequestBrief,
    generateMeetingSummary,
  }
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
    expect(jsonBody.paths['/ai/mentor-recommendations']).toBeTruthy()

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

  it('returns AI-ranked mentor recommendations from active mentor profiles only', async () => {
    const { app } = buildTestApp((state) => {
      state.mentors.push({
        id: 'm-paused-growth',
        organizationId: state.organization.id,
        name: 'Paused Growth Mentor',
        email: 'paused.growth@mentorme.test',
        title: 'Growth Advisor',
        location: 'Remote',
        focus: ['Growth loops', 'Fundraising'],
        stages: ['MVP', 'Pilot'],
        domains: ['Industrial drones'],
        tolerance: 'High',
        monthlyLimit: 2,
        visibility: 'Paused',
        responseWindow: '48 hours',
        calendlyUrl: '',
        bio: 'Strong fit, but intentionally paused.',
      })
    })
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const response = await app.inject({
      method: 'POST',
      url: '/ai/mentor-recommendations',
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        ventureName: 'EcoDrone Systems',
        domain: 'Industrial drones',
        stage: 'MVP',
        trl: 4,
        brl: 3,
        challenge: 'Need help tightening fundraising framing and sequencing pilot conversations.',
        desiredOutcome: 'Leave with a sharper investor story and a clearer pilot wedge.',
      },
    })

    expect(response.statusCode).toBe(200)
    const body = parseJson<{
      recommendations: {
        provider: string
        routingNote: string
        shortlist: Array<{ mentorId: string; reasons: string[]; score: number }>
      }
    }>(response)
    expect(body.recommendations.provider).toBe('heuristic')
    expect(body.recommendations.shortlist.length).toBeGreaterThan(0)
    expect(body.recommendations.shortlist.every((item) => item.mentorId !== 'm-paused-growth')).toBe(true)
    expect(body.recommendations.shortlist[0].reasons.length).toBeGreaterThan(0)
    expect(body.recommendations.routingNote.length).toBeGreaterThan(0)
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

  it('registers a new founder, sends a welcome email, and issues a session', async () => {
    const { app, email, repository } = buildTestApp()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: '  Priya Founder  ',
        email: 'Priya.Founder@MentorMe.test',
        password: 'SuperSecret-123',
        role: 'founder',
      },
    })

    expect(response.statusCode).toBe(201)
    const body = parseJson<{ accessToken: string; user: { email: string; role: string; name: string } }>(response)
    expect(body.user.email).toBe('priya.founder@mentorme.test')
    expect(body.user.name).toBe('Priya Founder')
    expect(body.user.role).toBe('founder')
    expect(body.accessToken).toBeTruthy()
    expect(response.cookies.find((cookie) => cookie.name === 'mentor_me_refresh')?.value).toBeTruthy()

    const stored = await repository.findUserByEmail('priya.founder@mentorme.test')
    expect(stored?.passwordHash).toBeTruthy()
    expect(stored?.passwordHash).not.toBe('SuperSecret-123')

    const welcome = email.sent.find((entry) => entry.type === 'welcome')
    expect(welcome).toMatchObject({ email: 'priya.founder@mentorme.test', name: 'Priya Founder' })
  })

  it('rejects registration when the email is already in use', async () => {
    const { app } = buildTestApp()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@mentorme.test',
        password: 'AnotherPassword-1',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.body).toContain('email')
  })

  it('lets a registered user log in with email + password', async () => {
    const { app } = buildTestApp()

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Login Tester',
        email: 'login.tester@mentorme.test',
        password: 'CorrectHorse-Battery-Staple',
        role: 'student',
      },
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {
        email: 'LOGIN.tester@mentorme.test',
        password: 'CorrectHorse-Battery-Staple',
      },
    })

    expect(loginRes.statusCode).toBe(200)
    const body = parseJson<{ accessToken: string; user: { email: string; role: string } }>(loginRes)
    expect(body.user.email).toBe('login.tester@mentorme.test')
    expect(body.user.role).toBe('student')
    expect(body.accessToken).toBeTruthy()

    const meRes = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${body.accessToken}` },
    })
    expect(meRes.statusCode).toBe(200)
    expect(parseJson<{ user: { email: string } }>(meRes).user.email).toBe('login.tester@mentorme.test')
  })

  it('rejects logins with unknown email or wrong password', async () => {
    const { app } = buildTestApp()

    const unknownRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nope@mentorme.test', password: 'whatever-1234' },
    })
    expect(unknownRes.statusCode).toBe(401)
    expect(unknownRes.body).toContain('Invalid email or password')

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Wrong Pass',
        email: 'wrong.pass@mentorme.test',
        password: 'RightPass-9999',
      },
    })

    const wrongPassRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'wrong.pass@mentorme.test', password: 'WrongPass-0000' },
    })
    expect(wrongPassRes.statusCode).toBe(401)
    expect(wrongPassRes.body).toContain('Invalid email or password')
  })

  it('rejects login for magic-link-only accounts (no password set)', async () => {
    const { app } = buildTestApp()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'aarav.sharma@mentorme.test', password: 'anything-12345' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.body).toContain('Invalid email or password')
  })

  it('completes a forgot/reset password flow and revokes prior sessions', async () => {
    const { app, email, repository } = buildTestApp()

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Reset User',
        email: 'reset.user@mentorme.test',
        password: 'OldPassword-1234',
      },
    })

    const initialLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'reset.user@mentorme.test', password: 'OldPassword-1234' },
    })
    expect(initialLogin.statusCode).toBe(200)
    const initialRefreshCookie = initialLogin.cookies.find((cookie) => cookie.name === 'mentor_me_refresh')
    expect(initialRefreshCookie?.value).toBeTruthy()
    const oldRefreshToken = initialRefreshCookie!.value

    const forgotRes = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'reset.user@mentorme.test' },
    })
    expect(forgotRes.statusCode).toBe(202)
    const forgotBody = parseJson<{ accepted: boolean; debugToken?: string }>(forgotRes)
    expect(forgotBody.accepted).toBe(true)
    expect(forgotBody.debugToken).toBeTruthy()

    const resetEmail = email.sent.find((entry) => entry.type === 'password_reset')
    expect(resetEmail).toMatchObject({ email: 'reset.user@mentorme.test', name: 'Reset User' })

    const resetRes = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: forgotBody.debugToken, password: 'BrandNew-Password-1!' },
    })
    expect(resetRes.statusCode).toBe(200)
    expect(parseJson<{ user: { email: string } }>(resetRes).user.email).toBe('reset.user@mentorme.test')

    const replayRes = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: forgotBody.debugToken, password: 'AnotherNew-Password-9!' },
    })
    expect(replayRes.statusCode).toBe(400)
    expect(replayRes.body).toContain('Invalid or expired')

    const oldLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'reset.user@mentorme.test', password: 'OldPassword-1234' },
    })
    expect(oldLogin.statusCode).toBe(401)

    const newLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'reset.user@mentorme.test', password: 'BrandNew-Password-1!' },
    })
    expect(newLogin.statusCode).toBe(200)

    const refreshOldSession = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { mentor_me_refresh: oldRefreshToken },
    })
    expect(refreshOldSession.statusCode).toBe(400)

    expect(await repository.findUserByEmail('reset.user@mentorme.test')).toBeTruthy()
  })

  it('returns 202 from forgot-password for unknown emails without leaking existence', async () => {
    const { app, email } = buildTestApp()

    const response = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: 'nobody@mentorme.test' },
    })

    expect(response.statusCode).toBe(202)
    const body = parseJson<{ accepted: boolean; debugToken?: string }>(response)
    expect(body.accepted).toBe(true)
    expect(body.debugToken).toBeUndefined()
    expect(email.sent.find((entry) => entry.type === 'password_reset')).toBeUndefined()
  })

  it('lets a logged-in user change their password and rotates sessions', async () => {
    const { app } = buildTestApp()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Change Pass',
        email: 'change.pass@mentorme.test',
        password: 'OriginalPass-2024',
      },
    })
    const accessToken = parseJson<{ accessToken: string }>(registerRes).accessToken
    const oldRefreshToken = registerRes.cookies.find((cookie) => cookie.name === 'mentor_me_refresh')!.value

    const wrongCurrentRes = await app.inject({
      method: 'POST',
      url: '/auth/change-password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'WrongCurrent-1234', newPassword: 'BrandNew-Password-1!' },
    })
    expect(wrongCurrentRes.statusCode).toBe(400)

    const samePasswordRes = await app.inject({
      method: 'POST',
      url: '/auth/change-password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'OriginalPass-2024', newPassword: 'OriginalPass-2024' },
    })
    expect(samePasswordRes.statusCode).toBe(400)
    expect(samePasswordRes.body).toContain('differ')

    const changeRes = await app.inject({
      method: 'POST',
      url: '/auth/change-password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { currentPassword: 'OriginalPass-2024', newPassword: 'TotallyNew-Password-1!' },
    })
    expect(changeRes.statusCode).toBe(200)

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { mentor_me_refresh: oldRefreshToken },
    })
    expect(refreshRes.statusCode).toBe(400)

    const oldPwdLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'change.pass@mentorme.test', password: 'OriginalPass-2024' },
    })
    expect(oldPwdLogin.statusCode).toBe(401)

    const newPwdLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'change.pass@mentorme.test', password: 'TotallyNew-Password-1!' },
    })
    expect(newPwdLogin.statusCode).toBe(200)
  })

  it('returns 501 for Google OAuth endpoints when the gateway is not configured', async () => {
    const { app } = buildTestApp()

    const authorizeRes = await app.inject({
      method: 'POST',
      url: '/auth/google/authorize-url',
      payload: {},
    })
    expect(authorizeRes.statusCode).toBe(501)
    expect(authorizeRes.body).toContain('not configured')

    const callbackRes = await app.inject({
      method: 'POST',
      url: '/auth/google/callback',
      payload: { code: 'a'.repeat(20), state: 'b'.repeat(20) },
    })
    expect(callbackRes.statusCode).toBe(501)
    expect(callbackRes.body).toContain('not configured')
  })

  it('signs Google OAuth state, exchanges codes, and signs up new founders', async () => {
    const googleOAuth = createStubGoogleOAuth({
      fetchProfile: async () => ({
        providerAccountId: 'google-acct-new-1',
        email: 'oauth.new@mentorme.test',
        emailVerified: true,
        name: 'OAuth Newcomer',
      }),
    })
    const { app, email, repository } = buildTestApp({ googleOAuth })

    const authorizeRes = await app.inject({
      method: 'POST',
      url: '/auth/google/authorize-url',
      payload: { redirectAfter: '/founder' },
    })
    expect(authorizeRes.statusCode).toBe(200)
    const authorizeBody = parseJson<{ authorizeUrl: string; state: string }>(authorizeRes)
    expect(authorizeBody.state).toBeTruthy()
    expect(authorizeBody.authorizeUrl).toContain('accounts.google.test')
    expect(authorizeBody.authorizeUrl).toContain(encodeURIComponent(authorizeBody.state))

    const callbackRes = await app.inject({
      method: 'POST',
      url: '/auth/google/callback',
      payload: { code: 'google-code-1234567890', state: authorizeBody.state },
    })
    expect(callbackRes.statusCode).toBe(200)
    const body = parseJson<{
      accessToken: string
      user: { email: string; emailVerified?: boolean }
      isNewUser: boolean
      redirectAfter?: string
    }>(callbackRes)
    expect(body.user.email).toBe('oauth.new@mentorme.test')
    expect(body.user.emailVerified).toBe(true)
    expect(body.isNewUser).toBe(true)
    expect(body.redirectAfter).toBe('/founder')
    expect(body.accessToken).toBeTruthy()
    expect(callbackRes.cookies.find((cookie) => cookie.name === 'mentor_me_refresh')?.value).toBeTruthy()

    const stored = await repository.findUserByEmail('oauth.new@mentorme.test')
    expect(stored?.role).toBe('founder')
    expect(stored?.emailVerified).toBe(true)
    expect(stored?.passwordHash).toBeUndefined()
    expect(email.sent.find((entry) => entry.type === 'welcome')).toMatchObject({
      email: 'oauth.new@mentorme.test',
    })
  })

  it('links a Google account to an existing email-based user without creating a duplicate', async () => {
    const googleOAuth = createStubGoogleOAuth({
      fetchProfile: async () => ({
        providerAccountId: 'google-acct-link-1',
        email: 'link.user@mentorme.test',
        emailVerified: true,
        name: 'Link User',
      }),
    })
    const { app, repository } = buildTestApp({ googleOAuth })

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Link User',
        email: 'link.user@mentorme.test',
        password: 'PreExisting-Pass-1',
      },
    })
    expect(registerRes.statusCode).toBe(201)
    const originalUser = await repository.findUserByEmail('link.user@mentorme.test')
    expect(originalUser).toBeTruthy()

    const authorizeRes = await app.inject({
      method: 'POST',
      url: '/auth/google/authorize-url',
      payload: {},
    })
    const state = parseJson<{ state: string }>(authorizeRes).state

    const callbackRes = await app.inject({
      method: 'POST',
      url: '/auth/google/callback',
      payload: { code: 'google-code-link-12345', state },
    })
    expect(callbackRes.statusCode).toBe(200)
    const body = parseJson<{ user: { email: string }; isNewUser: boolean }>(callbackRes)
    expect(body.user.email).toBe('link.user@mentorme.test')
    expect(body.isNewUser).toBe(false)

    const linkedAccount = await repository.findOAuthAccount('google', 'google-acct-link-1')
    expect(linkedAccount?.userId).toBe(originalUser?.id)
  })

  it('rejects Google OAuth when the email is not verified', async () => {
    const googleOAuth = createStubGoogleOAuth({
      fetchProfile: async () => ({
        providerAccountId: 'google-acct-unverified',
        email: 'unverified@mentorme.test',
        emailVerified: false,
        name: 'Unverified',
      }),
    })
    const { app } = buildTestApp({ googleOAuth })

    const authorizeRes = await app.inject({
      method: 'POST',
      url: '/auth/google/authorize-url',
      payload: {},
    })
    const state = parseJson<{ state: string }>(authorizeRes).state

    const callbackRes = await app.inject({
      method: 'POST',
      url: '/auth/google/callback',
      payload: { code: 'google-code-unverified-1', state },
    })

    expect(callbackRes.statusCode).toBe(400)
    expect(callbackRes.body).toContain('not verified')
  })

  it('rejects Google OAuth callbacks with an invalid or forged state', async () => {
    const googleOAuth = createStubGoogleOAuth()
    const { app } = buildTestApp({ googleOAuth })

    const callbackRes = await app.inject({
      method: 'POST',
      url: '/auth/google/callback',
      payload: { code: 'a-real-google-code-12345', state: 'not-a-signed-state-token' },
    })

    expect(callbackRes.statusCode).toBe(400)
  })

  it('reports the seeded founder as having venture access (no further wizard needed)', async () => {
    const { app } = buildTestApp()
    const token = await loginAs(app, 'aarav.sharma@mentorme.test')

    const statusRes = await app.inject({
      method: 'GET',
      url: '/me/onboarding',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(statusRes.statusCode).toBe(200)
    const body = parseJson<{
      onboarded: boolean
      role: string
      ventureCount: number
      nextStep: string
    }>(statusRes)
    expect(body.role).toBe('founder')
    expect(body.ventureCount).toBeGreaterThan(0)
    expect(body.nextStep).toBe('completed')
  })

  it('walks a fresh founder through the onboarding wizard and creates a venture', async () => {
    const { app, repository } = buildTestApp()

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Maya Greenfield',
        email: 'maya.greenfield@mentorme.test',
        password: 'GreenStart-9999',
        role: 'founder',
      },
    })
    expect(registerRes.statusCode).toBe(201)
    const accessToken = parseJson<{ accessToken: string }>(registerRes).accessToken

    const beforeRes = await app.inject({
      method: 'GET',
      url: '/me/onboarding',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(beforeRes.statusCode).toBe(200)
    const before = parseJson<{ onboarded: boolean; nextStep: string }>(beforeRes)
    expect(before.onboarded).toBe(false)
    expect(before.nextStep).toBe('founder_venture_details')

    const wizardRes = await app.inject({
      method: 'POST',
      url: '/onboarding/founder',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        ventureName: 'Greenfield Robotics',
        domain: 'Robotics',
        stage: 'TRL 4',
        trl: 4,
        brl: 3,
        location: 'Bengaluru, India',
        summary: 'Modular robotics platform for small-batch manufacturers in India.',
        nextMilestone: 'Demonstrate gripper accuracy at first paid pilot site.',
      },
    })

    expect(wizardRes.statusCode).toBe(201)
    const wizard = parseJson<{
      user: { id: string; onboardedAt: string; cohortId: string }
      venture: { id: string; name: string; cohortId: string }
    }>(wizardRes)
    expect(wizard.user.onboardedAt).toBeTruthy()
    expect(wizard.user.cohortId).toBeTruthy()
    expect(wizard.venture.name).toBe('Greenfield Robotics')

    const stored = await repository.findVentureById(wizard.venture.id)
    expect(stored?.name).toBe('Greenfield Robotics')

    const memberships = await repository.listMemberships()
    expect(memberships.some((m) => m.userId === wizard.user.id && m.ventureId === wizard.venture.id)).toBe(true)

    const afterRes = await app.inject({
      method: 'GET',
      url: '/me/onboarding',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    const after = parseJson<{ onboarded: boolean; nextStep: string; ventureCount: number }>(afterRes)
    expect(after.onboarded).toBe(true)
    expect(after.nextStep).toBe('completed')
    expect(after.ventureCount).toBe(1)
  })

  it('rejects founder onboarding when required fields are missing', async () => {
    const { app } = buildTestApp()
    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Patchy Founder',
        email: 'patchy.founder@mentorme.test',
        password: 'PatchPass-1234',
        role: 'founder',
      },
    })
    const token = parseJson<{ accessToken: string }>(registerRes).accessToken

    const wizardRes = await app.inject({
      method: 'POST',
      url: '/onboarding/founder',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        ventureName: 'Tiny',
        domain: 'X',
      },
    })

    expect([400, 422]).toContain(wizardRes.statusCode)
  })

  it('refuses founder onboarding for non-founder roles', async () => {
    const { app } = buildTestApp()
    const studentToken = await loginAs(app, 'ria.student@mentorme.test')

    const wizardRes = await app.inject({
      method: 'POST',
      url: '/onboarding/founder',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: {
        ventureName: 'Wrong Role Co',
        domain: 'NA',
        stage: 'TRL 1',
        trl: 1,
        brl: 1,
        summary: 'Should not be allowed because the user is a student, not a founder.',
        nextMilestone: 'N/A — request should be rejected.',
      },
    })

    expect(wizardRes.statusCode).toBe(400)
    expect(wizardRes.body).toContain('founder')
  })

  it('lists ventures a fresh student can join in their cohort', async () => {
    const { app } = buildTestApp((state) => {
      state.users.push({
        id: 'user-student-fresh',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        email: 'fresh.student@mentorme.test',
        name: 'Fresh Student',
        role: 'student',
      })
    })

    const token = await loginAs(app, 'fresh.student@mentorme.test')

    const optionsRes = await app.inject({
      method: 'GET',
      url: '/onboarding/student/options',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(optionsRes.statusCode).toBe(200)
    const body = parseJson<{ ventures: Array<{ id: string; name: string }> }>(optionsRes)
    expect(body.ventures.length).toBeGreaterThan(0)
    expect(body.ventures.some((v) => v.id === 'v-ecodrone')).toBe(true)
  })

  it('lets a fresh student join a venture and marks them onboarded', async () => {
    const { app, repository } = buildTestApp((state) => {
      state.users.push({
        id: 'user-student-join',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        email: 'join.student@mentorme.test',
        name: 'Join Student',
        role: 'student',
      })
    })

    const token = await loginAs(app, 'join.student@mentorme.test')

    const joinRes = await app.inject({
      method: 'POST',
      url: '/onboarding/student',
      headers: { authorization: `Bearer ${token}` },
      payload: { ventureId: 'v-medimesh' },
    })

    expect(joinRes.statusCode).toBe(200)
    const body = parseJson<{
      user: { id: string; onboardedAt: string }
      venture: { id: string }
    }>(joinRes)
    expect(body.user.onboardedAt).toBeTruthy()
    expect(body.venture.id).toBe('v-medimesh')

    const memberships = await repository.listMemberships()
    expect(memberships.some((m) => m.userId === 'user-student-join' && m.ventureId === 'v-medimesh')).toBe(true)
  })

  it('rejects student onboarding without a venture or invitation token', async () => {
    const { app } = buildTestApp((state) => {
      state.users.push({
        id: 'user-student-empty',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        email: 'empty.student@mentorme.test',
        name: 'Empty Student',
        role: 'student',
      })
    })
    const token = await loginAs(app, 'empty.student@mentorme.test')

    const joinRes = await app.inject({
      method: 'POST',
      url: '/onboarding/student',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })

    expect(joinRes.statusCode).toBe(400)
  })

  it('lets CFE create, list, preview, and revoke invitations end to end', async () => {
    const { app, email } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const createRes = await app.inject({
      method: 'POST',
      url: '/invitations',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        email: 'invitee.founder@mentorme.test',
        role: 'founder',
        message: 'Welcome to the cohort — we are excited to have you onboard.',
      },
    })

    expect(createRes.statusCode).toBe(201)
    const createBody = parseJson<{
      invitation: { id: string; email: string; role: string; status: string }
      debugToken: string
    }>(createRes)
    expect(createBody.invitation.email).toBe('invitee.founder@mentorme.test')
    expect(createBody.invitation.status).toBe('pending')
    expect(createBody.debugToken).toBeTruthy()

    const sentInvite = email.sent.find((entry) => entry.type === 'invitation')
    expect(sentInvite).toMatchObject({
      email: 'invitee.founder@mentorme.test',
      role: 'founder',
      organizationName: 'MentorMe',
    })

    const listRes = await app.inject({
      method: 'GET',
      url: '/invitations',
      headers: { authorization: `Bearer ${cfeToken}` },
    })
    expect(listRes.statusCode).toBe(200)
    const listBody = parseJson<{ invitations: Array<{ id: string }> }>(listRes)
    expect(listBody.invitations.some((i) => i.id === createBody.invitation.id)).toBe(true)

    const previewRes = await app.inject({
      method: 'GET',
      url: `/invitations/${createBody.debugToken}`,
    })
    expect(previewRes.statusCode).toBe(200)
    const previewBody = parseJson<{
      invitation: { email: string; role: string; organizationName: string; status: string }
    }>(previewRes)
    expect(previewBody.invitation.email).toBe('invitee.founder@mentorme.test')
    expect(previewBody.invitation.status).toBe('pending')

    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/invitations/${createBody.invitation.id}`,
      headers: { authorization: `Bearer ${cfeToken}` },
    })
    expect(revokeRes.statusCode).toBe(200)
    const revokeBody = parseJson<{ invitation: { status: string; revokedAt?: string } }>(revokeRes)
    expect(revokeBody.invitation.status).toBe('revoked')
    expect(revokeBody.invitation.revokedAt).toBeTruthy()

    const revokeAgainRes = await app.inject({
      method: 'DELETE',
      url: `/invitations/${createBody.invitation.id}`,
      headers: { authorization: `Bearer ${cfeToken}` },
    })
    expect(revokeAgainRes.statusCode).toBe(400)
  })

  it('forbids non-CFE users from creating or listing invitations', async () => {
    const { app } = buildTestApp()
    const founderToken = await loginAs(app, 'aarav.sharma@mentorme.test')

    const createRes = await app.inject({
      method: 'POST',
      url: '/invitations',
      headers: { authorization: `Bearer ${founderToken}` },
      payload: {
        email: 'should.not.invite@mentorme.test',
        role: 'student',
      },
    })
    expect(createRes.statusCode).toBe(400)
    expect(createRes.body).toContain('CFE')

    const listRes = await app.inject({
      method: 'GET',
      url: '/invitations',
      headers: { authorization: `Bearer ${founderToken}` },
    })
    expect(listRes.statusCode).toBe(400)
  })

  it('refuses to invite an email that already belongs to an existing user', async () => {
    const { app } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const createRes = await app.inject({
      method: 'POST',
      url: '/invitations',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        email: 'aarav.sharma@mentorme.test',
        role: 'founder',
      },
    })

    expect(createRes.statusCode).toBe(400)
    expect(createRes.body.toLowerCase()).toContain('exists')
  })

  it('refuses to issue a duplicate pending invitation for the same email', async () => {
    const { app } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const first = await app.inject({
      method: 'POST',
      url: '/invitations',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: { email: 'dup.invite@mentorme.test', role: 'founder' },
    })
    expect(first.statusCode).toBe(201)

    const second = await app.inject({
      method: 'POST',
      url: '/invitations',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: { email: 'dup.invite@mentorme.test', role: 'founder' },
    })

    expect(second.statusCode).toBe(400)
    expect(second.body.toLowerCase()).toContain('pending')
  })

  it('lets an invited user accept after registering with the same email and role', async () => {
    const { app, repository } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const inviteRes = await app.inject({
      method: 'POST',
      url: '/invitations',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        email: 'accept.test@mentorme.test',
        role: 'student',
        ventureId: 'v-medimesh',
      },
    })
    const invite = parseJson<{ invitation: { id: string }; debugToken: string }>(inviteRes)

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Accept Tester',
        email: 'accept.test@mentorme.test',
        password: 'AcceptPass-1234',
        role: 'student',
      },
    })
    const studentToken = parseJson<{ accessToken: string }>(registerRes).accessToken

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/invitations/${invite.debugToken}/accept`,
      headers: { authorization: `Bearer ${studentToken}` },
    })

    expect(acceptRes.statusCode).toBe(200)
    const acceptBody = parseJson<{
      user: { id: string; onboardedAt: string; cohortId: string }
      venture: { id: string }
    }>(acceptRes)
    expect(acceptBody.user.onboardedAt).toBeTruthy()
    expect(acceptBody.venture.id).toBe('v-medimesh')

    const memberships = await repository.listMemberships()
    expect(memberships.some((m) => m.userId === acceptBody.user.id && m.ventureId === 'v-medimesh')).toBe(true)

    const stored = await repository.findInvitationById(invite.invitation.id)
    expect(stored?.status).toBe('accepted')
    expect(stored?.acceptedById).toBe(acceptBody.user.id)
  })

  it('rejects accepting an invitation when the role does not match', async () => {
    const { app } = buildTestApp()
    const cfeToken = await loginAs(app, 'ritu.cfe@mentorme.test')

    const inviteRes = await app.inject({
      method: 'POST',
      url: '/invitations',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: { email: 'mismatch@mentorme.test', role: 'founder' },
    })
    const invite = parseJson<{ debugToken: string }>(inviteRes)

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Mismatch User',
        email: 'mismatch@mentorme.test',
        password: 'MismatchPass-9',
        role: 'student',
      },
    })
    const userToken = parseJson<{ accessToken: string }>(registerRes).accessToken

    const acceptRes = await app.inject({
      method: 'POST',
      url: `/invitations/${invite.debugToken}/accept`,
      headers: { authorization: `Bearer ${userToken}` },
    })

    expect(acceptRes.statusCode).toBe(400)
    expect(acceptRes.body.toLowerCase()).toContain('role')
  })

  it('returns 404 for invitation preview with an unknown token', async () => {
    const { app } = buildTestApp()

    const previewRes = await app.inject({
      method: 'GET',
      url: '/invitations/this-token-does-not-exist-but-is-long-enough-to-pass-validation',
    })

    expect(previewRes.statusCode).toBe(404)
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
