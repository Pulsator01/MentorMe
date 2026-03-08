import { createSeedState } from '../domain/seed'
import type { PlatformRepository } from '../domain/interfaces'
import type {
  Artifact,
  AuditEvent,
  ExternalActionToken,
  MagicLinkTokenRecord,
  Meeting,
  MeetingFeedback,
  MentorProfile,
  MentorRequest,
  MentorRequestShortlist,
  OutboxEvent,
  SessionRecord,
  User,
  Venture,
  VentureMembership,
  WebhookReceipt,
} from '../domain/types'

type State = ReturnType<typeof createSeedState> & {
  feedbacks: MeetingFeedback[]
  magicLinks: MagicLinkTokenRecord[]
  sessions: SessionRecord[]
  externalActionTokens: ExternalActionToken[]
  webhookReceipts: WebhookReceipt[]
  outboxEvents: OutboxEvent[]
}

class InMemoryPlatformRepository implements PlatformRepository {
  constructor(private readonly state: State) {}

  listUsers() {
    return [...this.state.users]
  }

  findUserByEmail(email: string) {
    return this.state.users.find((user) => user.email.toLowerCase() === email.toLowerCase())
  }

  findUserById(id: string) {
    return this.state.users.find((user) => user.id === id)
  }

  listVentures() {
    return [...this.state.ventures]
  }

  findVentureById(id: string) {
    return this.state.ventures.find((venture) => venture.id === id)
  }

  listMemberships() {
    return [...this.state.ventureMemberships]
  }

  listMentors() {
    return [...this.state.mentors]
  }

  findMentorById(id: string) {
    return this.state.mentors.find((mentor) => mentor.id === id)
  }

  saveMentor(mentor: MentorProfile) {
    this.state.mentors = upsertById(this.state.mentors, mentor)
    return mentor
  }

  listRequests() {
    return [...this.state.requests]
  }

  findRequestById(id: string) {
    return this.state.requests.find((request) => request.id === id)
  }

  saveRequest(request: MentorRequest) {
    this.state.requests = upsertById(this.state.requests, request)
    return request
  }

  listShortlistsForRequest(requestId: string) {
    return this.state.shortlists.filter((shortlist) => shortlist.requestId === requestId)
  }

  replaceShortlistsForRequest(requestId: string, shortlists: MentorRequestShortlist[]) {
    this.state.shortlists = this.state.shortlists.filter((shortlist) => shortlist.requestId !== requestId).concat(shortlists)
  }

  listArtifactsForRequest(requestId: string) {
    return this.state.artifacts.filter((artifact) => artifact.requestId === requestId)
  }

  findArtifactById(id: string) {
    return this.state.artifacts.find((artifact) => artifact.id === id)
  }

  saveArtifact(artifact: Artifact) {
    this.state.artifacts = upsertById(this.state.artifacts, artifact)
    return artifact
  }

  listMeetingsForRequest(requestId: string) {
    return this.state.meetings.filter((meeting) => meeting.requestId === requestId)
  }

  saveMeeting(meeting: Meeting) {
    this.state.meetings = upsertById(this.state.meetings, meeting)
    return meeting
  }

  saveFeedback(feedback: MeetingFeedback) {
    this.state.feedbacks = upsertById(this.state.feedbacks, feedback)
    return feedback
  }

  listMagicLinks() {
    return [...this.state.magicLinks]
  }

  saveMagicLink(token: MagicLinkTokenRecord) {
    this.state.magicLinks = upsertById(this.state.magicLinks, token)
    return token
  }

  saveSession(session: SessionRecord) {
    this.state.sessions = upsertById(this.state.sessions, session)
    return session
  }

  findSessionByHash(refreshTokenHash: string) {
    return this.state.sessions.find((session) => session.refreshTokenHash === refreshTokenHash && !session.revokedAt)
  }

  revokeSession(sessionId: string) {
    this.state.sessions = this.state.sessions.map((session) =>
      session.id === sessionId ? { ...session, revokedAt: new Date().toISOString() } : session,
    )
  }

  saveExternalActionToken(token: ExternalActionToken) {
    this.state.externalActionTokens = upsertById(this.state.externalActionTokens, token)
    return token
  }

  findExternalActionTokenByHash(tokenHash: string) {
    return this.state.externalActionTokens.find((token) => token.tokenHash === tokenHash)
  }

  saveAuditEvent(event: AuditEvent) {
    this.state.auditEvents = upsertById(this.state.auditEvents, event)
    return event
  }

  listAuditEventsForEntity(entityType: AuditEvent['entityType'], entityId: string) {
    return this.state.auditEvents.filter((event) => event.entityType === entityType && event.entityId === entityId)
  }

  findWebhookReceipt(provider: 'calendly', eventId: string) {
    return this.state.webhookReceipts.find((receipt) => receipt.provider === provider && receipt.eventId === eventId)
  }

  saveWebhookReceipt(receipt: WebhookReceipt) {
    this.state.webhookReceipts = upsertById(this.state.webhookReceipts, receipt)
    return receipt
  }

  saveOutboxEvent(event: OutboxEvent) {
    this.state.outboxEvents = upsertById(this.state.outboxEvents, event)
    return event
  }

  listOutboxEvents() {
    return [...this.state.outboxEvents]
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
  const state = {
    ...seed,
    feedbacks: [],
    magicLinks: [],
    sessions: [],
    externalActionTokens: [],
    webhookReceipts: [],
    outboxEvents: [],
  }
  configure?.(state)

  return new InMemoryPlatformRepository(state)
}
