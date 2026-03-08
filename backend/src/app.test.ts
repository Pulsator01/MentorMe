// @vitest-environment node

import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createSeededInMemoryPlatformRepository } from './infra/inMemoryRepository'
import { createStubEmailGateway } from './infra/stubEmailGateway'
import { createStubStorageService } from './infra/stubStorageService'
import { createInlineQueuePublisher } from './infra/inlineQueuePublisher'

const buildTestApp = (configureRepository) => {
  const repository = createSeededInMemoryPlatformRepository(configureRepository)
  const email = createStubEmailGateway()
  const storage = createStubStorageService()
  const queue = createInlineQueuePublisher()

  const app = createApp({
    repository,
    email,
    storage,
    queue,
    exposeTokens: true,
    jwtIssuer: 'mentor-me-test',
    jwtAudience: 'mentor-me-web',
    jwtSecret: 'test-secret',
    cookieSecret: 'cookie-secret',
  })

  return { app, repository, email, storage, queue }
}

describe('MentorMe backend workflow', () => {
  beforeEach(async () => {
    // no-op placeholder to keep future global setup symmetric
  })

  it('issues a magic link, verifies it, and returns the authenticated user context', async () => {
    const { app } = buildTestApp()

    const requestRes = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/request',
      payload: { email: 'aarav.sharma@mentorme.test' },
    })

    expect(requestRes.statusCode).toBe(202)
    const requestBody = requestRes.json()
    expect(requestBody.debugToken).toBeTruthy()

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/auth/magic-link/verify',
      payload: { token: requestBody.debugToken },
    })

    expect(verifyRes.statusCode).toBe(200)
    const verifyBody = verifyRes.json()
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
    expect(meRes.json().user.email).toBe('aarav.sharma@mentorme.test')
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
    expect(venturesRes.json().ventures).toHaveLength(1)
    expect(venturesRes.json().ventures[0].name).toBe('EcoDrone Systems')

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
    expect(createRes.json().request.status).toBe('cfe_review')

    const requestsRes = await app.inject({
      method: 'GET',
      url: '/ventures/v-ecodrone/requests',
      headers: { authorization: `Bearer ${founderToken}` },
    })

    expect(requestsRes.statusCode).toBe(200)
    expect(requestsRes.json().requests[0].challenge).toBe('Need help sharpening fundraising narrative.')
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
    expect(requestsRes.json().requests.map((request) => request.id)).not.toContain('REQ-900')
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
    expect(returnRes.json().request.status).toBe('needs_work')

    const approveRes = await app.inject({
      method: 'POST',
      url: '/requests/REQ-002/approve',
      headers: { authorization: `Bearer ${cfeToken}` },
      payload: {
        ownerName: 'Ritu from CFE',
      },
    })

    expect(approveRes.statusCode).toBe(200)
    expect(approveRes.json().request.status).toBe('awaiting_mentor')

    const events = repository.listAuditEventsForEntity('mentor_request', 'REQ-002')
    expect(events.map((event) => event.action)).toContain('request.returned')
    expect(events.map((event) => event.action)).toContain('request.approved')
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
    const presignBody = presignRes.json()
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
    expect(completeRes.json().artifact.status).toBe('uploaded')
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
    expect(createRes.json().request.artifactList).toEqual(['pitch-deck-v6.pdf', 'technical-spec-v2.md'])

    const requestsRes = await app.inject({
      method: 'GET',
      url: '/requests',
      headers: { authorization: `Bearer ${founderToken}` },
    })

    const createdRequest = requestsRes.json().requests.find((request) => request.id === createRes.json().request.id)
    expect(createdRequest.artifactList).toEqual(['pitch-deck-v6.pdf', 'technical-spec-v2.md'])
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
    const token = outreachRes.json().mentorActionToken

    const scheduleRes = await app.inject({
      method: 'POST',
      url: `/mentor-actions/${token}/schedule`,
      payload: {
        calendlyLink: 'https://calendly.com/naval-shah/mentor-hour',
        meetingAt: '2026-03-15T09:00:00.000Z',
      },
    })

    expect(scheduleRes.statusCode).toBe(200)
    expect(scheduleRes.json().request.status).toBe('scheduled')

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
    expect(feedbackRes.json().request.status).toBe('follow_up')
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
    expect(secondRes.json().duplicate).toBe(true)
    expect(repository.listMeetingsForRequest('REQ-003')[0].joinLink).toBe(
      'https://api.calendly.com/scheduled_events/evt_123',
    )
    expect(repository.findRequestById('REQ-003')?.calendlyLink).toBe('https://api.calendly.com/scheduled_events/evt_123')
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
    payload: { token: requestRes.json().debugToken },
  })

  return verifyRes.json().accessToken as string
}
