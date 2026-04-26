/**
 * Returns a same-origin SPA path safe for redirects (blocks open redirects).
 * Allows paths like `/founders` or `/login?next=%2F` query strings on the same app.
 */
export function safeAppRedirectPath(raw: string | undefined | null): string {
  if (raw == null || typeof raw !== 'string') {
    return '/'
  }
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return '/'
  }
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/'
  }
  if (trimmed.includes('://') || trimmed.includes('\\\\')) {
    return '/'
  }
  if (trimmed.includes('@')) {
    return '/'
  }
  return trimmed
}
