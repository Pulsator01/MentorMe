/**
 * Sanitize `next` query values for client-side navigation (open-redirect hardening).
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function sanitizeNextPath(raw) {
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
