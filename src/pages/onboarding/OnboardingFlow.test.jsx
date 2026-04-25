import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../../App'

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
})

const emptyStreamResponse = () => ({
  ok: true,
  status: 200,
  body: {
    getReader: () => {
      const blockedRead = new Promise(() => {})
      return {
        read: () => blockedRead,
        releaseLock: () => {},
      }
    },
  },
  json: vi.fn().mockResolvedValue({}),
  text: vi.fn().mockResolvedValue(''),
})

const flushPending = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50))
}

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

const getCallUrls = () => fetch.mock.calls.map((args) => args[0])

describe('Onboarding flow (API mode)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001')
    vi.stubGlobal('fetch', vi.fn())
    window.history.pushState({}, 'Reset', '/')
  })

  afterEach(async () => {
    cleanup()
    await flushPending()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('redirects an authenticated founder without a venture to the founder onboarding wizard', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'session-token' })
      }
      if (url.endsWith('/me')) {
        return jsonResponse({
          user: {
            id: 'u-new-founder',
            email: 'new.founder@mentorme.test',
            name: 'New Founder',
            role: 'founder',
            organizationId: 'org-mentorme',
          },
        })
      }
      if (url.endsWith('/me/onboarding')) {
        return jsonResponse({
          onboarded: false,
          nextStep: 'founder_venture_details',
          ventureCount: 0,
          role: 'founder',
          organizationId: 'org-mentorme',
        })
      }
      if (url.endsWith('/notifications/stream')) {
        return emptyStreamResponse()
      }
      return jsonResponse({ ventures: [], requests: [], mentors: [], items: [], count: 0 })
    })

    renderAtRoute('/founders')

    expect(
      await screen.findByRole('heading', { name: /tell us about your venture/i }),
    ).toBeInTheDocument()

    const calls = getCallUrls()
    expect(calls.some((url) => url.endsWith('/auth/refresh'))).toBe(true)
    expect(calls.some((url) => url.endsWith('/me/onboarding'))).toBe(true)
    expect(window.location.pathname).toBe('/onboarding/founder')
  })

  it('lets a founder complete the wizard and redirects them to the founders workspace', async () => {
    let onboardedAt = null

    fetch.mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'session-token' })
      }
      if (url.endsWith('/me')) {
        return jsonResponse({
          user: {
            id: 'u-new-founder',
            email: 'new.founder@mentorme.test',
            name: 'New Founder',
            role: 'founder',
            organizationId: 'org-mentorme',
            onboardedAt: onboardedAt || undefined,
          },
        })
      }
      if (url.endsWith('/me/onboarding')) {
        return jsonResponse({
          onboarded: Boolean(onboardedAt),
          nextStep: onboardedAt ? 'completed' : 'founder_venture_details',
          ventureCount: onboardedAt ? 1 : 0,
          role: 'founder',
          organizationId: 'org-mentorme',
        })
      }
      if (url.endsWith('/onboarding/founder') && init?.method === 'POST') {
        onboardedAt = '2026-04-26T05:00:00.000Z'
        return jsonResponse({
          user: {
            id: 'u-new-founder',
            email: 'new.founder@mentorme.test',
            name: 'New Founder',
            role: 'founder',
            organizationId: 'org-mentorme',
            cohortId: 'cohort-2026',
            onboardedAt,
          },
          venture: { id: 'vnt-new', name: 'Greenfield Robotics', cohortId: 'cohort-2026' },
        }, 201)
      }
      const ventureRecord = {
        id: 'vnt-new',
        name: 'Greenfield Robotics',
        founderName: 'New Founder',
        domain: 'Robotics',
        stage: 'TRL 4',
        trl: 4,
        brl: 3,
        location: 'Bengaluru, India',
        summary: 'Modular robotics platform.',
        nextMilestone: 'Sign first paid pilot.',
        programNote: '',
        cohortId: 'cohort-2026',
        organizationId: 'org-mentorme',
      }
      if (url.endsWith('/ventures')) {
        return jsonResponse({ ventures: [ventureRecord] })
      }
      if (url.includes('/ventures/vnt-new/requests')) {
        return jsonResponse({ requests: [] })
      }
      if (url.endsWith('/ventures/vnt-new')) {
        return jsonResponse({ venture: ventureRecord })
      }
      if (url.endsWith('/notifications/stream')) {
        return emptyStreamResponse()
      }
      if (url.endsWith('/requests') || url.endsWith('/mentors') || url.endsWith('/notifications/unread-count')) {
        return jsonResponse({ requests: [], mentors: [], items: [], count: 0 })
      }
      return jsonResponse({})
    })

    renderAtRoute('/onboarding/founder')

    expect(
      await screen.findByRole('heading', { name: /tell us about your venture/i }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/venture name/i), {
      target: { value: 'Greenfield Robotics' },
    })
    fireEvent.change(screen.getByLabelText(/primary domain/i), {
      target: { value: 'Robotics' },
    })

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    fireEvent.change(await screen.findByLabelText(/where are you based/i), {
      target: { value: 'Bengaluru, India' },
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    fireEvent.change(await screen.findByLabelText(/one-paragraph summary/i), {
      target: {
        value: 'Modular robotics platform for small-batch manufacturers across India and SEA.',
      },
    })
    fireEvent.change(screen.getByLabelText(/next milestone/i), {
      target: { value: 'Sign first paid pilot at a Bengaluru manufacturer by end of quarter.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /complete onboarding/i }))

    await waitFor(() => {
      const submitCalls = fetch.mock.calls.filter(
        (call) => call[0].endsWith('/onboarding/founder') && call[1]?.method === 'POST',
      )
      expect(submitCalls).toHaveLength(1)
    })

    await waitFor(() => {
      expect(window.location.pathname).toBe('/founders')
    })
  })
})
