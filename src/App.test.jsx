import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'

const renderAtRoute = (route = '/') => {
  cleanup()
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

const textResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: vi.fn().mockResolvedValue(body),
  json: vi.fn().mockResolvedValue({ message: body }),
})

describe('MentorMe role-based frontend', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.pushState({}, 'Reset', '/')
  })

  it('lands on the role home instead of dumping everyone into one dashboard', async () => {
    renderAtRoute('/')

    expect(
      await screen.findByRole('heading', { name: /choose the role-specific workspace you actually need/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /open workspace/i })).toHaveLength(3)
    expect(screen.queryByRole('heading', { name: /students/i })).not.toBeInTheDocument()
  })

  it('shows founder, mentor, and CFE as the signup role options', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(textResponse('Unauthorized', 401)))

    renderAtRoute('/signup')

    const roleSelect = await screen.findByLabelText(/i am a/i)
    const optionLabels = within(roleSelect)
      .getAllByRole('option')
      .map((option) => option.textContent)

    expect(optionLabels).toEqual([
      'Founder (looking for mentorship)',
      'Mentor',
      'CFE',
    ])
  })

  it('lets founders submit a mentor request from the new-request page', async () => {
    renderAtRoute('/founders/new-request')

    expect(
      await screen.findByRole('heading', { name: /build the right mentor ask before cfe routes it/i }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/venture name/i), {
      target: { value: 'Aurora BioWorks' },
    })
    fireEvent.change(screen.getByLabelText(/what do you need help with/i), {
      target: { value: 'Need mentor help on biotech fundraising narrative.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /naval shah/i }))
    fireEvent.click(screen.getByRole('button', { name: /send to cfe review/i }))

    expect(await screen.findByText(/request sent to cfe review/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Aurora BioWorks')).toBeInTheDocument()
  })

  it('shows the founder overview with venture-scoped nudges and hides other founders', async () => {
    renderAtRoute('/founders')

    expect(await screen.findByText(/ecodrone systems is in cfe review/i)).toBeInTheDocument()
    expect(screen.queryByText(/medimesh labs/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/farmsphere/i)).not.toBeInTheDocument()
  })

  it('excludes paused mentors from the new-request mentor shortlist', async () => {
    renderAtRoute('/founders/new-request')

    expect(await screen.findByRole('button', { name: /naval shah/i })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /mentor network/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /pause visibility/i })[0])

    fireEvent.click(screen.getAllByRole('link', { name: /founders/i })[0])
    expect(
      await screen.findByRole('link', { name: /^new request$/i }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /^new request$/i }))

    expect(
      await screen.findByRole('heading', { name: /build the right mentor ask before cfe routes it/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^naval shah$/i })).not.toBeInTheDocument()
  })

  it('keeps returned requests visible so founders can revise them after CFE review', async () => {
    renderAtRoute('/cfe/pipeline')

    const reviewCard = await screen.findByTestId('request-card-req-002')
    fireEvent.click(within(reviewCard).getByRole('button', { name: /return/i }))

    const needsWorkColumn = await screen.findByTestId('kanban-column-needs_work')
    expect(within(needsWorkColumn).getByTestId('request-card-req-002')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /founders/i })[0])

    expect(await screen.findByText(/ecodrone systems is in needs work/i)).toBeInTheDocument()
    expect(screen.getByText(/revise brief/i)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /^pipeline$/i })[0])

    expect(await screen.findByTestId('founder-request-req-002')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /re-submit to cfe/i }))

    expect(await screen.findByText(/request req-002 re-submitted to cfe review/i)).toBeInTheDocument()
  })

  it('lets founders attach another artifact from the pipeline page', async () => {
    renderAtRoute('/founders/pipeline')

    expect(await screen.findByTestId('founder-request-req-002')).toBeInTheDocument()

    const fileInput = screen.getByLabelText(/upload artifact for req-002/i)
    const file = new File(['deck proof'], 'updated-deck.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, {
      target: {
        files: [file],
      },
    })

    expect(await screen.findByText(/updated-deck.pdf attached to req-002/i)).toBeInTheDocument()
    expect(screen.getByText('updated-deck.pdf')).toBeInTheDocument()
  })

  it('lets CFE close a follow-up request after the session is complete', async () => {
    renderAtRoute('/cfe/pipeline')

    const followUpCard = await screen.findByTestId('request-card-req-005')
    fireEvent.click(within(followUpCard).getByRole('button', { name: /close request/i }))

    expect(await screen.findByText(/req-005 closed and removed from the live pipeline/i)).toBeInTheDocument()
    expect(screen.queryByTestId('request-card-req-005')).not.toBeInTheDocument()
  })

  it('redirects legacy student workspace URLs to founder workspaces', async () => {
    renderAtRoute('/students')

    expect(
      await screen.findByRole('heading', { name: /build the right mentor ask before cfe routes it/i }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/founders')

    cleanup()
    renderAtRoute('/students/follow-up')

    expect(await screen.findByTestId('founder-request-req-002')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/founders/pipeline')
  })

  it('exposes a mid-sem readiness page with the coded progress sheet', async () => {
    renderAtRoute('/midsem')

    expect(
      await screen.findByRole('heading', { name: /product scope, endpoint progress, and honest delivery status in one place/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/color-coded api implementation status/i)).toBeInTheDocument()
    expect(screen.getByText('/mentor-actions/:token')).toBeInTheDocument()
    expect(screen.getByText('/mentor-actions/:token/respond')).toBeInTheDocument()
  })

  it('routes mentors to the mentor desk workspace', async () => {
    renderAtRoute('/mentors/desk')

    expect(await screen.findByRole('heading', { name: /review your assigned mentor requests without the admin clutter/i })).toBeInTheDocument()
    expect(screen.getAllByText(/medimesh labs/i).length).toBeGreaterThan(0)
  })
})
