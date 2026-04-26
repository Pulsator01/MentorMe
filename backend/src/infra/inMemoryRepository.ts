import { createSeedState } from '../domain/seed'
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

type State = ReturnType<typeof createSeedState> & {
  aiRunFeedbacks: AiRunFeedback[]
  aiRuns: AiRun[]
  feedbacks: MeetingFeedback[]
  magicLinks: MagicLinkTokenRecord[]
  oauthAccounts: OAuthAccount[]
  passwordResetTokens: PasswordResetTokenRecord[]
  sessions: SessionRecord[]
  externalActionTokens: ExternalActionToken[]
  webhookReceipts: WebhookReceipt[]
  outboxEvents: OutboxEvent[]
  invitations: Invitation[]
}

class InMemoryPlatformRepository implements PlatformRepository {
  constructor(private readonly state: State) {}

  async listUsers() {
    return [...this.state.users]
  }

  async findUserByEmail(email: string) {
    return this.state.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  }

  async findUserById(id: string) {
    return this.state.users.find((user) => user.id === id)
  }

  async saveUser(user: User) {
    this.state.users = upsertById(this.state.users, user)
    return user
  }

  async findOAuthAccount(provider: OAuthProvider, providerAccountId: string) {
    return this.state.oauthAccounts.find(
      (account) => account.provider === provider && account.providerAccountId === providerAccountId,
    )
  }

  async saveOAuthAccount(account: OAuthAccount) {
    this.state.oauthAccounts = upsertById(this.state.oauthAccounts, account)
    return account
  }

  async savePasswordResetToken(token: PasswordResetTokenRecord) {
    this.state.passwordResetTokens = upsertById(this.state.passwordResetTokens, token)
    return token
  }

  async findPasswordResetTokenByHash(tokenHash: string) {
    return this.state.passwordResetTokens.find((token) => token.tokenHash === tokenHash)
  }

  async markPasswordResetTokenConsumed(id: string, consumedAt: string) {
    this.state.passwordResetTokens = this.state.passwordResetTokens.map((token) =>
      token.id === id ? { ...token, consumedAt } : token,
    )
  }

  async listVentures() {
    return [...this.state.ventures]
  }

  async findVentureById(id: string) {
    return this.state.ventures.find((venture) => venture.id === id)
  }

  async saveVenture(venture: Venture) {
    this.state.ventures = upsertById(this.state.ventures, venture)
    return venture
  }

  async listMemberships() {
    return [...this.state.ventureMemberships]
  }

  async saveMembership(membership: VentureMembership) {
    this.state.ventureMemberships = upsertById(this.state.ventureMemberships, membership)
    return membership
  }

  async listMentors() {
    return [...this.state.mentors]
  }

  async findMentorById(id: string) {
    return this.state.mentors.find((mentor) => mentor.id === id)
  }

  async saveMentor(mentor: MentorProfile) {
    this.state.mentors = upsertById(this.state.mentors, mentor)
    return mentor
  }

  async listRequests() {
    return [...this.state.requests]
  }

  async findRequestById(id: string) {
    return this.state.requests.find((request) => request.id === id)
  }

  async saveRequest(request: MentorRequest) {
    this.state.requests = upsertById(this.state.requests, request)
    return request
  }

  async listShortlistsForRequest(requestId: string) {
    return this.state.shortlists.filter((shortlist) => shortlist.requestId === requestId)
  }

  async replaceShortlistsForRequest(requestId: string, shortlists: MentorRequestShortlist[]) {
    this.state.shortlists = this.state.shortlists.filter((shortlist) => shortlist.requestId !== requestId).concat(shortlists)
  }

  async listArtifactsForRequest(requestId: string) {
    return this.state.artifacts.filter((artifact) => artifact.requestId === requestId)
  }

  async findArtifactById(id: string) {
    return this.state.artifacts.find((artifact) => artifact.id === id)
  }

  async saveArtifact(artifact: Artifact) {
    this.state.artifacts = upsertById(this.state.artifacts, artifact)
    return artifact
  }

  async listMeetingsForRequest(requestId: string) {
    return this.state.meetings.filter((meeting) => meeting.requestId === requestId)
  }

  async saveMeeting(meeting: Meeting) {
    this.state.meetings = upsertById(this.state.meetings, meeting)
    return meeting
  }

  async saveFeedback(feedback: MeetingFeedback) {
    this.state.feedbacks = upsertById(this.state.feedbacks, feedback)
    return feedback
  }

  async listMagicLinks() {
    return [...this.state.magicLinks]
  }

  async saveMagicLink(token: MagicLinkTokenRecord) {
    this.state.magicLinks = upsertById(this.state.magicLinks, token)
    return token
  }

  async saveSession(session: SessionRecord) {
    this.state.sessions = upsertById(this.state.sessions, session)
    return session
  }

  async findSessionByHash(refreshTokenHash: string) {
    return this.state.sessions.find((session) => session.refreshTokenHash === refreshTokenHash && !session.revokedAt)
  }

  async revokeSession(sessionId: string) {
    this.state.sessions = this.state.sessions.map((session) =>
      session.id === sessionId ? { ...session, revokedAt: new Date().toISOString() } : session,
    )
  }

  async revokeAllSessionsForUser(userId: string) {
    const now = new Date().toISOString()
    this.state.sessions = this.state.sessions.map((session) =>
      session.userId === userId && !session.revokedAt ? { ...session, revokedAt: now } : session,
    )
  }

  async saveExternalActionToken(token: ExternalActionToken) {
    this.state.externalActionTokens = upsertById(this.state.externalActionTokens, token)
    return token
  }

  async findExternalActionTokenByHash(tokenHash: string) {
    return this.state.externalActionTokens.find((token) => token.tokenHash === tokenHash)
  }

  async saveAuditEvent(event: AuditEvent) {
    this.state.auditEvents = upsertById(this.state.auditEvents, event)
    return event
  }

  async listAuditEventsForEntity(entityType: AuditEvent['entityType'], entityId: string) {
    return this.state.auditEvents.filter((event) => event.entityType === entityType && event.entityId === entityId)
  }

  async findWebhookReceipt(provider: 'calendly', eventId: string) {
    return this.state.webhookReceipts.find((receipt) => receipt.provider === provider && receipt.eventId === eventId)
  }

  async saveWebhookReceipt(receipt: WebhookReceipt) {
    this.state.webhookReceipts = upsertById(this.state.webhookReceipts, receipt)
    return receipt
  }

  async saveOutboxEvent(event: OutboxEvent) {
    this.state.outboxEvents = upsertById(this.state.outboxEvents, event)
    return event
  }

  async listOutboxEvents() {
    return [...this.state.outboxEvents]
  }

  async findOutboxEventById(id: string) {
    return this.state.outboxEvents.find((event) => event.id === id)
  }

  async saveAiRun(run: AiRun) {
    this.state.aiRuns = upsertById(this.state.aiRuns, run)
    return run
  }

  async findAiRunById(id: string) {
    return this.state.aiRuns.find((run) => run.id === id)
  }

  async saveAiRunFeedback(feedback: AiRunFeedback) {
    this.state.aiRunFeedbacks = upsertById(this.state.aiRunFeedbacks, feedback)
    return feedback
  }

  async saveInvitation(invitation: Invitation) {
    this.state.invitations = upsertById(this.state.invitations, invitation)
    return invitation
  }

  async findInvitationById(id: string) {
    return this.state.invitations.find((invitation) => invitation.id === id)
  }

  async findInvitationByHash(tokenHash: string) {
    return this.state.invitations.find((invitation) => invitation.tokenHash === tokenHash)
  }

  async listInvitationsByOrganization(organizationId: string) {
    return this.state.invitations
      .filter((invitation) => invitation.organizationId === organizationId)
      .map((invitation) => ({ ...invitation }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }

  async findPendingInvitationByEmail(organizationId: string, email: string) {
    const normalised = email.toLowerCase()
    return this.state.invitations.find(
      (invitation) =>
        invitation.organizationId === organizationId &&
        invitation.email.toLowerCase() === normalised &&
        invitation.status === 'pending',
    )
  }
}

const upsertById = <T extends { id: string }>(items: T[], next: T) => {
  const index = items.findIndex((item) => item.id === next.id)

  if (index === -1) {
    return [next, ...items]
  }

  return items.map((item) => (item.id === next.id ? next : item))
}

export const createSeededInMemoryPlatformRepository = (configure?: (state: State) => void) => {
  const seed = createSeedState()
  const state: State = {
    ...seed,
    aiRunFeedbacks: [],
    aiRuns: [],
    feedbacks: [],
    magicLinks: [],
    oauthAccounts: [],
    passwordResetTokens: [],
    sessions: [],
    externalActionTokens: [],
    webhookReceipts: [],
    outboxEvents: [],
    invitations: [],
  }
  configure?.(state)

  return new InMemoryPlatformRepository(state)
}
