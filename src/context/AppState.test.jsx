import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMentorUpdatePayload, createApiClient } from './AppState'

describe('AppState API helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('only sends calendlyUrl when the UI actually provides a calendly value', () => {
    expect(buildMentorUpdatePayload({ visibility: 'Paused', monthlyLimit: 3 })).toEqual({
      visibility: 'Paused',
      monthlyLimit: 3,
    })
    expect(buildMentorUpdatePayload({ visibility: 'Active', calendly: undefined })).toEqual({
      visibility: 'Active',
    })
    expect(buildMentorUpdatePayload({ responseWindow: '48 hours', calendly: 'https://calendly.com/naval' })).toEqual({
      responseWindow: '48 hours',
      calendlyUrl: 'https://calendly.com/naval',
    })
  })

  it('bootstrap returns the user when the session cookie is valid', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ user: { id: 'u-1', email: 'priya@mentorme.test', role: 'founder' } }),
    )

    const client = createApiClient('http://localhost:3001')
    const session = await client.bootstrap()

    expect(session?.user).toMatchObject({ email: 'priya@mentorme.test' })
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/me',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('bootstrap returns null when the session is invalid', async () => {
    fetch.mockResolvedValueOnce(textResponse('Unauthorized', 401))

    const client = createApiClient('http://localhost:3001')
    const session = await client.bootstrap()

    expect(session).toBeNull()
  })

  it('sends authenticated requests with credentials: include', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ requests: [] }))

    const client = createApiClient('http://localhost:3001')
    await client.getRequests()

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/requests',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('does not force a JSON content-type header for POSTs without a body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ mentorActionToken: 'token-123' }, 201))

    const client = createApiClient('http://localhost:3001')
    await client.createMentorOutreach('REQ-003')

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/requests/REQ-003/mentor-outreach',
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('sends authenticated AI brief requests with a JSON body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ suggestion: { provider: 'heuristic', challenge: 'Sharper ask' } }))

    const client = createApiClient('http://localhost:3001')
    const response = await client.generateRequestBrief({
      ventureName: 'EcoDrone Systems',
      rawNotes: 'Need help tightening fundraising framing and pilot sequencing before the next mentor call.',
    })

    expect(response).toEqual({ suggestion: { provider: 'heuristic', challenge: 'Sharper ask' } })
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/ai/request-brief',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        credentials: 'include',
      }),
    )
  })

  it('reads the onboarding status using the cookie session', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({
      onboarded: false,
      nextStep: 'founder_venture_details',
      ventureCount: 0,
      role: 'founder',
      organizationId: 'org-mentorme',
    }))

    const client = createApiClient('http://localhost:3001')
    const status = await client.getOnboardingStatus()

    expect(status.nextStep).toBe('founder_venture_details')
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/me/onboarding',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('completes the founder onboarding wizard with venture payload', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({
      user: { id: 'u-1', onboardedAt: '2026-04-26T05:00:00.000Z', role: 'founder' },
      venture: { id: 'vnt-abc', name: 'Greenfield Robotics' },
    }, 201))

    const client = createApiClient('http://localhost:3001')

    const payload = {
      ventureName: 'Greenfield Robotics',
      domain: 'Robotics',
      stage: 'TRL 4',
      trl: 4,
      brl: 3,
      summary: 'Modular robotics platform for small-batch manufacturers in India.',
      nextMilestone: 'Demonstrate gripper accuracy at first paid pilot site.',
    }
    const result = await client.completeFounderOnboarding(payload)

    expect(result.venture.name).toBe('Greenfield Robotics')
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/onboarding/founder',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      }),
    )
  })

  it('completes the student onboarding wizard with a ventureId payload', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({
      user: { id: 'u-2', onboardedAt: '2026-04-26T05:00:00.000Z', role: 'student' },
      venture: { id: 'v-medimesh', name: 'MediMesh Labs' },
    }))

    const client = createApiClient('http://localhost:3001')
    const result = await client.completeStudentOnboarding({ ventureId: 'v-medimesh' })

    expect(result.venture.id).toBe('v-medimesh')
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/onboarding/student',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ventureId: 'v-medimesh' }),
        credentials: 'include',
      }),
    )
  })

  it('lists ventures available to a student through the join-options endpoint', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ ventures: [{ id: 'v-medimesh', name: 'MediMesh Labs' }] }))

    const client = createApiClient('http://localhost:3001')
    const result = await client.getStudentJoinOptions()

    expect(result.ventures).toHaveLength(1)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/onboarding/student/options',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('previews an invitation by raw token without a session', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({
      invitation: {
        email: 'invitee@mentorme.test',
        role: 'student',
        organizationName: 'MentorMe',
        status: 'pending',
        expiresAt: '2026-05-26T00:00:00.000Z',
      },
    }))

    const client = createApiClient('http://localhost:3001')
    const preview = await client.previewInvitation('invitation-token-abc-123')

    expect(preview.invitation.role).toBe('student')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/invitations/invitation-token-abc-123',
      expect.objectContaining({}),
    )
  })

  it('creates an invitation via the authenticated CFE endpoint', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({
      invitation: { id: 'inv-1', email: 'new@mentorme.test', role: 'founder', status: 'pending' },
      debugToken: 'debug-invite-token-12345',
    }, 201))

    const client = createApiClient('http://localhost:3001')
    const result = await client.createInvitation({
      email: 'new@mentorme.test',
      role: 'founder',
      message: 'Welcome to the cohort!',
    })

    expect(result.invitation.id).toBe('inv-1')
    expect(result.debugToken).toBe('debug-invite-token-12345')
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/invitations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      }),
    )
  })

  it('sends authenticated AI mentor recommendation requests with a JSON body', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        recommendations: {
          provider: 'heuristic',
          shortlist: [{ mentorId: 'm-radhika', score: 94 }],
        },
      }),
    )

    const client = createApiClient('http://localhost:3001')

    const response = await client.generateMentorRecommendations({
      ventureName: 'EcoDrone Systems',
      domain: 'Industrial drones',
      stage: 'MVP',
      challenge: 'Need help tightening fundraising framing and sequencing pilot conversations.',
    })

    expect(response).toEqual({
      recommendations: {
        provider: 'heuristic',
        shortlist: [{ mentorId: 'm-radhika', score: 94 }],
      },
    })
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/ai/mentor-recommendations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      }),
    )
  })
})

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
})

const textResponse = (body, status) => ({
  ok: false,
  status,
  json: vi.fn().mockResolvedValue({ message: body }),
  text: vi.fn().mockResolvedValue(body),
})
