import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FounderOverviewPage from '../FounderOverviewPage'
import NewRequestPage from '../NewRequestPage'
import { useAppState } from '../../../context/AppState'

vi.mock('../../../context/AppState', () => ({
  useAppState: vi.fn(),
}))

const legacyVenture = {
  id: 'v-legacy',
  name: 'Legacy Robotics',
  founder: 'Legacy Founder',
  founderName: 'Legacy Founder',
  domain: 'Robotics',
  stage: 'TRL 4',
  trl: 7,
  brl: 6,
  location: 'Mohali, India',
  summary: 'Autonomous lab platform with active pilot evidence.',
  nextMilestone: 'Expand the pilot into a repeatable paid deployment.',
}

const buildAppState = () => ({
  venture: legacyVenture,
  requests: [],
  mentors: [],
  submitRequest: vi.fn(),
  generateAiMentorRecommendations: vi.fn(),
  generateAiRequestBrief: vi.fn(),
})

describe('Founder readiness display', () => {
  beforeEach(() => {
    useAppState.mockReturnValue(buildAppState())
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps legacy TRL-like stage values out of the founder overview card', () => {
    render(
      <MemoryRouter>
        <FounderOverviewPage />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Readiness: TRL 7, BRL 6')).toBeInTheDocument()
    expect(screen.queryByText('TRL 4')).not.toBeInTheDocument()
  })

  it('keeps legacy TRL-like stage values out of the request composer header', () => {
    render(
      <MemoryRouter>
        <NewRequestPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('TRL 7').length).toBeGreaterThan(0)
    expect(screen.getAllByText('BRL 6').length).toBeGreaterThan(0)
    expect(screen.queryByText('TRL 4')).not.toBeInTheDocument()
  })
})
