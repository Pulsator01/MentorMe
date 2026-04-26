import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../../../App'

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('Founder workspace multi-page split', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.pushState({}, 'Reset', '/')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders the overview with all four stats and the sub-navigation', async () => {
    renderAtRoute('/founders')

    expect(
      await screen.findByRole('heading', { name: /build the right mentor ask before cfe routes it/i }),
    ).toBeInTheDocument()

    const subNav = screen.getByRole('navigation', { name: /founder workspace sections/i })
    expect(within(subNav).getByRole('link', { name: /overview/i })).toBeInTheDocument()
    expect(within(subNav).getByRole('link', { name: /new request/i })).toBeInTheDocument()
    expect(within(subNav).getByRole('link', { name: /pipeline/i })).toBeInTheDocument()

    expect(screen.getAllByText(/in queue/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/scheduled/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/needs work/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/follow-up/i).length).toBeGreaterThan(0)
  })

  it('navigates from the overview to the composer via the quick action card', async () => {
    renderAtRoute('/founders')

    const quickAction = await screen.findByRole('link', { name: /open request composer/i })
    fireEvent.click(quickAction)

    expect(
      await screen.findByRole('heading', { name: /build the right mentor ask before cfe routes it/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/venture name/i)).toBeInTheDocument()
  })

  it('navigates from the overview to the pipeline via the quick action card', async () => {
    renderAtRoute('/founders')

    const quickAction = await screen.findByRole('link', { name: /open pipeline/i })
    fireEvent.click(quickAction)

    expect(
      await screen.findByRole('heading', { name: /see the venture pipeline without the clutter/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /all requests/i })).toBeInTheDocument()
  })

  it('filters the pipeline by status using the tab bar', async () => {
    renderAtRoute('/founders/pipeline')

    expect(await screen.findByTestId('founder-request-req-002')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /needs work/i }))

    expect(screen.queryByTestId('founder-request-req-002')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /in queue/i }))

    expect(await screen.findByTestId('founder-request-req-002')).toBeInTheDocument()
  })

  it('shows an empty state when no requests match the active filter', async () => {
    renderAtRoute('/founders/pipeline')

    fireEvent.click(screen.getByRole('tab', { name: /needs work/i }))

    expect(await screen.findByText(/no requests match this filter yet/i)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /compose a new request/i }).length).toBeGreaterThan(0)
  })
})
