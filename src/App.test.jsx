import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('MentorMe role-based frontend', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    window.history.pushState({}, 'Reset', '/')
  })

  it('lands on the role home instead of dumping everyone into one dashboard', async () => {
    renderAtRoute('/')

    expect(
      await screen.findByRole('heading', { name: /choose the role-specific workspace you actually need/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /open workspace/i })).toHaveLength(4)
  })

  it('lets founders submit a mentor request from the founder workspace', async () => {
    renderAtRoute('/founders')

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

  it('keeps founder data scoped to the current venture and excludes paused mentors from matching', async () => {
    renderAtRoute('/founders')

    expect(await screen.findByText(/ecodrone systems is in cfe review/i)).toBeInTheDocument()
    expect(screen.queryByText(/medimesh labs/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/farmsphere/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /mentor network/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /pause visibility/i })[0])
    fireEvent.click(screen.getAllByRole('link', { name: /founders/i })[0])

    expect(screen.queryByRole('button', { name: /^naval shah$/i })).not.toBeInTheDocument()
  })

  it('keeps returned requests visible so founders can revise them after CFE review', async () => {
    renderAtRoute('/cfe')

    const reviewCard = await screen.findByTestId('request-card-req-002')
    fireEvent.click(within(reviewCard).getByRole('button', { name: /return/i }))

    expect(await screen.findByText(/requests that were returned for better context or better material/i)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /founders/i })[0])

    expect(await screen.findByText(/ecodrone systems is in needs work/i)).toBeInTheDocument()
    expect(screen.getByText(/revise brief/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /re-submit to cfe/i }))

    expect(await screen.findByText(/request re-submitted to cfe review/i)).toBeInTheDocument()
    expect(screen.getByText(/ecodrone systems is in cfe review/i)).toBeInTheDocument()
  })

  it('lets founders attach another artifact to an existing request', async () => {
    renderAtRoute('/founders')

    expect(await screen.findByText(/ecodrone systems is in cfe review/i)).toBeInTheDocument()

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
    renderAtRoute('/cfe')

    const followUpCard = await screen.findByTestId('request-card-req-005')
    fireEvent.click(within(followUpCard).getByRole('button', { name: /close request/i }))

    expect(await screen.findByText(/req-005 closed and removed from the live pipeline/i)).toBeInTheDocument()
    expect(screen.queryByTestId('request-card-req-005')).not.toBeInTheDocument()
  })

  it('gives students a separate workspace focused on prep and follow-through', async () => {
    renderAtRoute('/students')

    expect(
      await screen.findByRole('heading', { name: /keep student-facing work simple: prepare, show up, and follow through/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open readiness playbook/i })).toBeInTheDocument()
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

  it('routes mentors to the secure mentor desk workspace', async () => {
    renderAtRoute('/mentors/desk')

    expect(await screen.findByRole('heading', { name: /review one vetted request without the admin clutter/i })).toBeInTheDocument()
    expect(screen.getAllByText(/medimesh labs/i).length).toBeGreaterThan(0)
  })
})
