import { describe, expect, it } from 'vitest'
import { buildCalendlyWebhookSignature, verifyCalendlyWebhookSignature } from './calendlyWebhookSignature'

describe('Calendly webhook signature', () => {
  const secret = 'test-signing-secret'
  const raw = JSON.stringify({ hello: 'world' })
  const t = 1700000000

  it('verifies a signature built with the same algorithm', () => {
    const header = buildCalendlyWebhookSignature(secret, raw, t)
    expect(verifyCalendlyWebhookSignature(secret, raw, header)).toBe(true)
  })

  it('rejects tampered bodies', () => {
    const header = buildCalendlyWebhookSignature(secret, raw, t)
    expect(verifyCalendlyWebhookSignature(secret, `${raw}x`, header)).toBe(false)
  })
})
