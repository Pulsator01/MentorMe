import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import App from '../../../App'

const renderAtRoute = (route = '/') => {
  window.history.pushState({}, 'Test route', route)
  return render(<App />)
}

describe('Student workspace multi-page split', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    window.history.pushState({}, 'Reset', '/')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('renders the student overview with sub-navigation and the prep checklist', async () => {
    renderAtRoute('/students')

    expect(
      await screen.findByRole('heading', {
        name: /keep student-facing work simple: prepare, show up, and follow through/i,
      }),
    ).toBeInTheDocument()

    const subNav = screen.getByRole('navigation', { name: /student workspace sections/i })
    expect(within(subNav).getByRole('link', { name: /workspace/i })).toBeInTheDocument()
    expect(within(subNav).getByRole('link', { name: /ai follow-up/i })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /pre-read pack/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /meeting prep/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /follow-up note/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /useful links/i })).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /open readiness playbook/i })).toBeInTheDocument()
  })

  it('navigates from the overview into the AI follow-up page via the highlight card', async () => {
    renderAtRoute('/students')

    const subNav = await screen.findByRole('navigation', { name: /student workspace sections/i })
    expect(within(subNav).getByRole('link', { name: /ai follow-up/i })).toBeInTheDocument()

    const highlight = screen.getByRole('link', { name: /open ai follow-up/i })
    fireEvent.click(highlight)

    expect(
      await screen.findByRole('heading', { name: /turn raw meeting notes into clean next steps/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/meeting notes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /summarize with ai/i })).toBeInTheDocument()
  })

  it('renders the AI follow-up page directly via its own route', async () => {
    renderAtRoute('/students/follow-up')

    expect(
      await screen.findByRole('heading', { name: /turn raw meeting notes into clean next steps/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/meeting notes/i)).toBeInTheDocument()
  })

  it('lets users return to the overview via the back link on the follow-up page', async () => {
    renderAtRoute('/students/follow-up')

    const backLink = await screen.findByRole('link', { name: /back to student workspace/i })
    fireEvent.click(backLink)

    expect(
      await screen.findByRole('heading', {
        name: /keep student-facing work simple: prepare, show up, and follow through/i,
      }),
    ).toBeInTheDocument()
  })
})
