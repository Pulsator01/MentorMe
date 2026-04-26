import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import App from '../../App'

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('Settings page', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.pushState({}, 'Reset', '/')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders the heading and surfaces the local-mode badge', async () => {
    renderAtRoute('/settings')

    expect(
      await screen.findByRole('heading', { name: /manage your account and credentials/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/local demo mode/i)).toBeInTheDocument()
  })

  it('surfaces a notice that password changes need the live API and disables the form', async () => {
    renderAtRoute('/settings')

    expect(
      await screen.findByText(/password changes need the live api backend/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/current password/i)).toBeDisabled()
    expect(screen.getByLabelText(/^new password/i)).toBeDisabled()
    expect(screen.getByLabelText(/confirm new password/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled()
  })

  it('shows the local-demo fallback for the profile section when no user is signed in', async () => {
    renderAtRoute('/settings')

    expect(
      await screen.findByText(/you are browsing the local demo\. sign in to manage real account credentials/i),
    ).toBeInTheDocument()
  })

  it('disables the sign-out button while no API session exists', async () => {
    renderAtRoute('/settings')

    expect(
      await screen.findByRole('button', { name: /sign out of mentorme/i }),
    ).toBeDisabled()
  })

  it('is reachable from the sidebar settings entry', async () => {
    renderAtRoute('/')

    const sidebarLinks = await screen.findAllByRole('link', { name: /settings/i })
    sidebarLinks[0].click()

    expect(
      await screen.findByRole('heading', { name: /manage your account and credentials/i }),
    ).toBeInTheDocument()
  })
})
