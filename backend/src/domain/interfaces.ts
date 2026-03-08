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
  listUsers(): User[]
  findUserByEmail(email: string): User | undefined
  findUserById(id: string): User | undefined
  listVentures(): Venture[]
  findVentureById(id: string): Venture | undefined
  listMemberships(): VentureMembership[]
  listMentors(): MentorProfile[]
  findMentorById(id: string): MentorProfile | undefined
  saveMentor(mentor: MentorProfile): MentorProfile
  listRequests(): MentorRequest[]
  findRequestById(id: string): MentorRequest | undefined
  saveRequest(request: MentorRequest): MentorRequest
  listShortlistsForRequest(requestId: string): MentorRequestShortlist[]
  replaceShortlistsForRequest(requestId: string, shortlists: MentorRequestShortlist[]): void
  listArtifactsForRequest(requestId: string): Artifact[]
  findArtifactById(id: string): Artifact | undefined
  saveArtifact(artifact: Artifact): Artifact
  listMeetingsForRequest(requestId: string): Meeting[]
  saveMeeting(meeting: Meeting): Meeting
  saveFeedback(feedback: MeetingFeedback): MeetingFeedback
  listMagicLinks(): MagicLinkTokenRecord[]
  saveMagicLink(token: MagicLinkTokenRecord): MagicLinkTokenRecord
  saveSession(session: SessionRecord): SessionRecord
  findSessionByHash(refreshTokenHash: string): SessionRecord | undefined
  revokeSession(sessionId: string): void
  saveExternalActionToken(token: ExternalActionToken): ExternalActionToken
  findExternalActionTokenByHash(tokenHash: string): ExternalActionToken | undefined
  saveAuditEvent(event: AuditEvent): AuditEvent
  listAuditEventsForEntity(entityType: AuditEvent['entityType'], entityId: string): AuditEvent[]
  findWebhookReceipt(provider: 'calendly', eventId: string): WebhookReceipt | undefined
  saveWebhookReceipt(receipt: WebhookReceipt): WebhookReceipt
  saveOutboxEvent(event: OutboxEvent): OutboxEvent
  listOutboxEvents(): OutboxEvent[]
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
