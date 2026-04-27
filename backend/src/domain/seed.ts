import { initialPlatformData } from '../../../src/data/platformData.js'
import type {
  Artifact,
  AuditEvent,
  Cohort,
  Meeting,
  MentorProfile,
  MentorTolerance,
  MentorVisibility,
  MentorRequest,
  MentorRequestShortlist,
  Organization,
  RequestStatus,
  User,
  Venture,
  VentureMembership,
} from './types'

export const createSeedState = () => {
  const organization: Organization = {
    id: 'org-mentorme',
    name: 'MentorMe',
    slug: 'mentorme',
  }

  const cohort: Cohort = {
    id: 'cohort-2026',
    organizationId: organization.id,
    name: initialPlatformData.venture.cohort,
  }

  const users: User[] = [
    {
      id: 'user-founder-aarav',
      organizationId: organization.id,
      cohortId: cohort.id,
      email: 'aarav.sharma@mentorme.test',
      name: 'Aarav Sharma',
      role: 'founder',
    },
    {
      id: 'user-student-ria',
      organizationId: organization.id,
      cohortId: cohort.id,
      email: 'ria.student@mentorme.test',
      name: 'Ria Student',
      role: 'student',
    },
    {
      id: 'user-cfe-ritu',
      organizationId: organization.id,
      cohortId: cohort.id,
      email: 'ritu.cfe@mentorme.test',
      name: 'Ritu from CFE',
      role: 'cfe',
    },
    {
      id: 'user-cfe-neha',
      organizationId: organization.id,
      cohortId: cohort.id,
      email: 'neha.cfe@mentorme.test',
      name: 'Neha from CFE',
      role: 'cfe',
    },
    {
      id: 'user-mentor-radhika',
      organizationId: organization.id,
      cohortId: cohort.id,
      email: 'radhika@mentorme.test',
      name: 'Dr. Radhika Menon',
      role: 'mentor',
    },
  ]

  const ventures: Venture[] = [
    {
      id: 'v-ecodrone',
      organizationId: organization.id,
      cohortId: cohort.id,
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
      organizationId: organization.id,
      cohortId: cohort.id,
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
      organizationId: organization.id,
      cohortId: cohort.id,
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
      organizationId: organization.id,
      cohortId: cohort.id,
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
  ]

  const ventureMemberships: VentureMembership[] = [
    {
      id: 'vm-001',
      organizationId: organization.id,
      ventureId: 'v-ecodrone',
      userId: 'user-founder-aarav',
      role: 'founder',
    },
    {
      id: 'vm-002',
      organizationId: organization.id,
      ventureId: 'v-ecodrone',
      userId: 'user-student-ria',
      role: 'student',
    },
  ]

  const mentors: MentorProfile[] = initialPlatformData.mentors.map((mentor) => ({
    id: mentor.id,
    organizationId: organization.id,
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
  }))

  const cfeUserByName = new Map(users.filter((user) => user.role === 'cfe').map((user) => [user.name, user.id]))
  const ventureByName = new Map(ventures.map((venture) => [venture.name, venture.id]))

  const requests: MentorRequest[] = initialPlatformData.requests.map((request) => ({
    id: request.id,
    organizationId: organization.id,
    ventureId: ventureByName.get(request.ventureName) || 'v-ecodrone',
    founderUserId: request.ventureName === initialPlatformData.venture.name ? 'user-founder-aarav' : 'user-founder-aarav',
    cfeOwnerId: request.cfeOwner ? cfeUserByName.get(request.cfeOwner) : undefined,
    mentorId: request.mentorId,
    stage: request.stage,
    trl: request.trl,
    brl: request.brl,
    status: request.status as RequestStatus,
    challenge: request.challenge,
    desiredOutcome: request.desiredOutcome,
    mentorNotes: request.mentorNotes,
    createdAt: request.createdAt,
    updatedAt: request.createdAt,
    submittedAt: request.createdAt,
    meetingAt: request.meetingAt || undefined,
    calendlyLink: request.calendlyLink || undefined,
  }))

  const shortlists: MentorRequestShortlist[] = initialPlatformData.requests
    .filter((request) => request.mentorId)
    .map((request, index) => ({
      id: `mrs-${String(index + 1).padStart(3, '0')}`,
      requestId: request.id,
      mentorId: request.mentorId,
      rank: 1,
    }))

  const artifacts: Artifact[] = initialPlatformData.requests.flatMap((request, requestIndex) =>
    request.artifactList.map((artifact, artifactIndex) => ({
      id: `art-${String(requestIndex + 1).padStart(2, '0')}${String(artifactIndex + 1).padStart(2, '0')}`,
      organizationId: organization.id,
      requestId: request.id,
      uploaderUserId: 'user-founder-aarav',
      filename: artifact,
      contentType: 'application/octet-stream',
      sizeBytes: 1024,
      storageKey: `${request.id}/${artifact.toLowerCase().replace(/\s+/g, '-')}`,
      status: 'uploaded',
      uploadUrl: `https://storage.mentorme.test/${request.id}/${artifact.toLowerCase().replace(/\s+/g, '-')}`,
      createdAt: request.createdAt,
      completedAt: request.createdAt,
    })),
  )

  const meetings: Meeting[] = initialPlatformData.requests
    .filter((request) => request.meetingAt && request.mentorId)
    .map((request, index) => ({
      id: `meet-${String(index + 1).padStart(3, '0')}`,
      organizationId: organization.id,
      requestId: request.id,
      mentorId: request.mentorId,
      provider: request.calendlyLink ? 'calendly' : 'manual',
      scheduledAt: request.meetingAt,
      joinLink: request.calendlyLink || '',
      status: 'scheduled',
    }))

  const auditEvents: AuditEvent[] = []

  return {
    organization,
    cohort,
    users,
    ventures,
    ventureMemberships,
    mentors,
    requests,
    shortlists,
    artifacts,
    meetings,
    auditEvents,
  }
}
