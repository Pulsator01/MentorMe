import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../../App'

const renderAtRoute = (route = '/welcome') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('Marketing landing page', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders the public welcome page without authentication', async () => {
    renderAtRoute('/welcome')

    expect(
      await screen.findByRole('heading', {
        name: /the operating system for mentor access inside incubators/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /sign in to your workspace/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /create an account/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument()
  })
})
