import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RequireOnboarded from '../RequireOnboarded'

const mockGetOnboardingStatus = vi.fn()

vi.mock('../../context/AppState', () => ({
  useAppState: () => ({
    mode: 'api',
    currentUser: { id: 'u-local', role: 'founder' },
    getOnboardingStatus: mockGetOnboardingStatus,
  }),
}))

describe('RequireOnboarded', () => {
  beforeEach(() => {
    mockGetOnboardingStatus.mockReset()
  })

  it('fails closed with retry when onboarding status cannot be loaded', async () => {
    mockGetOnboardingStatus.mockRejectedValueOnce(new Error('Upstream unavailable'))

    render(
      <MemoryRouter initialEntries={['/founders']}>
        <Routes>
          <Route
            path="/founders"
            element={(
              <RequireOnboarded>
                <div>Inside workspace</div>
              </RequireOnboarded>
            )}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Upstream unavailable/i)).toBeInTheDocument()

    mockGetOnboardingStatus.mockResolvedValueOnce({ nextStep: 'completed' })
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText('Inside workspace')).toBeInTheDocument()
    })
  })
})
