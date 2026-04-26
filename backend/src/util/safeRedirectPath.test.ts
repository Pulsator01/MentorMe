import { describe, expect, it } from 'vitest'
import { safeAppRedirectPath } from './safeRedirectPath'

describe('safeAppRedirectPath', () => {
  it('allows simple internal paths', () => {
    expect(safeAppRedirectPath('/founders')).toBe('/founders')
    expect(safeAppRedirectPath('/login?next=%2F')).toBe('/login?next=%2F')
  })

  it('rejects protocol-relative and absolute URLs', () => {
    expect(safeAppRedirectPath('//evil.example/phish')).toBe('/')
    expect(safeAppRedirectPath('https://evil.example/')).toBe('/')
  })

  it('rejects non-path values', () => {
    expect(safeAppRedirectPath('')).toBe('/')
    expect(safeAppRedirectPath('not-a-path')).toBe('/')
    expect(safeAppRedirectPath(undefined)).toBe('/')
  })
})
