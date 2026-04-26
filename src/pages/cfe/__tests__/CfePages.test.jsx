import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../../../App'

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('CFE workspace multi-page split', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.pushState({}, 'Reset', '/')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders the CFE overview with stat cards, guardrails, and the sub-navigation', async () => {
    renderAtRoute('/cfe')

    expect(
      await screen.findByRole('heading', {
        name: /triage mentor access without turning the workflow into a mess/i,
      }),
    ).toBeInTheDocument()

    const subNav = screen.getByRole('navigation', { name: /cfe workspace sections/i })
    expect(within(subNav).getByRole('link', { name: /overview/i })).toBeInTheDocument()
    expect(within(subNav).getByRole('link', { name: /pipeline/i })).toBeInTheDocument()
    expect(within(subNav).getByRole('link', { name: /mentor network/i })).toBeInTheDocument()
    expect(within(subNav).getByRole('link', { name: /invitations/i })).toBeInTheDocument()

    expect(screen.getAllByText(/live pipeline/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/review queue/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/keep the guardrails simple/i)).toBeInTheDocument()
  })

  it('does not render the kanban on the overview page (kanban moved to pipeline)', async () => {
    renderAtRoute('/cfe')

    expect(
      await screen.findByRole('heading', {
        name: /triage mentor access without turning the workflow into a mess/i,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('kanban-column-cfe_review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('request-card-req-002')).not.toBeInTheDocument()
  })

  it('navigates from overview to pipeline via the quick action card', async () => {
    renderAtRoute('/cfe')

    const quickAction = await screen.findByRole('link', { name: /go to pipeline/i })
    fireEvent.click(quickAction)

    expect(await screen.findByTestId('kanban-column-cfe_review')).toBeInTheDocument()
    expect(screen.getByTestId('request-card-req-002')).toBeInTheDocument()
  })

  it('renders the pipeline directly with the kanban board and follow-up summary chip', async () => {
    renderAtRoute('/cfe/pipeline')

    expect(await screen.findByTestId('kanban-column-cfe_review')).toBeInTheDocument()
    expect(screen.getByText(/follow-ups already logged/i)).toBeInTheDocument()
    expect(screen.getByTestId('request-card-req-002')).toBeInTheDocument()
  })

  it('lets CFE move from pipeline to mentor network via the sub-navigation', async () => {
    renderAtRoute('/cfe/pipeline')

    const subNav = await screen.findByRole('navigation', { name: /cfe workspace sections/i })
    fireEvent.click(within(subNav).getByRole('link', { name: /mentor network/i }))

    expect(
      await screen.findByRole('heading', {
        name: /keep the mentor directory controlled and easy to operate/i,
      }),
    ).toBeInTheDocument()
  })
})
