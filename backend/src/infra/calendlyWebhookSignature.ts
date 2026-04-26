import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verifies Calendly's `Calendly-Webhook-Signature` header (format `t=timestamp,v1=hex`).
 * @param signingSecret — signing key from the Calendly webhook configuration (UTF-8 string).
 * @param rawBody — exact request body bytes as UTF-8 (must match what Calendly signed).
 */
export function verifyCalendlyWebhookSignature(
  signingSecret: string,
  rawBody: string,
  signatureHeader: string | string[] | undefined,
): boolean {
  if (!signingSecret || typeof signatureHeader !== 'string' || signatureHeader.length === 0) {
    return false
  }

  let timestamp = ''
  let signature = ''
  for (const segment of signatureHeader.split(',')) {
    const piece = segment.trim()
    const eq = piece.indexOf('=')
    if (eq === -1) {
      continue
    }
    const key = piece.slice(0, eq).trim()
    const value = piece.slice(eq + 1).trim()
    if (key === 't') {
      timestamp = value
    }
    if (key === 'v1') {
      signature = value
    }
  }

  if (!timestamp || !signature) {
    return false
  }

  const payload = `${timestamp}.${rawBody}`
  const expectedHex = createHmac('sha256', signingSecret).update(payload, 'utf8').digest('hex')

  try {
    const a = Buffer.from(expectedHex, 'utf8')
    const b = Buffer.from(signature, 'utf8')
    if (a.length !== b.length) {
      return false
    }
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function buildCalendlyWebhookSignature(signingSecret: string, rawBody: string, timestampSec: number): string {
  const t = String(timestampSec)
  const v1 = createHmac('sha256', signingSecret).update(`${t}.${rawBody}`, 'utf8').digest('hex')
  return `t=${t},v1=${v1}`
}
