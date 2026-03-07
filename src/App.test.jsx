import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from './App'

const renderAtRoute = (route = '/student') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('MentorMe app flows', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    window.history.pushState({}, 'Reset', '/student')
  })

  it('lands on the student workspace and lets a founder submit a mentor request', async () => {
    renderAtRoute('/')

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

    expect(
      await screen.findByText(/request sent to cfe review/i),
    ).toBeInTheDocument()
    expect(screen.getByDisplayValue('Aurora BioWorks')).toBeInTheDocument()
  })

  it('keeps founder data scoped to the current venture and excludes paused mentors from matching', async () => {
    renderAtRoute('/student')

    expect(await screen.findByText(/ecodrone systems is in cfe review/i)).toBeInTheDocument()
    expect(screen.queryByText(/medimesh labs/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/farmsphere/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /mentor network/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /pause visibility/i })[0])
    fireEvent.click(screen.getAllByRole('link', { name: /founder studio/i })[0])

    expect(screen.queryByRole('button', { name: /^naval shah$/i })).not.toBeInTheDocument()
  })

  it('lets CFE approve a request and mentor schedule a session', async () => {
    renderAtRoute('/admin')

    const reviewCard = await screen.findByTestId('request-card-req-002')
    fireEvent.click(within(reviewCard).getByRole('button', { name: /approve/i }))

    fireEvent.click(screen.getAllByRole('link', { name: /mentor desk/i })[0])

    const mentorCard = await screen.findByTestId('mentor-request-req-002')
    expect(screen.queryByTestId('mentor-request-req-003')).not.toBeInTheDocument()
    expect(within(mentorCard).getByLabelText(/calendly link/i)).toHaveValue('https://calendly.com/naval-shah/mentor-hour')
    fireEvent.change(within(mentorCard).getByLabelText(/meeting slot/i), {
      target: { value: '2026-03-10T14:00' },
    })
    fireEvent.click(within(mentorCard).getByRole('button', { name: /share slot/i }))

    expect(await screen.findByText(/session confirmed for mar 10, 2026/i)).toBeInTheDocument()
  })

  it('keeps returned requests visible so founders can revise them', async () => {
    renderAtRoute('/admin')

    const reviewCard = await screen.findByTestId('request-card-req-002')
    fireEvent.click(within(reviewCard).getByRole('button', { name: /return/i }))

    expect(await screen.findByText(/needs work/i)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: /founder studio/i })[0])

    expect(await screen.findByText(/ecodrone systems is in needs work/i)).toBeInTheDocument()
    expect(screen.getByText(/revise brief/i)).toBeInTheDocument()
  })

  it('lets the mentor desk switch between mentors and scope requests correctly', async () => {
    renderAtRoute('/mentor')

    expect(await screen.findByLabelText(/viewing mentor/i)).toHaveValue('m-naval')
    expect(screen.queryByTestId('mentor-request-req-003')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/viewing mentor/i), {
      target: { value: 'm-radhika' },
    })

    expect(await screen.findByTestId('mentor-request-req-003')).toBeInTheDocument()
    expect(screen.queryByTestId('mentor-request-req-002')).not.toBeInTheDocument()
  })
})
