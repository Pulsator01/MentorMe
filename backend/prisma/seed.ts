import { PrismaClient } from '@prisma/client'
import type { MentorTolerance, MentorVisibility, RequestStatus } from '@prisma/client'
import { initialPlatformData } from '../../src/data/platformData.js'

const prisma = new PrismaClient()

async function main() {
  await prisma.$transaction([
    prisma.auditEvent.deleteMany(),
    prisma.scheduledNudge.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.externalActionToken.deleteMany(),
    prisma.magicLinkToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.meetingFeedback.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.artifact.deleteMany(),
    prisma.mentorRequestShortlist.deleteMany(),
    prisma.mentorRequest.deleteMany(),
    prisma.mentorCapacitySnapshot.deleteMany(),
    prisma.mentorProfile.deleteMany(),
    prisma.ventureMembership.deleteMany(),
    prisma.venture.deleteMany(),
    prisma.user.deleteMany(),
    prisma.cohort.deleteMany(),
    prisma.organization.deleteMany(),
  ])

  await prisma.organization.create({
    data: {
      id: 'org-mentorme',
      name: 'MentorMe',
      slug: 'mentorme',
      cohorts: {
        create: {
          id: 'cohort-2026',
          name: initialPlatformData.venture.cohort,
        },
      },
    },
  })

  await prisma.user.createMany({
    data: [
      {
        id: 'user-founder-aarav',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        email: 'aarav.sharma@mentorme.test',
        name: 'Aarav Sharma',
        role: 'founder',
      },
      {
        id: 'user-student-ria',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        email: 'ria.student@mentorme.test',
        name: 'Ria Student',
        role: 'student',
      },
      {
        id: 'user-cfe-ritu',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        email: 'ritu.cfe@mentorme.test',
        name: 'Ritu from CFE',
        role: 'cfe',
      },
      {
        id: 'user-cfe-neha',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        email: 'neha.cfe@mentorme.test',
        name: 'Neha from CFE',
        role: 'cfe',
      },
    ],
  })

  await prisma.venture.createMany({
    data: [
      {
        id: 'v-ecodrone',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        name: initialPlatformData.venture.name,
        founderName: initialPlatformData.venture.founder,
        domain: initialPlatformData.venture.domain,
        stage: initialPlatformData.venture.stage,
        trl: initialPlatformData.venture.trl,
        brl: initialPlatformData.venture.brl,
        location: initialPlatformData.venture.location,
        summary: initialPlatformData.venture.summary,
        nextMilestone: initialPlatformData.venture.nextMilestone,
        programNote: initialPlatformData.venture.programNote,
      },
      {
        id: 'v-medimesh',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        name: 'MediMesh Labs',
        founderName: 'Sara Khan',
        domain: 'Medical sensors',
        stage: 'TRL 3+',
        trl: 3,
        brl: 2,
        location: 'Delhi, India',
        summary: 'Clinical sensor platform for early pilot readiness.',
        nextMilestone: 'Validate prototype robustness for hospital pilot.',
        programNote: initialPlatformData.venture.programNote,
      },
      {
        id: 'v-farmsphere',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        name: 'FarmSphere',
        founderName: 'Dev Mehta',
        domain: 'Agritech',
        stage: 'Pilot',
        trl: 6,
        brl: 5,
        location: 'Punjab, India',
        summary: 'Public-sector-oriented pilot platform for agriculture programs.',
        nextMilestone: 'Secure district partnership validation.',
        programNote: initialPlatformData.venture.programNote,
      },
      {
        id: 'v-voltgrid',
        organizationId: 'org-mentorme',
        cohortId: 'cohort-2026',
        name: 'VoltGrid AI',
        founderName: 'Rahul Nair',
        domain: 'Energy SaaS',
        stage: 'Scale',
        trl: 8,
        brl: 7,
        location: 'Bengaluru, India',
        summary: 'Grid intelligence expansion workflow.',
        nextMilestone: 'Expand to two international markets.',
        programNote: initialPlatformData.venture.programNote,
      },
    ],
  })

  await prisma.ventureMembership.createMany({
    data: [
      {
        id: 'vm-001',
        organizationId: 'org-mentorme',
        ventureId: 'v-ecodrone',
        userId: 'user-founder-aarav',
        role: 'founder',
      },
      {
        id: 'vm-002',
        organizationId: 'org-mentorme',
        ventureId: 'v-ecodrone',
        userId: 'user-student-ria',
        role: 'student',
      },
    ],
  })

  await prisma.mentorProfile.createMany({
    data: initialPlatformData.mentors.map((mentor) => ({
      id: mentor.id,
      organizationId: 'org-mentorme',
      name: mentor.name,
      email: `${mentor.id.replace('m-', '')}@mentorme.test`,
      title: mentor.title,
      location: mentor.location,
      focus: mentor.focus,
      stages: mentor.stages,
      domains: mentor.domains,
      tolerance: mentor.tolerance as MentorTolerance,
      monthlyLimit: mentor.monthlyLimit,
      visibility: mentor.visibility as MentorVisibility,
      responseWindow: mentor.responseWindow,
      calendlyUrl: mentor.calendly,
      bio: mentor.bio,
    })),
  })

  const ventureIdByName: Record<string, string> = {
    'EcoDrone Systems': 'v-ecodrone',
    'MediMesh Labs': 'v-medimesh',
    FarmSphere: 'v-farmsphere',
    'VoltGrid AI': 'v-voltgrid',
  } as const

  await prisma.mentorRequest.createMany({
    data: initialPlatformData.requests.map((request) => ({
      id: request.id,
      organizationId: 'org-mentorme',
      ventureId: ventureIdByName[request.ventureName],
      founderUserId: 'user-founder-aarav',
      mentorId: request.mentorId || null,
      stage: request.stage,
      trl: request.trl,
      brl: request.brl,
      status: request.status as RequestStatus,
      challenge: request.challenge,
      desiredOutcome: request.desiredOutcome,
      mentorNotes: request.mentorNotes || '',
      createdAt: new Date(request.createdAt),
      updatedAt: new Date(request.createdAt),
      submittedAt: new Date(request.createdAt),
      meetingAt: request.meetingAt ? new Date(request.meetingAt) : null,
      calendlyLink: request.calendlyLink || null,
    })),
  })

  await prisma.mentorRequestShortlist.createMany({
    data: initialPlatformData.requests
      .filter((request) => request.mentorId)
      .map((request, index) => ({
        id: `mrs-${String(index + 1).padStart(3, '0')}`,
        requestId: request.id,
        mentorId: request.mentorId,
        rank: 1,
      })),
  })

  await prisma.artifact.createMany({
    data: initialPlatformData.requests.flatMap((request, requestIndex) =>
      request.artifactList.map((artifact, artifactIndex) => ({
        id: `art-${String(requestIndex + 1).padStart(2, '0')}${String(artifactIndex + 1).padStart(2, '0')}`,
        organizationId: 'org-mentorme',
        requestId: request.id,
        uploaderUserId: 'user-founder-aarav',
        filename: artifact,
        contentType: 'application/octet-stream',
        sizeBytes: 1024,
        storageKey: `${request.id}/${artifact.toLowerCase().replace(/\s+/g, '-')}`,
        status: 'uploaded',
        uploadUrl: `https://storage.mentorme.test/${request.id}/${artifact.toLowerCase().replace(/\s+/g, '-')}`,
        createdAt: new Date(request.createdAt),
        completedAt: new Date(request.createdAt),
      })),
    ),
  })

  await prisma.meeting.createMany({
    data: initialPlatformData.requests
      .filter((request) => request.meetingAt && request.mentorId)
      .map((request, index) => ({
        id: `meet-${String(index + 1).padStart(3, '0')}`,
        organizationId: 'org-mentorme',
        requestId: request.id,
        mentorId: request.mentorId,
        provider: request.calendlyLink ? 'calendly' : 'manual',
        scheduledAt: new Date(request.meetingAt),
        joinLink: request.calendlyLink || '',
        status: 'scheduled',
      })),
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
