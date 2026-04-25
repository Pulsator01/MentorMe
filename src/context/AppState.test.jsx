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

  it('refreshes the access token and retries an authorized request after a 401', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ accepted: true, debugToken: 'debug-token-123456' }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'expired-token', user: { role: 'founder' } }))
      .mockResolvedValueOnce(textResponse('Unauthorized', 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token', user: { role: 'founder' } }))
      .mockResolvedValueOnce(jsonResponse({ requests: [] }))

    const client = createApiClient('http://localhost:3001')

    await client.loginForPath('/founders')
    const response = await client.getRequests()

    expect(response).toEqual({ requests: [] })
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/requests',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer expired-token',
        }),
      }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3001/auth/refresh',
      expect.objectContaining({
        method: 'POST',
      }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      5,
      'http://localhost:3001/requests',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
        }),
      }),
    )
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

  it('does not force a JSON content-type header for authorized POSTs without a body', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ accepted: true, debugToken: 'debug-token-123456' }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token', user: { role: 'cfe' } }))
      .mockResolvedValueOnce(jsonResponse({ mentorActionToken: 'token-123' }, 201))

    const client = createApiClient('http://localhost:3001')

    await client.loginForPath('/cfe')
    await client.createMentorOutreach('REQ-003')

    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/requests/REQ-003/mentor-outreach',
      expect.objectContaining({
        method: 'POST',
        headers: expect.not.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('sends authorized AI brief requests with a JSON body', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ accepted: true, debugToken: 'debug-token-123456' }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token', user: { role: 'founder' } }))
      .mockResolvedValueOnce(jsonResponse({ suggestion: { provider: 'heuristic', challenge: 'Sharper ask' } }))

    const client = createApiClient('http://localhost:3001')

    await client.loginForPath('/founders')
    const response = await client.generateRequestBrief({
      ventureName: 'EcoDrone Systems',
      rawNotes: 'Need help tightening fundraising framing and pilot sequencing before the next mentor call.',
    })

    expect(response).toEqual({ suggestion: { provider: 'heuristic', challenge: 'Sharper ask' } })
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/ai/request-brief',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('registers a new user with name, email, password, and role', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ accessToken: 'register-token', user: { id: 'u-1', email: 'priya@mentorme.test', role: 'founder' } }, 201),
    )

    const client = createApiClient('http://localhost:3001')
    const result = await client.register({
      name: 'Priya Founder',
      email: 'priya@mentorme.test',
      password: 'SuperSecret-123',
      role: 'founder',
    })

    expect(result.user).toMatchObject({ email: 'priya@mentorme.test', role: 'founder' })
    expect(client.hasSession()).toBe(true)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Priya Founder'),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('logs in with email and password and captures the access token', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ accessToken: 'login-token', user: { id: 'u-1', email: 'priya@mentorme.test', role: 'founder' } }),
    )

    const client = createApiClient('http://localhost:3001')
    await client.login({ email: 'priya@mentorme.test', password: 'SuperSecret-123' })

    expect(client.hasSession()).toBe(true)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'priya@mentorme.test', password: 'SuperSecret-123' }),
      }),
    )
  })

  it('requests a password reset email and returns the response body', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ accepted: true, debugToken: 'debug-reset-token' }, 202))

    const client = createApiClient('http://localhost:3001')
    const result = await client.forgotPassword('priya@mentorme.test')

    expect(result).toEqual({ accepted: true, debugToken: 'debug-reset-token' })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/auth/forgot-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'priya@mentorme.test' }),
      }),
    )
  })

  it('completes a password reset and captures the new session token', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ accessToken: 'reset-token', user: { id: 'u-1', email: 'priya@mentorme.test', role: 'founder' } }),
    )

    const client = createApiClient('http://localhost:3001')
    await client.resetPassword({ token: 'reset-debug-token-123456', password: 'BrandNew-456' })

    expect(client.hasSession()).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'reset-debug-token-123456', password: 'BrandNew-456' }),
      }),
    )
  })

  it('changes the password using the current bearer token and rotates the access token', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ accepted: true, debugToken: 'debug-token-123456' }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'old-token', user: { role: 'founder' } }))
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: 'rotated-token', user: { id: 'u-1', email: 'priya@mentorme.test', role: 'founder' } }),
      )

    const client = createApiClient('http://localhost:3001')
    await client.loginForPath('/founders')
    await client.changePassword({ currentPassword: 'OldPass-12345', newPassword: 'BrandNew-456' })

    expect(client.hasSession()).toBe(true)
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/auth/change-password',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer old-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ currentPassword: 'OldPass-12345', newPassword: 'BrandNew-456' }),
      }),
    )
  })

  it('builds a Google authorize URL and forwards the redirectAfter hint', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ authorizeUrl: 'https://accounts.google.com/...', state: 'signed-state' }))

    const client = createApiClient('http://localhost:3001')
    const result = await client.getGoogleAuthorizeUrl('/cfe')

    expect(result).toEqual({ authorizeUrl: 'https://accounts.google.com/...', state: 'signed-state' })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/auth/google/authorize-url',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ redirectAfter: '/cfe' }),
      }),
    )
  })

  it('completes the Google OAuth callback and captures the session token', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        accessToken: 'google-token',
        user: { id: 'u-1', email: 'priya@mentorme.test', role: 'founder' },
        isNewUser: true,
        redirectAfter: '/founders',
      }),
    )

    const client = createApiClient('http://localhost:3001')
    const result = await client.completeGoogleOAuth({ code: 'goog-code-1234567890', state: 'signed-state-abc' })

    expect(result).toMatchObject({ isNewUser: true, redirectAfter: '/founders' })
    expect(client.hasSession()).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3001/auth/google/callback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'goog-code-1234567890', state: 'signed-state-abc' }),
      }),
    )
  })

  it('bootstrap returns the refreshed session when the cookie is valid', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'refresh-token' }))
      .mockResolvedValueOnce(jsonResponse({ user: { id: 'u-1', email: 'priya@mentorme.test', role: 'founder' } }))

    const client = createApiClient('http://localhost:3001')
    const session = await client.bootstrap()

    expect(session?.user).toMatchObject({ email: 'priya@mentorme.test' })
    expect(client.hasSession()).toBe(true)
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/me',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer refresh-token' }) }),
    )
  })

  it('bootstrap returns null when no refresh cookie is available', async () => {
    fetch.mockResolvedValueOnce(textResponse('Unauthorized', 401))

    const client = createApiClient('http://localhost:3001')
    const session = await client.bootstrap()

    expect(session).toBeNull()
    expect(client.hasSession()).toBe(false)
  })

  it('logout posts to /auth/logout and clears the cached access token', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ accepted: true, debugToken: 'debug-token-123456' }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'session-token', user: { role: 'founder' } }))
      .mockResolvedValueOnce({ ok: true, status: 204, json: vi.fn(), text: vi.fn().mockResolvedValue('') })

    const client = createApiClient('http://localhost:3001')
    await client.loginForPath('/founders')
    expect(client.hasSession()).toBe(true)

    await client.logout()

    expect(client.hasSession()).toBe(false)
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends authorized AI mentor recommendation requests with a JSON body', async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse({ accepted: true, debugToken: 'debug-token-123456' }))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'fresh-token', user: { role: 'founder' } }))
      .mockResolvedValueOnce(
        jsonResponse({
          recommendations: {
            provider: 'heuristic',
            shortlist: [{ mentorId: 'm-radhika', score: 94 }],
          },
        }),
      )

    const client = createApiClient('http://localhost:3001')

    await client.loginForPath('/founders')
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
      3,
      'http://localhost:3001/ai/mentor-recommendations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
          'Content-Type': 'application/json',
        }),
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
