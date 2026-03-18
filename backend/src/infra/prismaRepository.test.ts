// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { createPrismaPlatformRepository } from './prismaRepository'

describe('PrismaPlatformRepository', () => {
  it('maps case-insensitive user lookup results into domain shape', async () => {
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'user-founder-aarav',
          organizationId: 'org-mentorme',
          cohortId: null,
          email: 'aarav.sharma@mentorme.test',
          name: 'Aarav Sharma',
          role: 'founder',
        }),
      },
    } as unknown as PrismaClient

    const repository = createPrismaPlatformRepository(prisma)
    const user = await repository.findUserByEmail('AARAV.SHARMA@MENTORME.TEST')

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: {
          equals: 'AARAV.SHARMA@MENTORME.TEST',
          mode: 'insensitive',
        },
      },
    })
    expect(user).toEqual({
      id: 'user-founder-aarav',
      organizationId: 'org-mentorme',
      cohortId: undefined,
      email: 'aarav.sharma@mentorme.test',
      name: 'Aarav Sharma',
      role: 'founder',
    })
  })

  it('persists request nullable fields as null and maps them back to optional domain fields', async () => {
    const prisma = {
      mentorRequest: {
        upsert: vi.fn().mockResolvedValue({
          id: 'REQ-101',
          organizationId: 'org-mentorme',
          ventureId: 'v-ecodrone',
          founderUserId: 'user-founder-aarav',
          cfeOwnerId: null,
          mentorId: null,
          stage: 'MVP',
          trl: 4,
          brl: 3,
          status: 'cfe_review',
          challenge: 'Need help with fundraising story.',
          desiredOutcome: 'Leave with a sharper narrative.',
          mentorNotes: '',
          createdAt: new Date('2026-03-19T08:00:00.000Z'),
          updatedAt: new Date('2026-03-19T08:00:00.000Z'),
          submittedAt: null,
          meetingAt: null,
          calendlyLink: null,
        }),
      },
    } as unknown as PrismaClient

    const repository = createPrismaPlatformRepository(prisma)
    const saved = await repository.saveRequest({
      id: 'REQ-101',
      organizationId: 'org-mentorme',
      ventureId: 'v-ecodrone',
      founderUserId: 'user-founder-aarav',
      stage: 'MVP',
      trl: 4,
      brl: 3,
      status: 'cfe_review',
      challenge: 'Need help with fundraising story.',
      desiredOutcome: 'Leave with a sharper narrative.',
      mentorNotes: '',
      createdAt: '2026-03-19T08:00:00.000Z',
      updatedAt: '2026-03-19T08:00:00.000Z',
    })

    expect(prisma.mentorRequest.upsert).toHaveBeenCalledWith({
      where: { id: 'REQ-101' },
      update: expect.objectContaining({
        cfeOwnerId: null,
        mentorId: null,
        submittedAt: null,
        meetingAt: null,
        calendlyLink: null,
      }),
      create: expect.objectContaining({
        id: 'REQ-101',
        cfeOwnerId: null,
        mentorId: null,
      }),
    })
    expect(saved.mentorId).toBeUndefined()
    expect(saved.cfeOwnerId).toBeUndefined()
    expect(saved.submittedAt).toBeUndefined()
  })

  it('round-trips mentor action token response fields', async () => {
    const prisma = {
      externalActionToken: {
        upsert: vi.fn().mockResolvedValue({
          id: 'eat-123',
          requestId: 'REQ-002',
          mentorId: 'm-naval',
          tokenHash: 'hashed-token',
          purpose: 'mentor_request',
          response: 'declined',
          respondedAt: new Date('2026-03-19T09:30:00.000Z'),
          responseReason: 'Capacity is full this week.',
          expiresAt: new Date('2026-03-26T09:30:00.000Z'),
        }),
      },
    } as unknown as PrismaClient

    const repository = createPrismaPlatformRepository(prisma)
    const saved = await repository.saveExternalActionToken({
      id: 'eat-123',
      requestId: 'REQ-002',
      mentorId: 'm-naval',
      tokenHash: 'hashed-token',
      purpose: 'mentor_request',
      response: 'declined',
      respondedAt: '2026-03-19T09:30:00.000Z',
      responseReason: 'Capacity is full this week.',
      expiresAt: '2026-03-26T09:30:00.000Z',
    })

    expect(prisma.externalActionToken.upsert).toHaveBeenCalledWith({
      where: { id: 'eat-123' },
      update: expect.objectContaining({
        response: 'declined',
        responseReason: 'Capacity is full this week.',
      }),
      create: expect.objectContaining({
        id: 'eat-123',
        response: 'declined',
      }),
    })
    expect(saved).toEqual({
      id: 'eat-123',
      requestId: 'REQ-002',
      mentorId: 'm-naval',
      tokenHash: 'hashed-token',
      purpose: 'mentor_request',
      response: 'declined',
      respondedAt: '2026-03-19T09:30:00.000Z',
      responseReason: 'Capacity is full this week.',
      expiresAt: '2026-03-26T09:30:00.000Z',
    })
  })
})
