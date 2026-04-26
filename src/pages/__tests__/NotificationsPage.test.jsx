import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../../App'

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('Notifications page', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.pushState({}, 'Reset', '/')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders the empty state when no notifications have been captured yet', async () => {
    renderAtRoute('/notifications')

    expect(
      await screen.findByRole('heading', {
        name: /everything that moved while you were heads down/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument()
    expect(screen.getByText(/quiet workspace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clear log/i })).toBeDisabled()
  })

  it('captures a notification when CFE approves a request and shows it on the notifications feed', async () => {
    renderAtRoute('/cfe/pipeline')

    const reviewCard = await screen.findByTestId('request-card-req-002')
    fireEvent.click(within(reviewCard).getByRole('button', { name: /approve/i }))

    expect(await screen.findByTestId('kanban-column-awaiting_mentor')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /notifications/i })[0])

    expect(
      await screen.findByRole('heading', {
        name: /everything that moved while you were heads down/i,
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/no notifications yet/i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/request req-002 approved — awaiting mentor/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('REQ-002').length).toBeGreaterThan(0)
  })

  it('marks all notifications read and clears the sidebar badge', async () => {
    renderAtRoute('/cfe/pipeline')

    const reviewCard = await screen.findByTestId('request-card-req-002')
    fireEvent.click(within(reviewCard).getByRole('button', { name: /approve/i }))

    fireEvent.click(screen.getAllByRole('link', { name: /notifications/i })[0])

    const markAllButton = await screen.findByRole('button', { name: /mark all read/i })
    expect(markAllButton).not.toBeDisabled()
    expect(
      screen.getByLabelText(/1 unread notification$/i),
    ).toBeInTheDocument()

    fireEvent.click(markAllButton)

    expect(screen.getByRole('button', { name: /mark all read/i })).toBeDisabled()
    expect(screen.queryByLabelText(/1 unread notification$/i)).not.toBeInTheDocument()
  })

  it('clears the activity feed when the user clicks Clear log', async () => {
    renderAtRoute('/cfe/pipeline')

    const reviewCard = await screen.findByTestId('request-card-req-002')
    fireEvent.click(within(reviewCard).getByRole('button', { name: /approve/i }))

    fireEvent.click(screen.getAllByRole('link', { name: /notifications/i })[0])

    const clearButton = await screen.findByRole('button', { name: /clear log/i })
    expect(clearButton).not.toBeDisabled()

    fireEvent.click(clearButton)

    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument()
  })
})
