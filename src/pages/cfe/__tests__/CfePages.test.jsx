import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

  it('renders the CFE overview with stat cards, guardrails, and sidebar navigation', async () => {
    renderAtRoute('/cfe')

    expect(
      await screen.findByRole('heading', {
        name: /triage mentor access without the admin mess/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('link', { name: /overview/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /pipeline/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /mentor network/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: /invitations/i }).length).toBeGreaterThan(0)

    expect(screen.getAllByText(/live pipeline/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/review queue/i).length).toBeGreaterThan(0)
  })

  it('does not render the kanban on the overview page (kanban moved to pipeline)', async () => {
    renderAtRoute('/cfe')

    expect(
      await screen.findByRole('heading', {
        name: /triage mentor access without the admin mess/i,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('kanban-column-cfe_review')).not.toBeInTheDocument()
    expect(screen.queryByTestId('request-card-req-002')).not.toBeInTheDocument()
  })

  it('navigates from overview to pipeline via the quick action card', async () => {
    renderAtRoute('/cfe')

    const quickAction = await screen.findByRole('link', { name: /open the pipeline board/i })
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

  it('lets CFE move from pipeline to mentor network via the sidebar navigation', async () => {
    renderAtRoute('/cfe/pipeline')

    const networkLink = await screen.findByRole('link', { name: /mentor network/i })
    fireEvent.click(networkLink)

    expect(
      await screen.findByRole('heading', {
        name: /keep the mentor directory controlled and easy to operate/i,
      }),
    ).toBeInTheDocument()
  })
})
