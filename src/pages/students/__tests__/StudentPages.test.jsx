import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../../../App'

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('Legacy student workspace redirects', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.pushState({}, 'Reset', '/')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('maps the old student overview URL to the founder overview', async () => {
    renderAtRoute('/students')

    expect(
      await screen.findByRole('heading', {
        name: /build the right mentor ask before cfe routes it/i,
      }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/founders')
  })

  it('maps the old student follow-up URL to the founder pipeline', async () => {
    renderAtRoute('/students/follow-up')

    expect(await screen.findByTestId('founder-request-req-002')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/founders/pipeline')
  })
})
