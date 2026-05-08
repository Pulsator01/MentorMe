// @vitest-environment node

import type { PrismaClient } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { createBetterAuth } from './betterAuth'
import { createStubEmailGateway } from './stubEmailGateway'

describe('createBetterAuth security fields', () => {
  it('does not accept role or tenant fields from public signup input', () => {
    const auth = createBetterAuth({
      prisma: {} as PrismaClient,
      secret: 'test-secret-with-enough-entropy-for-vitest',
      baseURL: 'http://localhost:3001',
      appBaseUrl: 'http://localhost:5173',
      trustedOrigins: ['http://localhost:5173'],
      email: createStubEmailGateway(),
      defaultOrganizationId: 'org-mentorme',
      defaultCohortId: 'cohort-2026',
    })

    const fields = auth.options.user?.additionalFields

    expect(fields?.role).toMatchObject({
      defaultValue: 'founder',
      input: false,
    })
    expect(fields?.organizationId).toMatchObject({
      defaultValue: 'org-mentorme',
      input: false,
    })
    expect(fields?.cohortId).toMatchObject({
      defaultValue: 'cohort-2026',
      input: false,
    })
  })
})
