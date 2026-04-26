import { Prisma, PrismaClient } from '@prisma/client'
import type { PlatformRepository } from '../domain/interfaces'
import type {
  AiRun,
  AiRunFeedback,
  Artifact,
  AuditEvent,
  ExternalActionToken,
  Invitation,
  MagicLinkTokenRecord,
  Meeting,
  MeetingFeedback,
  MentorProfile,
  MentorRequest,
  MentorRequestShortlist,
  OAuthAccount,
  OAuthProvider,
  OutboxEvent,
  PasswordResetTokenRecord,
  SessionRecord,
  User,
  Venture,
  VentureMembership,
  WebhookReceipt,
} from '../domain/types'

const toIso = (value?: Date | null) => value?.toISOString()

const toInputJsonValue = (value: Record<string, unknown>) => value as Prisma.InputJsonValue

const toNullableInputJsonValue = (value?: Record<string, unknown>) =>
  value ? toInputJsonValue(value) : Prisma.JsonNull

const toRecord = (value: Prisma.JsonValue | null): Record<string, unknown> => {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {}
  }

  return value as Record<string, unknown>
}

const toUser = (user: {
  id: string
  organizationId: string
  cohortId: string | null
  email: string
  name: string
  role: string
  passwordHash: string | null
  emailVerified: boolean
  emailVerifiedAt: Date | null
  lastLoginAt: Date | null
  onboardedAt: Date | null
}): User => ({
  id: user.id,
  organizationId: user.organizationId,
  cohortId: user.cohortId || undefined,
  email: user.email,
  name: user.name,
  role: user.role as User['role'],
  passwordHash: user.passwordHash || undefined,
  emailVerified: user.emailVerified,
  emailVerifiedAt: toIso(user.emailVerifiedAt),
  lastLoginAt: toIso(user.lastLoginAt),
  onboardedAt: toIso(user.onboardedAt),
})

const toOAuthAccount = (account: {
  id: string
  userId: string
  provider: string
  providerAccountId: string
  email: string | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: Date | null
}): OAuthAccount => ({
  id: account.id,
  userId: account.userId,
  provider: account.provider as OAuthProvider,
  providerAccountId: account.providerAccountId,
  email: account.email || undefined,
  accessToken: account.accessToken || undefined,
  refreshToken: account.refreshToken || undefined,
  expiresAt: toIso(account.expiresAt),
})

const toPasswordResetToken = (token: {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  consumedAt: Date | null
}): PasswordResetTokenRecord => ({
  id: token.id,
  userId: token.userId,
  tokenHash: token.tokenHash,
  expiresAt: token.expiresAt.toISOString(),
  consumedAt: toIso(token.consumedAt),
})

const toInvitation = (invitation: {
  id: string
  organizationId: string
  cohortId: string | null
  ventureId: string | null
  email: string
  role: string
  tokenHash: string
  status: string
  message: string | null
  expiresAt: Date
  createdById: string
  acceptedById: string | null
  acceptedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): Invitation => ({
  id: invitation.id,
  organizationId: invitation.organizationId,
  cohortId: invitation.cohortId || undefined,
  ventureId: invitation.ventureId || undefined,
  email: invitation.email,
  role: invitation.role as Invitation['role'],
  tokenHash: invitation.tokenHash,
  status: invitation.status as Invitation['status'],
  message: invitation.message || undefined,
  expiresAt: invitation.expiresAt.toISOString(),
  createdById: invitation.createdById,
  acceptedById: invitation.acceptedById || undefined,
  acceptedAt: toIso(invitation.acceptedAt),
  revokedAt: toIso(invitation.revokedAt),
  createdAt: invitation.createdAt.toISOString(),
  updatedAt: invitation.updatedAt.toISOString(),
})

const toVenture = (venture: {
  id: string
  organizationId: string
  cohortId: string
  name: string
  founderName: string
  domain: string
  stage: string
  trl: number
  brl: number
  location: string
  summary: string
  nextMilestone: string
  programNote: string
}): Venture => ({
  id: venture.id,
  organizationId: venture.organizationId,
  cohortId: venture.cohortId,
  name: venture.name,
  founderName: venture.founderName,
  domain: venture.domain,
  stage: venture.stage,
  trl: venture.trl,
  brl: venture.brl,
  location: venture.location,
  summary: venture.summary,
  nextMilestone: venture.nextMilestone,
  programNote: venture.programNote,
})

const toMembership = (membership: {
  id: string
  organizationId: string
  ventureId: string
  userId: string
  role: string
}): VentureMembership => ({
  id: membership.id,
  organizationId: membership.organizationId,
  ventureId: membership.ventureId,
  userId: membership.userId,
  role: membership.role as VentureMembership['role'],
})

const toMentor = (mentor: {
  id: string
  organizationId: string
  name: string
  email: string
  title: string
  location: string
  focus: string[]
  stages: string[]
  domains: string[]
  tolerance: string
  monthlyLimit: number
  visibility: string
  responseWindow: string
  calendlyUrl: string
  bio: string
}): MentorProfile => ({
  id: mentor.id,
  organizationId: mentor.organizationId,
  name: mentor.name,
  email: mentor.email,
  title: mentor.title,
  location: mentor.location,
  focus: mentor.focus,
  stages: mentor.stages,
  domains: mentor.domains,
  tolerance: mentor.tolerance as MentorProfile['tolerance'],
  monthlyLimit: mentor.monthlyLimit,
  visibility: mentor.visibility as MentorProfile['visibility'],
  responseWindow: mentor.responseWindow,
  calendlyUrl: mentor.calendlyUrl,
  bio: mentor.bio,
})

const toRequest = (request: {
  id: string
  organizationId: string
  ventureId: string
  founderUserId: string
  cfeOwnerId: string | null
  mentorId: string | null
  stage: string
  trl: number
  brl: number
  status: string
  challenge: string
  desiredOutcome: string
  mentorNotes: string
  createdAt: Date
  updatedAt: Date
  submittedAt: Date | null
  meetingAt: Date | null
  calendlyLink: string | null
}): MentorRequest => ({
  id: request.id,
  organizationId: request.organizationId,
  ventureId: request.ventureId,
  founderUserId: request.founderUserId,
  cfeOwnerId: request.cfeOwnerId || undefined,
  mentorId: request.mentorId || undefined,
  stage: request.stage,
  trl: request.trl,
  brl: request.brl,
  status: request.status as MentorRequest['status'],
  challenge: request.challenge,
  desiredOutcome: request.desiredOutcome,
  mentorNotes: request.mentorNotes,
  createdAt: request.createdAt.toISOString(),
  updatedAt: request.updatedAt.toISOString(),
  submittedAt: toIso(request.submittedAt),
  meetingAt: toIso(request.meetingAt),
  calendlyLink: request.calendlyLink || undefined,
})

const toShortlist = (shortlist: {
  id: string
  requestId: string
  mentorId: string
  rank: number
}): MentorRequestShortlist => ({
  id: shortlist.id,
  requestId: shortlist.requestId,
  mentorId: shortlist.mentorId,
  rank: shortlist.rank,
})

const toArtifact = (artifact: {
  id: string
  organizationId: string
  requestId: string
  uploaderUserId: string
  filename: string
  contentType: string
  sizeBytes: number
  storageKey: string
  status: string
  uploadUrl: string
  createdAt: Date
  completedAt: Date | null
}): Artifact => ({
  id: artifact.id,
  organizationId: artifact.organizationId,
  requestId: artifact.requestId,
  uploaderUserId: artifact.uploaderUserId,
  filename: artifact.filename,
  contentType: artifact.contentType,
  sizeBytes: artifact.sizeBytes,
  storageKey: artifact.storageKey,
  status: artifact.status as Artifact['status'],
  uploadUrl: artifact.uploadUrl,
  createdAt: artifact.createdAt.toISOString(),
  completedAt: toIso(artifact.completedAt),
})

const toMeeting = (meeting: {
  id: string
  organizationId: string
  requestId: string
  mentorId: string
  provider: string
  providerEventId: string | null
  scheduledAt: Date
  joinLink: string
  status: string
}): Meeting => ({
  id: meeting.id,
  organizationId: meeting.organizationId,
  requestId: meeting.requestId,
  mentorId: meeting.mentorId,
  provider: meeting.provider as Meeting['provider'],
  providerEventId: meeting.providerEventId || undefined,
  scheduledAt: meeting.scheduledAt.toISOString(),
  joinLink: meeting.joinLink,
  status: meeting.status as Meeting['status'],
})

const toFeedback = (feedback: {
  id: string
  organizationId: string
  requestId: string
  meetingId: string
  mentorId: string
  mentorNotes: string
  nextStepRequired: boolean
  secondSessionRecommended: boolean
  createdAt: Date
}): MeetingFeedback => ({
  id: feedback.id,
  organizationId: feedback.organizationId,
  requestId: feedback.requestId,
  meetingId: feedback.meetingId,
  mentorId: feedback.mentorId,
  mentorNotes: feedback.mentorNotes,
  nextStepRequired: feedback.nextStepRequired,
  secondSessionRecommended: feedback.secondSessionRecommended,
  createdAt: feedback.createdAt.toISOString(),
})

const toMagicLink = (token: {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  consumedAt: Date | null
}): MagicLinkTokenRecord => ({
  id: token.id,
  userId: token.userId,
  tokenHash: token.tokenHash,
  expiresAt: token.expiresAt.toISOString(),
  consumedAt: toIso(token.consumedAt),
})

const toSession = (session: {
  id: string
  userId: string
  refreshTokenHash: string
  expiresAt: Date
  revokedAt: Date | null
}): SessionRecord => ({
  id: session.id,
  userId: session.userId,
  refreshTokenHash: session.refreshTokenHash,
  expiresAt: session.expiresAt.toISOString(),
  revokedAt: toIso(session.revokedAt),
})

const toExternalActionToken = (token: {
  id: string
  requestId: string
  mentorId: string
  tokenHash: string
  purpose: string
  response: string | null
  respondedAt: Date | null
  responseReason: string | null
  expiresAt: Date
}): ExternalActionToken => ({
  id: token.id,
  requestId: token.requestId,
  mentorId: token.mentorId,
  tokenHash: token.tokenHash,
  purpose: token.purpose as ExternalActionToken['purpose'],
  response: token.response as ExternalActionToken['response'],
  respondedAt: toIso(token.respondedAt),
  responseReason: token.responseReason || undefined,
  expiresAt: token.expiresAt.toISOString(),
})

const toAuditEvent = (event: {
  id: string
  organizationId: string
  actorType: string
  actorUserId: string | null
  actorEmail: string | null
  entityType: string
  entityId: string
  action: string
  fromStatus: string | null
  toStatus: string | null
  payload: Prisma.JsonValue
  createdAt: Date
}): AuditEvent => ({
  id: event.id,
  organizationId: event.organizationId,
  actorType: event.actorType as AuditEvent['actorType'],
  actorUserId: event.actorUserId || undefined,
  actorEmail: event.actorEmail || undefined,
  entityType: event.entityType as AuditEvent['entityType'],
  entityId: event.entityId,
  action: event.action,
  fromStatus: event.fromStatus || undefined,
  toStatus: event.toStatus || undefined,
  payload: toRecord(event.payload),
  createdAt: event.createdAt.toISOString(),
})

const toWebhookReceipt = (receipt: {
  id: string
  provider: string
  eventId: string
  payload: Prisma.JsonValue
  receivedAt: Date
  processedAt: Date | null
}): WebhookReceipt => ({
  id: receipt.id,
  provider: receipt.provider as WebhookReceipt['provider'],
  eventId: receipt.eventId,
  payload: toRecord(receipt.payload),
  receivedAt: receipt.receivedAt.toISOString(),
  processedAt: toIso(receipt.processedAt),
})

const toOutboxEvent = (event: {
  id: string
  topic: string
  aggregateType: string
  aggregateId: string
  payload: Prisma.JsonValue
  status: string
  createdAt: Date
}): OutboxEvent => ({
  id: event.id,
  topic: event.topic,
  aggregateType: event.aggregateType,
  aggregateId: event.aggregateId,
  payload: toRecord(event.payload),
  status: event.status as OutboxEvent['status'],
  createdAt: event.createdAt.toISOString(),
})

const toAiRun = (run: {
  id: string
  organizationId: string
  userId: string
  task: string
  provider: string
  requestedProvider: string
  model: string
  promptVersion: string
  inputPayload: Prisma.JsonValue
  outputPayload: Prisma.JsonValue | null
  confidence: number
  shouldAbstain: boolean
  caveats: string[]
  latencyMs: number
  attemptCount: number
  fallbackUsed: boolean
  usageInputTokens: number
  usageOutputTokens: number
  usageTotalTokens: number
  finishReason: string
  status: string
  errorMessage: string | null
  createdAt: Date
}): AiRun => ({
  id: run.id,
  organizationId: run.organizationId,
  userId: run.userId,
  task: run.task as AiRun['task'],
  provider: run.provider as AiRun['provider'],
  requestedProvider: run.requestedProvider as AiRun['requestedProvider'],
  model: run.model,
  promptVersion: run.promptVersion,
  inputPayload: toRecord(run.inputPayload),
  outputPayload: run.outputPayload ? toRecord(run.outputPayload) : undefined,
  confidence: run.confidence,
  shouldAbstain: run.shouldAbstain,
  caveats: run.caveats,
  latencyMs: run.latencyMs,
  attemptCount: run.attemptCount,
  fallbackUsed: run.fallbackUsed,
  usageInputTokens: run.usageInputTokens,
  usageOutputTokens: run.usageOutputTokens,
  usageTotalTokens: run.usageTotalTokens,
  finishReason: run.finishReason,
  status: run.status as AiRun['status'],
  errorMessage: run.errorMessage || undefined,
  createdAt: run.createdAt.toISOString(),
})

const toAiRunFeedback = (feedback: {
  id: string
  aiRunId: string
  organizationId: string
  userId: string
  rating: string
  outcome: string
  notes: string | null
  editedOutput: Prisma.JsonValue | null
  createdAt: Date
}): AiRunFeedback => ({
  id: feedback.id,
  aiRunId: feedback.aiRunId,
  organizationId: feedback.organizationId,
  userId: feedback.userId,
  rating: feedback.rating as AiRunFeedback['rating'],
  outcome: feedback.outcome as AiRunFeedback['outcome'],
  notes: feedback.notes || undefined,
  editedOutput: feedback.editedOutput ? toRecord(feedback.editedOutput) : undefined,
  createdAt: feedback.createdAt.toISOString(),
})

class PrismaPlatformRepository implements PlatformRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listUsers() {
    return (await this.prisma.user.findMany({ orderBy: { createdAt: 'asc' } })).map(toUser)
  }

  async findUserByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    })

    return user ? toUser(user) : undefined
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    return user ? toUser(user) : undefined
  }

  async saveUser(user: User) {
    const data = {
      organizationId: user.organizationId,
      cohortId: user.cohortId ?? null,
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash: user.passwordHash ?? null,
      emailVerified: user.emailVerified ?? false,
      emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
      lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
      onboardedAt: user.onboardedAt ? new Date(user.onboardedAt) : null,
    }
    const saved = await this.prisma.user.upsert({
      where: { id: user.id },
      update: data,
      create: { id: user.id, ...data },
    })
    return toUser(saved)
  }

  async findOAuthAccount(provider: OAuthProvider, providerAccountId: string) {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
    })
    return account ? toOAuthAccount(account) : undefined
  }

  async saveOAuthAccount(account: OAuthAccount) {
    const data = {
      userId: account.userId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      email: account.email ?? null,
      accessToken: account.accessToken ?? null,
      refreshToken: account.refreshToken ?? null,
      expiresAt: account.expiresAt ? new Date(account.expiresAt) : null,
    }
    const saved = await this.prisma.oAuthAccount.upsert({
      where: { id: account.id },
      update: data,
      create: { id: account.id, ...data },
    })
    return toOAuthAccount(saved)
  }

  async savePasswordResetToken(token: PasswordResetTokenRecord) {
    const data = {
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: new Date(token.expiresAt),
      consumedAt: token.consumedAt ? new Date(token.consumedAt) : null,
    }
    const saved = await this.prisma.passwordResetToken.upsert({
      where: { id: token.id },
      update: data,
      create: { id: token.id, ...data },
    })
    return toPasswordResetToken(saved)
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })
    return token ? toPasswordResetToken(token) : undefined
  }

  async markPasswordResetTokenConsumed(id: string, consumedAt: string) {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { consumedAt: new Date(consumedAt) },
    })
  }

  async listVentures() {
    return (await this.prisma.venture.findMany({ orderBy: { name: 'asc' } })).map(toVenture)
  }

  async findVentureById(id: string) {
    const venture = await this.prisma.venture.findUnique({ where: { id } })
    return venture ? toVenture(venture) : undefined
  }

  async saveVenture(venture: Venture) {
    const { id, ...rest } = venture
    const data = {
      organizationId: rest.organizationId,
      cohortId: rest.cohortId,
      name: rest.name,
      founderName: rest.founderName,
      domain: rest.domain,
      stage: rest.stage,
      trl: rest.trl,
      brl: rest.brl,
      location: rest.location,
      summary: rest.summary,
      nextMilestone: rest.nextMilestone,
      programNote: rest.programNote,
    }
    const saved = await this.prisma.venture.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toVenture(saved)
  }

  async listMemberships() {
    return (await this.prisma.ventureMembership.findMany({ orderBy: { id: 'asc' } })).map(toMembership)
  }

  async saveMembership(membership: VentureMembership) {
    const { id, ...rest } = membership
    const data = {
      organizationId: rest.organizationId,
      ventureId: rest.ventureId,
      userId: rest.userId,
      role: rest.role,
    }
    const saved = await this.prisma.ventureMembership.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toMembership(saved)
  }

  async listMentors() {
    return (await this.prisma.mentorProfile.findMany({ orderBy: { name: 'asc' } })).map(toMentor)
  }

  async findMentorById(id: string) {
    const mentor = await this.prisma.mentorProfile.findUnique({ where: { id } })
    return mentor ? toMentor(mentor) : undefined
  }

  async saveMentor(mentor: MentorProfile) {
    const { id, ...data } = mentor
    const saved = await this.prisma.mentorProfile.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toMentor(saved)
  }

  async listRequests() {
    return (await this.prisma.mentorRequest.findMany({ orderBy: { createdAt: 'desc' } })).map(toRequest)
  }

  async findRequestById(id: string) {
    const request = await this.prisma.mentorRequest.findUnique({ where: { id } })
    return request ? toRequest(request) : undefined
  }

  async saveRequest(request: MentorRequest) {
    const { id, ...rest } = request
    const data = {
      organizationId: rest.organizationId,
      ventureId: rest.ventureId,
      founderUserId: rest.founderUserId,
      cfeOwnerId: rest.cfeOwnerId ?? null,
      mentorId: rest.mentorId ?? null,
      stage: rest.stage,
      trl: rest.trl,
      brl: rest.brl,
      status: rest.status,
      challenge: rest.challenge,
      desiredOutcome: rest.desiredOutcome,
      mentorNotes: rest.mentorNotes,
      createdAt: new Date(rest.createdAt),
      updatedAt: new Date(rest.updatedAt),
      submittedAt: rest.submittedAt ? new Date(rest.submittedAt) : null,
      meetingAt: rest.meetingAt ? new Date(rest.meetingAt) : null,
      calendlyLink: rest.calendlyLink ?? null,
    }
    const saved = await this.prisma.mentorRequest.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toRequest(saved)
  }

  async listShortlistsForRequest(requestId: string) {
    return (await this.prisma.mentorRequestShortlist.findMany({
      where: { requestId },
      orderBy: { rank: 'asc' },
    })).map(toShortlist)
  }

  async replaceShortlistsForRequest(requestId: string, shortlists: MentorRequestShortlist[]) {
    if (shortlists.length === 0) {
      await this.prisma.mentorRequestShortlist.deleteMany({ where: { requestId } })
      return
    }

    await this.prisma.$transaction([
      this.prisma.mentorRequestShortlist.deleteMany({ where: { requestId } }),
      this.prisma.mentorRequestShortlist.createMany({
        data: shortlists,
      }),
    ])
  }

  async listArtifactsForRequest(requestId: string) {
    return (await this.prisma.artifact.findMany({
      where: { requestId },
      orderBy: { id: 'asc' },
    })).map(toArtifact)
  }

  async findArtifactById(id: string) {
    const artifact = await this.prisma.artifact.findUnique({ where: { id } })
    return artifact ? toArtifact(artifact) : undefined
  }

  async saveArtifact(artifact: Artifact) {
    const { id, ...rest } = artifact
    const data = {
      organizationId: rest.organizationId,
      requestId: rest.requestId,
      uploaderUserId: rest.uploaderUserId,
      filename: rest.filename,
      contentType: rest.contentType,
      sizeBytes: rest.sizeBytes,
      storageKey: rest.storageKey,
      status: rest.status,
      uploadUrl: rest.uploadUrl,
      createdAt: new Date(rest.createdAt),
      completedAt: rest.completedAt ? new Date(rest.completedAt) : null,
    }
    const saved = await this.prisma.artifact.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toArtifact(saved)
  }

  async listMeetingsForRequest(requestId: string) {
    return (await this.prisma.meeting.findMany({
      where: { requestId },
      orderBy: { scheduledAt: 'asc' },
    })).map(toMeeting)
  }

  async saveMeeting(meeting: Meeting) {
    const { id, ...rest } = meeting
    const data = {
      organizationId: rest.organizationId,
      requestId: rest.requestId,
      mentorId: rest.mentorId,
      provider: rest.provider,
      providerEventId: rest.providerEventId ?? null,
      scheduledAt: new Date(rest.scheduledAt),
      joinLink: rest.joinLink,
      status: rest.status,
    }
    const saved = await this.prisma.meeting.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toMeeting(saved)
  }

  async saveFeedback(feedback: MeetingFeedback) {
    const { id, ...rest } = feedback
    const data = {
      organizationId: rest.organizationId,
      requestId: rest.requestId,
      meetingId: rest.meetingId,
      mentorId: rest.mentorId,
      mentorNotes: rest.mentorNotes,
      nextStepRequired: rest.nextStepRequired,
      secondSessionRecommended: rest.secondSessionRecommended,
      createdAt: new Date(rest.createdAt),
    }
    const saved = await this.prisma.meetingFeedback.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toFeedback(saved)
  }

  async listMagicLinks() {
    return (await this.prisma.magicLinkToken.findMany({
      orderBy: { createdAt: 'desc' },
    })).map(toMagicLink)
  }

  async saveMagicLink(token: MagicLinkTokenRecord) {
    const { id, ...rest } = token
    const data = {
      userId: rest.userId,
      tokenHash: rest.tokenHash,
      expiresAt: new Date(rest.expiresAt),
      consumedAt: rest.consumedAt ? new Date(rest.consumedAt) : null,
    }
    const saved = await this.prisma.magicLinkToken.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toMagicLink(saved)
  }

  async saveSession(session: SessionRecord) {
    const { id, ...rest } = session
    const data = {
      userId: rest.userId,
      refreshTokenHash: rest.refreshTokenHash,
      expiresAt: new Date(rest.expiresAt),
      revokedAt: rest.revokedAt ? new Date(rest.revokedAt) : null,
    }
    const saved = await this.prisma.session.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toSession(saved)
  }

  async findSessionByHash(refreshTokenHash: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
    })
    return session ? toSession(session) : undefined
  }

  async revokeSession(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllSessionsForUser(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async saveExternalActionToken(token: ExternalActionToken) {
    const { id, ...rest } = token
    const data = {
      requestId: rest.requestId,
      mentorId: rest.mentorId,
      tokenHash: rest.tokenHash,
      purpose: rest.purpose,
      response: rest.response ?? null,
      respondedAt: rest.respondedAt ? new Date(rest.respondedAt) : null,
      responseReason: rest.responseReason ?? null,
      expiresAt: new Date(rest.expiresAt),
    }
    const saved = await this.prisma.externalActionToken.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toExternalActionToken(saved)
  }

  async findExternalActionTokenByHash(tokenHash: string) {
    const token = await this.prisma.externalActionToken.findUnique({
      where: { tokenHash },
    })
    return token ? toExternalActionToken(token) : undefined
  }

  async saveAuditEvent(event: AuditEvent) {
    const { id, ...rest } = event
    const data = {
      organizationId: rest.organizationId,
      actorType: rest.actorType,
      actorUserId: rest.actorUserId ?? null,
      actorEmail: rest.actorEmail ?? null,
      entityType: rest.entityType,
      entityId: rest.entityId,
      action: rest.action,
      fromStatus: rest.fromStatus ?? null,
      toStatus: rest.toStatus ?? null,
      payload: toInputJsonValue(rest.payload),
      createdAt: new Date(rest.createdAt),
    }
    const saved = await this.prisma.auditEvent.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toAuditEvent(saved)
  }

  async listAuditEventsForEntity(entityType: AuditEvent['entityType'], entityId: string) {
    return (await this.prisma.auditEvent.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    })).map(toAuditEvent)
  }

  async findWebhookReceipt(provider: 'calendly', eventId: string) {
    const receipt = await this.prisma.webhookReceipt.findUnique({
      where: {
        provider_eventId: {
          provider,
          eventId,
        },
      },
    })
    return receipt ? toWebhookReceipt(receipt) : undefined
  }

  async saveWebhookReceipt(receipt: WebhookReceipt) {
    const saved = await this.prisma.webhookReceipt.upsert({
      where: {
        provider_eventId: {
          provider: receipt.provider,
          eventId: receipt.eventId,
        },
      },
      update: {
        payload: toInputJsonValue(receipt.payload),
        receivedAt: new Date(receipt.receivedAt),
        processedAt: receipt.processedAt ? new Date(receipt.processedAt) : null,
      },
      create: {
        id: receipt.id,
        provider: receipt.provider,
        eventId: receipt.eventId,
        payload: toInputJsonValue(receipt.payload),
        receivedAt: new Date(receipt.receivedAt),
        processedAt: receipt.processedAt ? new Date(receipt.processedAt) : null,
      },
    })
    return toWebhookReceipt(saved)
  }

  async saveOutboxEvent(event: OutboxEvent) {
    const { id, ...rest } = event
    const saved = await this.prisma.outboxEvent.upsert({
      where: { id },
      update: {
        topic: rest.topic,
        aggregateType: rest.aggregateType,
        aggregateId: rest.aggregateId,
        payload: toInputJsonValue(rest.payload),
        status: rest.status,
        createdAt: new Date(rest.createdAt),
      },
      create: {
        id,
        topic: rest.topic,
        aggregateType: rest.aggregateType,
        aggregateId: rest.aggregateId,
        payload: toInputJsonValue(rest.payload),
        status: rest.status,
        createdAt: new Date(rest.createdAt),
      },
    })
    return toOutboxEvent(saved)
  }

  async listOutboxEvents() {
    return (await this.prisma.outboxEvent.findMany({
      orderBy: { createdAt: 'asc' },
    })).map(toOutboxEvent)
  }

  async findOutboxEventById(id: string) {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id } })
    return event ? toOutboxEvent(event) : undefined
  }

  async saveAiRun(run: AiRun) {
    const { id, ...rest } = run
    const data = {
      organizationId: rest.organizationId,
      userId: rest.userId,
      task: rest.task,
      provider: rest.provider,
      requestedProvider: rest.requestedProvider,
      model: rest.model,
      promptVersion: rest.promptVersion,
      inputPayload: toInputJsonValue(rest.inputPayload),
      outputPayload: toNullableInputJsonValue(rest.outputPayload),
      confidence: rest.confidence,
      shouldAbstain: rest.shouldAbstain,
      caveats: rest.caveats,
      latencyMs: rest.latencyMs,
      attemptCount: rest.attemptCount,
      fallbackUsed: rest.fallbackUsed,
      usageInputTokens: rest.usageInputTokens,
      usageOutputTokens: rest.usageOutputTokens,
      usageTotalTokens: rest.usageTotalTokens,
      finishReason: rest.finishReason,
      status: rest.status,
      errorMessage: rest.errorMessage ?? null,
      createdAt: new Date(rest.createdAt),
    }
    const saved = await this.prisma.aiRun.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toAiRun(saved)
  }

  async findAiRunById(id: string) {
    const run = await this.prisma.aiRun.findUnique({ where: { id } })
    return run ? toAiRun(run) : undefined
  }

  async saveAiRunFeedback(feedback: AiRunFeedback) {
    const { id, ...rest } = feedback
    const data = {
      organizationId: rest.organizationId,
      userId: rest.userId,
      rating: rest.rating,
      outcome: rest.outcome,
      notes: rest.notes ?? null,
      editedOutput: toNullableInputJsonValue(rest.editedOutput),
      createdAt: new Date(rest.createdAt),
    }
    const saved = await this.prisma.aiRunFeedback.upsert({
      where: {
        aiRunId_userId: {
          aiRunId: rest.aiRunId,
          userId: rest.userId,
        },
      },
      update: data,
      create: {
        id,
        aiRunId: rest.aiRunId,
        ...data,
      },
    })
    return toAiRunFeedback(saved)
  }

  async saveInvitation(invitation: Invitation) {
    const { id, ...rest } = invitation
    const data = {
      organizationId: rest.organizationId,
      cohortId: rest.cohortId ?? null,
      ventureId: rest.ventureId ?? null,
      email: rest.email,
      role: rest.role,
      tokenHash: rest.tokenHash,
      status: rest.status,
      message: rest.message ?? null,
      expiresAt: new Date(rest.expiresAt),
      createdById: rest.createdById,
      acceptedById: rest.acceptedById ?? null,
      acceptedAt: rest.acceptedAt ? new Date(rest.acceptedAt) : null,
      revokedAt: rest.revokedAt ? new Date(rest.revokedAt) : null,
    }
    const saved = await this.prisma.invitation.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    return toInvitation(saved)
  }

  async findInvitationById(id: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } })
    return invitation ? toInvitation(invitation) : undefined
  }

  async findInvitationByHash(tokenHash: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash } })
    return invitation ? toInvitation(invitation) : undefined
  }

  async listInvitationsByOrganization(organizationId: string) {
    return (await this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })).map(toInvitation)
  }

  async findPendingInvitationByEmail(organizationId: string, email: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email: { equals: email, mode: 'insensitive' },
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    })
    return invitation ? toInvitation(invitation) : undefined
  }
}

export const createPrismaPlatformRepository = (prisma: PrismaClient) => new PrismaPlatformRepository(prisma)
