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
