// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_COHORT_ID,
  DEFAULT_COHORT_NAME,
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_ORGANIZATION_NAME,
  DEFAULT_ORGANIZATION_SLUG,
  ensureDefaultTenant,
} from './defaultTenant'

const buildPrismaMock = () => ({
  organization: {
    upsert: vi.fn().mockResolvedValue({ id: DEFAULT_ORGANIZATION_ID }),
  },
  cohort: {
    upsert: vi.fn().mockResolvedValue({ id: DEFAULT_COHORT_ID }),
  },
})

describe('default tenant provisioning', () => {
  it('creates the production organization and cohort without destructive seed resets', async () => {
    const prisma = buildPrismaMock()

    await ensureDefaultTenant(prisma as never)

    expect(prisma.organization.upsert).toHaveBeenCalledWith({
      where: { id: DEFAULT_ORGANIZATION_ID },
      create: {
        id: DEFAULT_ORGANIZATION_ID,
        name: DEFAULT_ORGANIZATION_NAME,
        slug: DEFAULT_ORGANIZATION_SLUG,
      },
      update: {},
    })
    expect(prisma.cohort.upsert).toHaveBeenCalledWith({
      where: { id: DEFAULT_COHORT_ID },
      create: {
        id: DEFAULT_COHORT_ID,
        organizationId: DEFAULT_ORGANIZATION_ID,
        name: DEFAULT_COHORT_NAME,
      },
      update: {},
    })
    expect(prisma.organization.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.cohort.upsert).toHaveBeenCalledTimes(1)
  })

  it('uses configured default tenant ids for non-standard deployments', async () => {
    const prisma = buildPrismaMock()

    await ensureDefaultTenant(prisma as never, {
      organizationId: 'org-custom',
      organizationName: 'Custom Org',
      organizationSlug: 'custom-org',
      cohortId: 'cohort-custom',
      cohortName: 'Custom Cohort',
    })

    expect(prisma.organization.upsert).toHaveBeenCalledWith({
      where: { id: 'org-custom' },
      create: {
        id: 'org-custom',
        name: 'Custom Org',
        slug: 'custom-org',
      },
      update: {},
    })
    expect(prisma.cohort.upsert).toHaveBeenCalledWith({
      where: { id: 'cohort-custom' },
      create: {
        id: 'cohort-custom',
        organizationId: 'org-custom',
        name: 'Custom Cohort',
      },
      update: {},
    })
  })
})
