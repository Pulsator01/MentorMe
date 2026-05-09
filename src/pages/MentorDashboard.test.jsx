import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MentorDashboard from './MentorDashboard'

let appState

vi.mock('../context/AppState', () => ({
  useAppState: () => appState,
}))

const mentor = {
  id: 'm-radhika',
  name: 'Dr. Radhika Gupta',
  title: 'Deeptech systems mentor',
  tolerance: 'High',
  bio: 'Helps deeptech teams move from lab prototype to controlled pilot.',
  focus: ['Robotics', 'TRL progression'],
  calendly: 'https://calendly.com/radhika/mentor-hour',
}

const request = {
  id: 'REQ-003',
  ventureName: 'MediMesh Labs',
  mentorId: 'm-radhika',
  stage: 'TRL 3+',
  status: 'awaiting_mentor',
  trl: 3,
  brl: 2,
  challenge: 'Need help planning the shortest path from prototype to pilot.',
  desiredOutcome: 'Decide the path from lab prototype to controlled pilot.',
  artifactList: ['validation-plan.pdf'],
  mentorNotes: '',
  meetingAt: '',
  calendlyLink: '',
}

describe('MentorDashboard', () => {
  beforeEach(() => {
    appState = {
      mode: 'api',
      mentors: [],
      requests: [],
      getMentorAction: vi.fn(),
      getCurrentMentorActions: vi.fn().mockResolvedValue({
        mentor,
        actions: [
          {
            mentorAction: {
              purpose: 'mentor_request',
            },
            request,
          },
        ],
      }),
      respondToMentorAction: vi.fn(),
      respondToMentorRequest: vi.fn().mockResolvedValue({
        decision: 'accepted',
        request,
      }),
      scheduleMentorAction: vi.fn(),
      scheduleMentorRequest: vi.fn(),
      saveMentorActionFeedback: vi.fn(),
      saveMentorRequestFeedback: vi.fn(),
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads assigned mentor requests for a signed-in mentor without requiring a secure link', async () => {
    render(
      <MemoryRouter initialEntries={['/mentors/desk']}>
        <MentorDashboard />
      </MemoryRouter>,
    )

    expect(await screen.findAllByText(/medimesh labs/i)).not.toHaveLength(0)
    expect(screen.queryByText(/open this page from a cfe-generated secure link/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /accept request/i }))

    await waitFor(() => {
      expect(appState.respondToMentorRequest).toHaveBeenCalledWith('REQ-003', { decision: 'accepted' })
    })
    expect(appState.respondToMentorAction).not.toHaveBeenCalled()
  })

  it('does not refetch mentor actions when unrelated mentor list updates occur in api mode', async () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/mentors/desk']}>
        <MentorDashboard />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: /dr\. radhika gupta/i })
    expect(appState.getCurrentMentorActions).toHaveBeenCalledTimes(1)

    appState = {
      ...appState,
      mentors: [{ ...mentor, title: 'Updated title from global hydrate' }],
    }

    rerender(
      <MemoryRouter initialEntries={['/mentors/desk']}>
        <MentorDashboard />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(appState.getCurrentMentorActions).toHaveBeenCalledTimes(1)
    })
  })

  it('hides tolerance from the mentor dashboard context panel', async () => {
    render(
      <MemoryRouter initialEntries={['/mentors/desk']}>
        <MentorDashboard />
      </MemoryRouter>,
    )

    await screen.findByText(/dr\. radhika gupta/i)
    expect(screen.queryByText(/high tolerance/i)).not.toBeInTheDocument()
  })
})
