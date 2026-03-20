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
} from './types'

export interface PlatformRepository {
  listUsers(): Promise<User[]>
  findUserByEmail(email: string): Promise<User | undefined>
  findUserById(id: string): Promise<User | undefined>
  listVentures(): Promise<Venture[]>
  findVentureById(id: string): Promise<Venture | undefined>
  listMemberships(): Promise<VentureMembership[]>
  listMentors(): Promise<MentorProfile[]>
  findMentorById(id: string): Promise<MentorProfile | undefined>
  saveMentor(mentor: MentorProfile): Promise<MentorProfile>
  listRequests(): Promise<MentorRequest[]>
  findRequestById(id: string): Promise<MentorRequest | undefined>
  saveRequest(request: MentorRequest): Promise<MentorRequest>
  listShortlistsForRequest(requestId: string): Promise<MentorRequestShortlist[]>
  replaceShortlistsForRequest(requestId: string, shortlists: MentorRequestShortlist[]): Promise<void>
  listArtifactsForRequest(requestId: string): Promise<Artifact[]>
  findArtifactById(id: string): Promise<Artifact | undefined>
  saveArtifact(artifact: Artifact): Promise<Artifact>
  listMeetingsForRequest(requestId: string): Promise<Meeting[]>
  saveMeeting(meeting: Meeting): Promise<Meeting>
  saveFeedback(feedback: MeetingFeedback): Promise<MeetingFeedback>
  listMagicLinks(): Promise<MagicLinkTokenRecord[]>
  saveMagicLink(token: MagicLinkTokenRecord): Promise<MagicLinkTokenRecord>
  saveSession(session: SessionRecord): Promise<SessionRecord>
  findSessionByHash(refreshTokenHash: string): Promise<SessionRecord | undefined>
  revokeSession(sessionId: string): Promise<void>
  saveExternalActionToken(token: ExternalActionToken): Promise<ExternalActionToken>
  findExternalActionTokenByHash(tokenHash: string): Promise<ExternalActionToken | undefined>
  saveAuditEvent(event: AuditEvent): Promise<AuditEvent>
  listAuditEventsForEntity(entityType: AuditEvent['entityType'], entityId: string): Promise<AuditEvent[]>
  findWebhookReceipt(provider: 'calendly', eventId: string): Promise<WebhookReceipt | undefined>
  saveWebhookReceipt(receipt: WebhookReceipt): Promise<WebhookReceipt>
  saveOutboxEvent(event: OutboxEvent): Promise<OutboxEvent>
  listOutboxEvents(): Promise<OutboxEvent[]>
}

export interface EmailGateway {
  sendMagicLink(input: { email: string; token: string; name: string }): Promise<void>
  sendMentorOutreach(input: { email: string; mentorName: string; requestId: string; token: string }): Promise<void>
}

export interface StorageService {
  createPresignedUpload(input: {
    requestId: string
    filename: string
    contentType: string
    sizeBytes: number
    storageKey: string
  }): Promise<{ uploadUrl: string }>
}

export interface QueuePublisher {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>
}
