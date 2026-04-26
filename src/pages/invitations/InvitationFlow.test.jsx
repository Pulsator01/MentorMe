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
    getReader: () => ({
      read: () => new Promise(() => {}),
      releaseLock: () => {},
    }),
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

describe('Invitation accept flow (API mode)', () => {
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

  it('shows the invitation preview to an unauthenticated visitor and offers sign-in', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({}, 401)
      }
      if (url.includes('/invitations/INVITE-TOKEN-123')) {
        return jsonResponse({
          invitation: {
            email: 'invitee@mentorme.test',
            role: 'student',
            organizationName: 'MentorMe',
            ventureName: 'Greenfield Robotics',
            message: 'Join us for the spring cohort.',
            status: 'pending',
            expiresAt: '2026-12-31T23:59:00.000Z',
          },
        })
      }
      if (url.endsWith('/notifications/stream')) {
        return emptyStreamResponse()
      }
      return jsonResponse({})
    })

    renderAtRoute('/invite/INVITE-TOKEN-123')

    expect(
      await screen.findByRole('heading', { name: /you were invited to mentorme/i }),
    ).toBeInTheDocument()
    expect(
      await screen.findAllByText('invitee@mentorme.test'),
    ).not.toHaveLength(0)
    expect(screen.getByText(/Greenfield Robotics/i)).toBeInTheDocument()
    expect(screen.getByText(/Join us for the spring cohort/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in to accept/i })).toBeInTheDocument()
  })

  it('lets a signed-in invitee accept and routes them to the workspace home', async () => {
    let accepted = false

    fetch.mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'session-token' })
      }
      if (url.endsWith('/me')) {
        return jsonResponse({
          user: {
            id: 'u-invitee',
            email: 'invitee@mentorme.test',
            name: 'Invited Student',
            role: 'student',
            organizationId: 'org-mentorme',
            cohortId: accepted ? 'cohort-2026' : null,
            onboardedAt: accepted ? '2026-04-26T05:00:00.000Z' : null,
          },
        })
      }
      if (url.endsWith('/me/onboarding')) {
        return jsonResponse({
          onboarded: accepted,
          nextStep: accepted ? 'completed' : 'student_join_venture',
          ventureCount: accepted ? 1 : 0,
          role: 'student',
          organizationId: 'org-mentorme',
        })
      }
      if (url.endsWith('/invitations/INVITE-TOKEN-123/accept') && init?.method === 'POST') {
        accepted = true
        return jsonResponse({
          user: {
            id: 'u-invitee',
            email: 'invitee@mentorme.test',
            name: 'Invited Student',
            role: 'student',
            organizationId: 'org-mentorme',
            cohortId: 'cohort-2026',
            onboardedAt: '2026-04-26T05:00:00.000Z',
          },
          venture: { id: 'vnt-new', name: 'Greenfield Robotics', cohortId: 'cohort-2026' },
          invitation: { id: 'inv-1', status: 'accepted' },
        })
      }
      if (url.includes('/invitations/INVITE-TOKEN-123')) {
        return jsonResponse({
          invitation: {
            email: 'invitee@mentorme.test',
            role: 'student',
            organizationName: 'MentorMe',
            ventureName: 'Greenfield Robotics',
            message: null,
            status: 'pending',
            expiresAt: '2026-12-31T23:59:00.000Z',
          },
        })
      }
      if (url.endsWith('/notifications/stream')) {
        return emptyStreamResponse()
      }
      return jsonResponse({ ventures: [], requests: [], mentors: [], items: [], count: 0 })
    })

    renderAtRoute('/invite/INVITE-TOKEN-123')

    const acceptButton = await screen.findByRole('button', {
      name: /accept invitation and continue/i,
    })

    fireEvent.click(acceptButton)

    await waitFor(() => {
      const acceptCalls = fetch.mock.calls.filter(
        (call) =>
          call[0].endsWith('/invitations/INVITE-TOKEN-123/accept') && call[1]?.method === 'POST',
      )
      expect(acceptCalls).toHaveLength(1)
    })

    await waitFor(() => {
      expect(['/', '/founders']).toContain(window.location.pathname)
    })
  })

  it('warns when the signed-in user email does not match the invitation', async () => {
    fetch.mockImplementation(async (url) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'session-token' })
      }
      if (url.endsWith('/me')) {
        return jsonResponse({
          user: {
            id: 'u-other',
            email: 'someone.else@mentorme.test',
            name: 'Other User',
            role: 'student',
            organizationId: 'org-mentorme',
          },
        })
      }
      if (url.includes('/invitations/INVITE-TOKEN-123')) {
        return jsonResponse({
          invitation: {
            email: 'invitee@mentorme.test',
            role: 'student',
            organizationName: 'MentorMe',
            status: 'pending',
            expiresAt: '2026-12-31T23:59:00.000Z',
          },
        })
      }
      if (url.endsWith('/notifications/stream')) {
        return emptyStreamResponse()
      }
      return jsonResponse({})
    })

    renderAtRoute('/invite/INVITE-TOKEN-123')

    const button = await screen.findByRole('button', {
      name: /accept invitation and continue/i,
    })

    expect(button).toBeDisabled()
    expect(
      screen.getByText(
        /You’re signed in as someone\.else@mentorme\.test, but this invitation is for invitee@mentorme\.test/i,
      ),
    ).toBeInTheDocument()
  })
})

describe('CFE invitations panel (API mode)', () => {
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

  it('lets a CFE user issue an invitation and shows the resulting link', async () => {
    let issued = false

    fetch.mockImplementation(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'session-token' })
      }
      if (url.endsWith('/me')) {
        return jsonResponse({
          user: {
            id: 'u-cfe',
            email: 'cfe.lead@mentorme.test',
            name: 'CFE Lead',
            role: 'cfe',
            organizationId: 'org-mentorme',
            onboardedAt: '2026-01-01T00:00:00.000Z',
          },
        })
      }
      if (url.endsWith('/me/onboarding')) {
        return jsonResponse({
          onboarded: true,
          nextStep: 'noop',
          role: 'cfe',
          organizationId: 'org-mentorme',
        })
      }
      if (url.endsWith('/invitations') && (!init || !init.method || init.method === 'GET')) {
        return jsonResponse({
          invitations: issued
            ? [
                {
                  id: 'inv-new',
                  email: 'newhire@mentorme.test',
                  role: 'student',
                  status: 'pending',
                  expiresAt: '2026-05-10T00:00:00.000Z',
                  createdAt: '2026-04-26T05:00:00.000Z',
                  createdById: 'u-cfe',
                },
              ]
            : [],
        })
      }
      if (url.endsWith('/invitations') && init?.method === 'POST') {
        issued = true
        return jsonResponse(
          {
            invitation: {
              id: 'inv-new',
              email: 'newhire@mentorme.test',
              role: 'student',
              status: 'pending',
              expiresAt: '2026-05-10T00:00:00.000Z',
              createdAt: '2026-04-26T05:00:00.000Z',
              createdById: 'u-cfe',
            },
            token: 'INVITE-NEW-TOKEN',
          },
          201,
        )
      }
      if (url.endsWith('/notifications/stream')) {
        return emptyStreamResponse()
      }
      return jsonResponse({ ventures: [], requests: [], mentors: [], items: [], count: 0 })
    })

    renderAtRoute('/cfe/invitations')

    expect(
      await screen.findByRole('heading', {
        name: /invite people into your cohort/i,
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/recipient email/i), {
      target: { value: 'newhire@mentorme.test' },
    })

    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }))

    expect(
      await screen.findByText(/invitation link for newhire@mentorme\.test/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes('/invite/INVITE-NEW-TOKEN')),
    ).toBeInTheDocument()
    expect(await screen.findByText('newhire@mentorme.test')).toBeInTheDocument()
  })
})
