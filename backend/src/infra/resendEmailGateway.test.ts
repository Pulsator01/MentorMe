// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResendEmailGateway, createResendEmailGateway } from './resendEmailGateway'

type FetchCall = {
  url: string
  init: RequestInit
  body: Record<string, unknown>
}

const buildFetchMock = (
  responses: Array<{ ok?: boolean; status?: number; statusText?: string; json?: unknown }> = [{ ok: true, status: 200 }],
) => {
  const calls: FetchCall[] = []
  let cursor = 0

  const fetchImpl = vi.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    const stringUrl = typeof url === 'string' ? url : url.toString()
    const body = init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {}
    calls.push({ url: stringUrl, init, body })

    const response = responses[cursor] || responses[responses.length - 1]
    cursor += 1

    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      statusText: response.statusText ?? '',
      json: async () => response.json,
    } as unknown as Response
  })

  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls }
}

const buildGateway = (overrides: Parameters<typeof createResendEmailGateway>[0] | object = {}) => {
  const { fetchImpl, calls } = buildFetchMock()

  const gateway = createResendEmailGateway({
    apiKey: 'rk_test_123',
    appBaseUrl: 'https://app.mentorme.test',
    from: 'MentorMe <hello@mentorme.test>',
    fetchImpl,
    replyTo: 'support@mentorme.test',
    ...overrides,
  })

  return { gateway, fetchImpl, calls }
}

describe('ResendEmailGateway', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('throws if apiKey is missing', () => {
    expect(() =>
      createResendEmailGateway({
        apiKey: '',
        appBaseUrl: 'https://app.mentorme.test',
        from: 'MentorMe <hello@mentorme.test>',
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).toThrow(/apiKey/)
  })

  it('throws if from address is missing', () => {
    expect(() =>
      createResendEmailGateway({
        apiKey: 'rk_test_123',
        appBaseUrl: 'https://app.mentorme.test',
        from: '',
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).toThrow(/from/)
  })

  it('throws if appBaseUrl is missing', () => {
    expect(() =>
      createResendEmailGateway({
        apiKey: 'rk_test_123',
        appBaseUrl: '',
        from: 'MentorMe <hello@mentorme.test>',
        fetchImpl: vi.fn() as unknown as typeof fetch,
      }),
    ).toThrow(/appBaseUrl/)
  })

  it('sends magic link email with bearer auth, JSON body, and verify link', async () => {
    const { gateway, calls } = buildGateway()

    await gateway.sendMagicLink({ email: 'founder@mentorme.test', token: 'tok-123', name: 'Ada' })

    expect(calls).toHaveLength(1)
    const call = calls[0]
    expect(call.url).toBe('https://api.resend.com/emails')

    const headers = call.init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer rk_test_123')
    expect(headers['Content-Type']).toBe('application/json')

    expect(call.body.from).toBe('MentorMe <hello@mentorme.test>')
    expect(call.body.to).toEqual(['founder@mentorme.test'])
    expect(call.body.reply_to).toBe('support@mentorme.test')
    expect(call.body.subject).toBe('Sign in to MentorMe')
    expect(String(call.body.text)).toContain('https://app.mentorme.test/auth/verify?token=tok-123')
    expect(String(call.body.html)).toContain('https://app.mentorme.test/auth/verify?token=tok-123')
    expect(String(call.body.text)).toContain('Ada')
  })

  it('sends mentor outreach email with the mentor desk link', async () => {
    const { gateway, calls } = buildGateway()

    await gateway.sendMentorOutreach({
      email: 'mentor@firm.test',
      mentorName: 'Grace Hopper',
      requestId: 'req-123',
      token: 'mentor-token-xyz',
    })

    const body = calls[0].body
    expect(body.subject).toBe('New mentor request awaiting your response')
    expect(String(body.text)).toContain('https://app.mentorme.test/mentors/desk?token=mentor-token-xyz')
    expect(String(body.text)).toContain('req-123')
    expect(String(body.html)).toContain('Grace Hopper')
  })

  it('sends password reset email with the reset-password link', async () => {
    const { gateway, calls } = buildGateway()

    await gateway.sendPasswordReset({ email: 'founder@mentorme.test', name: 'Ada', token: 'reset-tok' })

    const body = calls[0].body
    expect(body.subject).toBe('Reset your MentorMe password')
    expect(String(body.text)).toContain('https://app.mentorme.test/reset-password?token=reset-tok')
  })

  it('sends welcome email with the workspace home link', async () => {
    const { gateway, calls } = buildGateway()

    await gateway.sendWelcome({ email: 'founder@mentorme.test', name: 'Ada' })

    const body = calls[0].body
    expect(body.subject).toBe('Welcome to MentorMe')
    expect(String(body.html)).toContain('Open MentorMe')
    expect(String(body.html)).toContain('https://app.mentorme.test/')
  })

  it('sends invitation email with the public invite link, role, and optional message', async () => {
    const { gateway, calls } = buildGateway()

    await gateway.sendInvitation({
      email: 'newcomer@plaksha.test',
      inviterName: 'Priya CFE',
      organizationName: 'Plaksha CFE',
      role: 'founder',
      token: 'invite-tok-789',
      message: 'Excited to have you in cohort 4!',
    })

    const body = calls[0].body
    expect(body.subject).toBe('Priya CFE invited you to join Plaksha CFE on MentorMe')
    expect(String(body.text)).toContain('https://app.mentorme.test/invite/invite-tok-789')
    expect(String(body.text)).toContain('Excited to have you in cohort 4!')
    expect(String(body.text)).toContain('Founder')
    expect(String(body.html)).toContain('Plaksha CFE')
  })

  it('omits the reply_to header when not configured', async () => {
    const { fetchImpl, calls } = buildFetchMock()
    const gateway = new ResendEmailGateway({
      apiKey: 'rk_test_123',
      appBaseUrl: 'https://app.mentorme.test',
      from: 'MentorMe <hello@mentorme.test>',
      fetchImpl,
    })

    await gateway.sendWelcome({ email: 'founder@mentorme.test', name: 'Ada' })

    expect(calls[0].body.reply_to).toBeUndefined()
  })

  it('throws a descriptive error when the Resend API returns a 4xx', async () => {
    const { fetchImpl } = buildFetchMock([
      { ok: false, status: 422, statusText: 'Unprocessable Entity', json: { message: 'Invalid `to` field' } },
    ])

    const gateway = new ResendEmailGateway({
      apiKey: 'rk_test_123',
      appBaseUrl: 'https://app.mentorme.test',
      from: 'MentorMe <hello@mentorme.test>',
      fetchImpl,
    })

    await expect(gateway.sendWelcome({ email: 'invalid', name: 'Ada' })).rejects.toThrow(
      /Resend send failed: Invalid `to` field/,
    )
  })

  it('falls back to status text when the error body is unreadable', async () => {
    const fetchImpl = vi.fn(async () => {
      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('not json')
        },
      } as unknown as Response
    }) as unknown as typeof fetch

    const gateway = new ResendEmailGateway({
      apiKey: 'rk_test_123',
      appBaseUrl: 'https://app.mentorme.test',
      from: 'MentorMe <hello@mentorme.test>',
      fetchImpl,
    })

    await expect(gateway.sendWelcome({ email: 'a@b.test', name: 'Ada' })).rejects.toThrow(
      /Resend send failed: Internal Server Error/,
    )
  })

  it('escapes HTML so user-supplied content cannot inject markup', async () => {
    const { gateway, calls } = buildGateway()

    await gateway.sendInvitation({
      email: 'newcomer@plaksha.test',
      inviterName: '<script>alert(1)</script>',
      organizationName: 'Plaksha & CFE',
      role: 'founder',
      token: 'tok',
      message: '<img src=x onerror=alert(1)>',
    })

    const html = String(calls[0].body.html)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('Plaksha &amp; CFE')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('strips trailing slashes on the base URL', async () => {
    const { fetchImpl, calls } = buildFetchMock()
    const gateway = new ResendEmailGateway({
      apiKey: 'rk_test_123',
      appBaseUrl: 'https://app.mentorme.test/',
      baseUrl: 'https://api.resend.com/',
      from: 'MentorMe <hello@mentorme.test>',
      fetchImpl,
    })

    await gateway.sendWelcome({ email: 'a@b.test', name: 'Ada' })

    expect(calls[0].url).toBe('https://api.resend.com/emails')
    expect(String(calls[0].body.text)).toContain('https://app.mentorme.test/')
  })

  it('aborts after the configured timeout', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init: RequestInit = {}) => {
      return new Promise((_resolve, reject) => {
        const signal = init.signal as AbortSignal
        signal.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    }) as unknown as typeof fetch

    const gateway = new ResendEmailGateway({
      apiKey: 'rk_test_123',
      appBaseUrl: 'https://app.mentorme.test',
      from: 'MentorMe <hello@mentorme.test>',
      fetchImpl,
      timeoutMs: 50,
    })

    const pending = gateway.sendWelcome({ email: 'a@b.test', name: 'Ada' })
    const captured = pending.catch((error: unknown) => error)

    await vi.advanceTimersByTimeAsync(60)
    const result = await captured

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toMatch(/Resend send timed out after 50ms/)
    vi.useRealTimers()
  })
})
