import type { PrismaClient } from '@prisma/client'

export const DEFAULT_ORGANIZATION_ID = 'org-mentorme'
export const DEFAULT_ORGANIZATION_NAME = 'MentorMe'
export const DEFAULT_ORGANIZATION_SLUG = 'mentorme'
export const DEFAULT_COHORT_ID = 'cohort-2026'
export const DEFAULT_COHORT_NAME = 'Incubation Cohort 2026'

export type DefaultTenantOptions = {
  organizationId?: string
  organizationName?: string
  organizationSlug?: string
  cohortId?: string
  cohortName?: string
}

const withDefault = (value: string | undefined, fallback: string) => value?.trim() || fallback

export const resolveDefaultTenant = (options: DefaultTenantOptions = {}) => ({
  organizationId: withDefault(options.organizationId, DEFAULT_ORGANIZATION_ID),
  organizationName: withDefault(options.organizationName, DEFAULT_ORGANIZATION_NAME),
  organizationSlug: withDefault(options.organizationSlug, DEFAULT_ORGANIZATION_SLUG),
  cohortId: withDefault(options.cohortId, DEFAULT_COHORT_ID),
  cohortName: withDefault(options.cohortName, DEFAULT_COHORT_NAME),
})

export const ensureDefaultTenant = async (prisma: PrismaClient, options: DefaultTenantOptions = {}) => {
  const tenant = resolveDefaultTenant(options)

  await prisma.organization.upsert({
    where: { id: tenant.organizationId },
    create: {
      id: tenant.organizationId,
      name: tenant.organizationName,
      slug: tenant.organizationSlug,
    },
    update: {},
  })

  await prisma.cohort.upsert({
    where: { id: tenant.cohortId },
    create: {
      id: tenant.cohortId,
      organizationId: tenant.organizationId,
      name: tenant.cohortName,
    },
    update: {},
  })

  return tenant
}
