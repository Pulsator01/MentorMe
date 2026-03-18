import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import type { EmailGateway, PlatformRepository, QueuePublisher, StorageService } from './interfaces'
import { artifactStorageKey, futureIso, nextPrefixedId, nowIso, randomToken, sha256 } from './id'
import type {
  Artifact,
  AuditEvent,
  MentorProfile,
  MentorRequest,
  RequestView,
  User,
  UserRole,
} from './types'

const requestCreateSchema = z.object({
  stage: z.string().min(1),
  trl: z.number().int().min(1).max(9),
  brl: z.number().int().min(1).max(9),
  challenge: z.string().min(10),
  desiredOutcome: z.string().min(10),
  preferredMentorIds: z.array(z.string()).default([]),
  artifactRefs: z.array(z.string()).default([]),
})

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
})

const scheduleSchema = z.object({
  calendlyLink: z.string().url(),
  meetingAt: z.string().datetime(),
})

const feedbackSchema = z.object({
  mentorNotes: z.string().min(5),
  nextStepRequired: z.boolean(),
  secondSessionRecommended: z.boolean(),
})

const returnSchema = z.object({
  reason: z.string().min(5),
})

const approveSchema = z.object({
  ownerName: z.string().min(2),
})

const mentorRespondSchema = z.object({
  decision: z.enum(['accepted', 'declined']),
  reason: z.string().min(5).optional(),
}).superRefine((value, context) => {
  if (value.decision === 'declined' && !value.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'A decline reason is required',
    })
  }
})

const jwtTextEncoder = new TextEncoder()

type ServiceDeps = {
  repository: PlatformRepository
  email: EmailGateway
  storage: StorageService
  queue: QueuePublisher
  jwtIssuer: string
  jwtAudience: string
  jwtSecret: string
}

export class PlatformService {
  constructor(private readonly deps: ServiceDeps) {}

  async requestMagicLink(email: string) {
    const user = this.deps.repository.findUserByEmail(email)

    if (!user) {
      return { accepted: true }
    }

    const token = randomToken()
    this.deps.repository.saveMagicLink({
      id: `ml-${randomToken().slice(0, 10)}`,
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: futureIso(1),
    })

    await this.deps.email.sendMagicLink({
      email: user.email,
      token,
      name: user.name,
    })

    this.recordOutbox('auth.magic_link_requested', 'auth', user.id, { email: user.email })

    return { accepted: true, token }
  }

  async verifyMagicLink(token: string) {
    const record = this.deps.repository.listMagicLinks().find((item) => item.tokenHash === sha256(token))

    if (!record || record.consumedAt || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid or expired magic link')
    }

    const user = this.requireUser(record.userId)
    this.deps.repository.saveMagicLink({ ...record, consumedAt: nowIso() })

    const refreshToken = randomToken()
    const session = this.deps.repository.saveSession({
      id: `sess-${randomToken().slice(0, 10)}`,
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      expiresAt: futureIso(24 * 30),
    })

    const accessToken = await this.signAccessToken(user)

    this.recordAudit({
      entityType: 'auth',
      entityId: session.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'auth.magic_link_verified',
      payload: {},
    })

    return { accessToken, refreshToken, user }
  }

  async refreshSession(refreshToken: string) {
    const session = this.deps.repository.findSessionByHash(sha256(refreshToken))

    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid session')
    }

    const user = this.requireUser(session.userId)
    const accessToken = await this.signAccessToken(user)
    return { accessToken, user }
  }

  logout(refreshToken: string) {
    const session = this.deps.repository.findSessionByHash(sha256(refreshToken))
    if (session) {
      this.deps.repository.revokeSession(session.id)
    }
  }

  async authenticate(accessToken: string) {
    const verified = await jwtVerify(accessToken, jwtTextEncoder.encode(this.deps.jwtSecret), {
      issuer: this.deps.jwtIssuer,
      audience: this.deps.jwtAudience,
    })
    return this.requireUser(String(verified.payload.sub))
  }

  getMe(user: User) {
    return { user }
  }

  listVentures(user: User) {
    const memberships = this.deps.repository.listMemberships()
    const ventures = this.deps.repository.listVentures()

    if (user.role === 'cfe') {
      return { ventures }
    }

    const ventureIds = memberships.filter((membership) => membership.userId === user.id).map((membership) => membership.ventureId)
    return { ventures: ventures.filter((venture) => ventureIds.includes(venture.id)) }
  }

  getVenture(user: User, ventureId: string) {
    const venture = this.authorizeVentureAccess(user, ventureId)
    return { venture }
  }

  listRequests(user: User) {
    if (user.role === 'cfe') {
      return { requests: this.listRequestViews() }
    }

    const ventureIds = this.deps.repository
      .listMemberships()
      .filter((membership) => membership.userId === user.id)
      .map((membership) => membership.ventureId)

    return {
      requests: this.listRequestViews().filter((request) => ventureIds.includes(request.ventureId)),
    }
  }

  listRequestsForVenture(user: User, ventureId: string) {
    this.authorizeVentureAccess(user, ventureId)
    return {
      requests: this.listRequestViews().filter((request) => request.ventureId === ventureId),
    }
  }

  createRequest(user: User, ventureId: string, input: unknown) {
    if (user.role !== 'founder') {
      throw new Error('Only founders can submit requests')
    }

    const venture = this.authorizeVentureAccess(user, ventureId)
    const payload = requestCreateSchema.parse(input)
    const requestId = nextPrefixedId(
      'REQ',
      this.deps.repository.listRequests().map((request) => request.id),
    )
    const createdAt = nowIso()

    const request: MentorRequest = {
      id: requestId,
      organizationId: venture.organizationId,
      ventureId,
      founderUserId: user.id,
      mentorId: payload.preferredMentorIds[0],
      stage: payload.stage,
      trl: payload.trl,
      brl: payload.brl,
      status: 'cfe_review',
      challenge: payload.challenge,
      desiredOutcome: payload.desiredOutcome,
      mentorNotes: '',
      createdAt,
      updatedAt: createdAt,
      submittedAt: createdAt,
    }

    this.deps.repository.saveRequest(request)
    const reversedArtifactRefs = [...payload.artifactRefs].reverse()
    reversedArtifactRefs.forEach((artifactName, index) => {
      this.deps.repository.saveArtifact({
        id: nextPrefixedId(
          'art',
          this.deps.repository.listArtifactsForRequest(request.id).map((artifact) => artifact.id),
        ),
        organizationId: venture.organizationId,
        requestId: request.id,
        uploaderUserId: user.id,
        filename: artifactName,
        contentType: 'application/octet-stream',
        sizeBytes: 0,
        storageKey: artifactStorageKey(request.id, `${reversedArtifactRefs.length - index}-${artifactName}`),
        status: 'uploaded',
        uploadUrl: '',
        createdAt,
        completedAt: createdAt,
      })
    })
    this.deps.repository.replaceShortlistsForRequest(
      request.id,
      payload.preferredMentorIds.map((mentorId, index) => ({
        id: `mrs-${request.id}-${index + 1}`,
        requestId: request.id,
        mentorId,
        rank: index + 1,
      })),
    )

    this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.submitted',
      toStatus: 'cfe_review',
      payload: { ventureId },
    })
    this.recordOutbox('request.submitted', 'mentor_request', request.id, { ventureId, requestId: request.id })

    return { request: this.requireRequestView(request.id) }
  }

  submitRequest(user: User, requestId: string) {
    if (user.role !== 'founder') {
      throw new Error('Only founders can resubmit requests')
    }

    const request = this.authorizeRequestAccess(user, requestId)

    if (request.founderUserId !== user.id) {
      throw new Error('Forbidden')
    }

    if (!['draft', 'needs_work'].includes(request.status)) {
      throw new Error('Only draft or returned requests can be submitted')
    }

    const next = {
      ...request,
      status: 'cfe_review' as const,
      submittedAt: nowIso(),
      updatedAt: nowIso(),
    }
    this.deps.repository.saveRequest(next)
    this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: request.status === 'draft' ? 'request.submitted' : 'request.resubmitted',
      fromStatus: request.status,
      toStatus: next.status,
      payload: {},
    })
    this.recordOutbox(
      request.status === 'draft' ? 'request.submitted' : 'request.resubmitted',
      'mentor_request',
      request.id,
      { ventureId: request.ventureId, requestId: request.id },
    )

    return { request: this.requireRequestView(request.id) }
  }

  approveRequest(user: User, requestId: string, input: unknown) {
    this.assertRole(user, 'cfe')
    const payload = approveSchema.parse(input)
    const request = this.requireRequest(requestId)
    const next = {
      ...request,
      status: 'awaiting_mentor' as const,
      updatedAt: nowIso(),
      cfeOwnerId: this.deps.repository.findUserByEmail(`${payload.ownerName.toLowerCase().replace(/\s+/g, '.')}@mentorme.test`)?.id || user.id,
    }
    this.deps.repository.saveRequest(next)
    this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.approved',
      fromStatus: request.status,
      toStatus: next.status,
      payload: { ownerName: payload.ownerName },
    })
    this.recordOutbox('request.approved', 'mentor_request', request.id, { ownerName: payload.ownerName })
    return { request: this.requireRequestView(request.id) }
  }

  returnRequest(user: User, requestId: string, input: unknown) {
    this.assertRole(user, 'cfe')
    const payload = returnSchema.parse(input)
    const request = this.requireRequest(requestId)
    const next = {
      ...request,
      status: 'needs_work' as const,
      mentorNotes: payload.reason,
      updatedAt: nowIso(),
    }
    this.deps.repository.saveRequest(next)
    this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.returned',
      fromStatus: request.status,
      toStatus: next.status,
      payload: { reason: payload.reason },
    })
    this.recordOutbox('request.returned', 'mentor_request', request.id, { reason: payload.reason })
    return { request: this.requireRequestView(request.id) }
  }

  closeRequest(user: User, requestId: string) {
    this.assertRole(user, 'cfe')
    const request = this.requireRequest(requestId)
    const next = { ...request, status: 'closed' as const, updatedAt: nowIso() }
    this.deps.repository.saveRequest(next)
    this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.closed',
      fromStatus: request.status,
      toStatus: 'closed',
      payload: {},
    })
    return { request: this.requireRequestView(request.id) }
  }

  listMentors(user: User) {
    const mentors = this.deps.repository.listMentors()
    return {
      mentors: user.role === 'cfe' ? mentors : mentors.filter((mentor) => mentor.visibility === 'Active'),
    }
  }

  createMentor(user: User, input: Omit<MentorProfile, 'organizationId'>) {
    this.assertRole(user, 'cfe')
    const mentor = {
      ...input,
      organizationId: user.organizationId,
    }
    this.deps.repository.saveMentor(mentor)
    this.recordAudit({
      entityType: 'mentor',
      entityId: mentor.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'mentor.created',
      payload: {},
    })
    return { mentor }
  }

  updateMentor(user: User, mentorId: string, updates: Partial<MentorProfile>) {
    this.assertRole(user, 'cfe')
    const mentor = this.deps.repository.findMentorById(mentorId)
    if (!mentor) {
      throw new Error('Mentor not found')
    }
    const next = {
      ...mentor,
      ...updates,
      id: mentor.id,
      organizationId: mentor.organizationId,
    }
    this.deps.repository.saveMentor(next)
    this.recordAudit({
      entityType: 'mentor',
      entityId: mentor.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'mentor.updated',
      payload: updates as Record<string, unknown>,
    })
    return { mentor: next }
  }

  async presignArtifact(user: User, requestId: string, input: unknown) {
    this.authorizeRequestAccess(user, requestId)
    const payload = presignSchema.parse(input)
    const artifactId = nextPrefixedId(
      'art',
      this.deps.repository
        .listArtifactsForRequest(requestId)
        .map((artifact) => artifact.id.replace('art-', 'art-')),
    )
    const storageKey = artifactStorageKey(requestId, payload.filename)
    const upload = await this.deps.storage.createPresignedUpload({
      ...payload,
      requestId,
      storageKey,
    })

    const artifact: Artifact = {
      id: artifactId,
      organizationId: user.organizationId,
      requestId,
      uploaderUserId: user.id,
      filename: payload.filename,
      contentType: payload.contentType,
      sizeBytes: payload.sizeBytes,
      storageKey,
      status: 'pending',
      uploadUrl: upload.uploadUrl,
      createdAt: nowIso(),
    }

    this.deps.repository.saveArtifact(artifact)
    this.recordAudit({
      entityType: 'artifact',
      entityId: artifact.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'artifact.presigned',
      payload: { requestId },
    })

    return { artifact, uploadUrl: upload.uploadUrl }
  }

  completeArtifact(user: User, requestId: string, artifactId: string) {
    this.authorizeRequestAccess(user, requestId)
    const artifact = this.deps.repository.findArtifactById(artifactId)

    if (!artifact || artifact.requestId !== requestId) {
      throw new Error('Artifact not found')
    }

    const next = {
      ...artifact,
      status: 'uploaded' as const,
      completedAt: nowIso(),
    }
    this.deps.repository.saveArtifact(next)
    this.recordAudit({
      entityType: 'artifact',
      entityId: artifact.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'artifact.completed',
      payload: { requestId },
    })
    return { artifact: next }
  }

  async createMentorOutreach(user: User, requestId: string) {
    this.assertRole(user, 'cfe')
    const request = this.requireRequest(requestId)
    if (!request.mentorId) {
      throw new Error('Cannot create mentor outreach without a selected mentor')
    }
    const mentor = this.requireMentor(request.mentorId)
    const token = randomToken()
    this.deps.repository.saveExternalActionToken({
      id: `eat-${randomToken().slice(0, 10)}`,
      requestId,
      mentorId: mentor.id,
      tokenHash: sha256(token),
      purpose: 'mentor_request',
      expiresAt: futureIso(24 * 7),
    })

    await this.deps.email.sendMentorOutreach({
      email: mentor.email,
      mentorName: mentor.name,
      requestId,
      token,
    })
    this.recordOutbox('mentor.outreach_created', 'mentor_request', requestId, { mentorId: mentor.id })
    return { mentorActionToken: token }
  }

  mentorRespond(token: string, input: unknown) {
    const payload = mentorRespondSchema.parse(input)
    const actionToken = this.requireExternalToken(token)

    if (actionToken.respondedAt) {
      throw new Error('Action link has already been used')
    }

    this.deps.repository.saveExternalActionToken({
      ...actionToken,
      response: payload.decision,
      respondedAt: nowIso(),
      responseReason: payload.reason,
    })

    const request = this.requireRequest(actionToken.requestId)

    if (payload.decision === 'accepted') {
      this.recordAudit({
        entityType: 'mentor_request',
        entityId: request.id,
        actorType: 'mentor',
        action: 'mentor.accepted',
        fromStatus: request.status,
        toStatus: request.status,
        payload: { mentorId: actionToken.mentorId },
      })
      this.recordOutbox('mentor.accepted', 'mentor_request', request.id, { mentorId: actionToken.mentorId })

      return { decision: payload.decision, request: this.requireRequestView(request.id) }
    }

    const next = {
      ...request,
      mentorId: undefined,
      status: 'awaiting_mentor' as const,
      updatedAt: nowIso(),
    }
    this.deps.repository.saveRequest(next)
    this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'mentor',
      action: 'mentor.declined',
      fromStatus: request.status,
      toStatus: next.status,
      payload: { mentorId: actionToken.mentorId, reason: payload.reason || '' },
    })
    this.recordOutbox('mentor.declined', 'mentor_request', request.id, {
      mentorId: actionToken.mentorId,
      reason: payload.reason || '',
    })

    return { decision: payload.decision, request: this.requireRequestView(request.id) }
  }

  mentorSchedule(token: string, input: unknown) {
    const payload = scheduleSchema.parse(input)
    const actionToken = this.requireExternalToken(token)

    if (actionToken.response === 'declined') {
      throw new Error('Cannot schedule a request after declining it')
    }

    const request = this.requireRequest(actionToken.requestId)
    const meetingId = nextPrefixedId(
      'meet',
      this.deps.repository.listMeetingsForRequest(request.id).map((meeting) => meeting.id),
    )
    this.deps.repository.saveMeeting({
      id: meetingId,
      organizationId: request.organizationId,
      requestId: request.id,
      mentorId: actionToken.mentorId,
      provider: 'manual',
      scheduledAt: payload.meetingAt,
      joinLink: payload.calendlyLink,
      status: 'scheduled',
    })
    const next = {
      ...request,
      status: 'scheduled' as const,
      meetingAt: payload.meetingAt,
      calendlyLink: payload.calendlyLink,
      updatedAt: nowIso(),
    }
    this.deps.repository.saveRequest(next)
    this.recordAudit({
      entityType: 'meeting',
      entityId: meetingId,
      actorType: 'mentor',
      action: 'meeting.scheduled',
      payload: { requestId: request.id },
    })
    this.recordOutbox('meeting.scheduled', 'mentor_request', request.id, { meetingId })
    return { request: this.requireRequestView(request.id) }
  }

  mentorFeedback(token: string, input: unknown) {
    const payload = feedbackSchema.parse(input)
    const actionToken = this.requireExternalToken(token)
    const request = this.requireRequest(actionToken.requestId)
    const meeting = this.deps.repository.listMeetingsForRequest(request.id)[0]

    if (!meeting) {
      throw new Error('No meeting exists for this request')
    }

    this.deps.repository.saveFeedback({
      id: `mf-${randomToken().slice(0, 10)}`,
      organizationId: request.organizationId,
      requestId: request.id,
      meetingId: meeting.id,
      mentorId: actionToken.mentorId,
      mentorNotes: payload.mentorNotes,
      nextStepRequired: payload.nextStepRequired,
      secondSessionRecommended: payload.secondSessionRecommended,
      createdAt: nowIso(),
    })

    const next = {
      ...request,
      status: 'follow_up' as const,
      mentorNotes: payload.mentorNotes,
      updatedAt: nowIso(),
    }
    this.deps.repository.saveRequest(next)
    this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'mentor',
      action: 'request.feedback_recorded',
      fromStatus: request.status,
      toStatus: next.status,
      payload: {
        nextStepRequired: payload.nextStepRequired,
        secondSessionRecommended: payload.secondSessionRecommended,
      },
    })
    this.recordOutbox('request.feedback_recorded', 'mentor_request', request.id, {})
    return { request: this.requireRequestView(request.id) }
  }

  calendlyWebhook(eventId: string, payload: Record<string, unknown>) {
    const duplicate = this.deps.repository.findWebhookReceipt('calendly', eventId)

    if (duplicate) {
      return { accepted: true, duplicate: true }
    }

    this.deps.repository.saveWebhookReceipt({
      id: `wh-${randomToken().slice(0, 10)}`,
      provider: 'calendly',
      eventId,
      payload,
      receivedAt: nowIso(),
      processedAt: nowIso(),
    })

    const requestId = String(
      (payload.payload as { tracking?: { mentorRequestId?: string } } | undefined)?.tracking?.mentorRequestId || '',
    )

    if (requestId) {
      const request = this.requireRequest(requestId)
      const scheduledAt = String(
        (payload.payload as { scheduled_at?: string } | undefined)?.scheduled_at || request.meetingAt || nowIso(),
      )
      const joinLink = String(
        (payload.payload as { event?: string; invitee?: string } | undefined)?.event ||
          (payload.payload as { event?: string; invitee?: string } | undefined)?.invitee ||
          request.calendlyLink ||
          '',
      )
      const meetingId = nextPrefixedId(
        'meet',
        this.deps.repository.listMeetingsForRequest(request.id).map((meeting) => meeting.id),
      )
      this.deps.repository.saveMeeting({
        id: meetingId,
        organizationId: request.organizationId,
        requestId: request.id,
        mentorId: request.mentorId || 'm-unknown',
        provider: 'calendly',
        providerEventId: eventId,
        scheduledAt,
        joinLink,
        status: 'scheduled',
      })
      this.deps.repository.saveRequest({
        ...request,
        status: 'scheduled',
        meetingAt: scheduledAt,
        calendlyLink: joinLink,
        updatedAt: nowIso(),
      })
    }

    return { accepted: true, duplicate: false }
  }

  private async signAccessToken(user: User) {
    return await new SignJWT({ role: user.role, organizationId: user.organizationId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuer(this.deps.jwtIssuer)
      .setAudience(this.deps.jwtAudience)
      .setExpirationTime('15m')
      .sign(jwtTextEncoder.encode(this.deps.jwtSecret))
  }

  private assertRole(user: User, role: UserRole) {
    if (user.role !== role) {
      throw new Error('Forbidden')
    }
  }

  private authorizeVentureAccess(user: User, ventureId: string) {
    const venture = this.requireVenture(ventureId)

    if (user.role === 'cfe') {
      return venture
    }

    const membership = this.deps.repository
      .listMemberships()
      .find((item) => item.userId === user.id && item.ventureId === ventureId)

    if (!membership) {
      throw new Error('Forbidden')
    }

    return venture
  }

  private authorizeRequestAccess(user: User, requestId: string) {
    const request = this.requireRequest(requestId)
    this.authorizeVentureAccess(user, request.ventureId)
    return request
  }

  private requireRequestView(requestId: string) {
    const request = this.listRequestViews().find((item) => item.id === requestId)
    if (!request) {
      throw new Error('Request not found')
    }
    return request
  }

  private listRequestViews(): RequestView[] {
    const ventures = new Map(this.deps.repository.listVentures().map((venture) => [venture.id, venture]))
    const mentors = new Map(this.deps.repository.listMentors().map((mentor) => [mentor.id, mentor]))
    const users = new Map(this.deps.repository.listUsers().map((user) => [user.id, user]))

    return this.deps.repository.listRequests().map((request) => {
      const venture = ventures.get(request.ventureId)
      const mentor = request.mentorId ? mentors.get(request.mentorId) : undefined
      const cfeOwner = request.cfeOwnerId ? users.get(request.cfeOwnerId)?.name : undefined

      return {
        id: request.id,
        ventureId: request.ventureId,
        ventureName: venture?.name || request.ventureId,
        founderName: venture?.founderName || 'Unknown founder',
        mentorId: request.mentorId,
        mentorName: mentor?.name,
        stage: request.stage,
        trl: request.trl,
        brl: request.brl,
        status: request.status,
        createdAt: request.createdAt,
        challenge: request.challenge,
        artifactList: this.deps.repository.listArtifactsForRequest(request.id).map((artifact) => artifact.filename),
        desiredOutcome: request.desiredOutcome,
        cfeOwner,
        mentorNotes: request.mentorNotes,
        meetingAt: request.meetingAt,
        calendlyLink: request.calendlyLink,
      }
    })
  }

  private requireUser(userId: string) {
    const user = this.deps.repository.findUserById(userId)
    if (!user) {
      throw new Error('User not found')
    }
    return user
  }

  private requireVenture(ventureId: string) {
    const venture = this.deps.repository.findVentureById(ventureId)
    if (!venture) {
      throw new Error('Venture not found')
    }
    return venture
  }

  private requireRequest(requestId: string) {
    const request = this.deps.repository.findRequestById(requestId)
    if (!request) {
      throw new Error('Request not found')
    }
    return request
  }

  private requireMentor(mentorId: string) {
    const mentor = this.deps.repository.findMentorById(mentorId)
    if (!mentor) {
      throw new Error('Mentor not found')
    }
    return mentor
  }

  private requireExternalToken(token: string) {
    const record = this.deps.repository.findExternalActionTokenByHash(sha256(token))

    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid or expired action token')
    }

    return record
  }

  private recordAudit(input: Omit<AuditEvent, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) {
    const organizationId =
      input.organizationId ||
      (input.actorUserId ? this.requireUser(input.actorUserId).organizationId : this.deps.repository.listUsers()[0]?.organizationId)

    this.deps.repository.saveAuditEvent({
      id: `audit-${randomToken().slice(0, 10)}`,
      organizationId: organizationId || 'org-mentorme',
      createdAt: nowIso(),
      ...input,
    })
  }

  private recordOutbox(topic: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>) {
    const event = this.deps.repository.saveOutboxEvent({
      id: `out-${randomToken().slice(0, 10)}`,
      topic,
      aggregateType,
      aggregateId,
      payload,
      status: 'pending',
      createdAt: nowIso(),
    })
    void this.deps.queue.publish(topic, event.payload)
  }
}
