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
  UserRole,
  Venture,
  VentureMembership,
  WebhookReceipt,
} from './types'

export type RequestBriefInput = {
  artifactRefs?: string[]
  brl?: number
  desiredOutcomeHint?: string
  domain?: string
  rawNotes: string
  stage?: string
  trl?: number
  ventureName: string
}

export type RequestBriefOutput = {
  briefSummary: string
  cfeRoutingNote: string
  challenge: string
  desiredOutcome: string
  mentorFitTags: string[]
  missingInformation: string[]
  provider: 'heuristic' | 'openai'
  readinessSignals: string[]
}

export type MeetingSummaryInput = {
  desiredOutcome?: string
  meetingNotes: string
  mentorName?: string
  requestChallenge?: string
  ventureName: string
}

export type MeetingSummaryOutput = {
  cfeActionItems: string[]
  executiveSummary: string
  followUpQuestions: string[]
  founderActionItems: string[]
  keyTakeaways: string[]
  provider: 'heuristic' | 'openai'
  secondSessionRecommended: boolean
  studentActionItems: string[]
}

export type MentorRecommendationInput = {
  brl?: number
  challenge: string
  desiredOutcome?: string
  domain?: string
  maxResults?: number
  stage?: string
  trl?: number
  ventureName: string
}

export type MentorRecommendationCandidate = Pick<
  MentorProfile,
  'bio' | 'domains' | 'focus' | 'id' | 'location' | 'monthlyLimit' | 'name' | 'responseWindow' | 'stages' | 'title' | 'tolerance'
>

export type MentorRecommendationOutput = {
  provider: 'heuristic' | 'openai'
  routingNote: string
  searchTags: string[]
  shortlist: Array<{
    caution?: string
    mentorId: string
    mentorName: string
    reasons: string[]
    score: number
    title: string
  }>
}

export interface PlatformRepository {
  listUsers(): Promise<User[]>
  findUserByEmail(email: string): Promise<User | undefined>
  findUserById(id: string): Promise<User | undefined>
  saveUser(user: User): Promise<User>
  findOAuthAccount(provider: OAuthProvider, providerAccountId: string): Promise<OAuthAccount | undefined>
  saveOAuthAccount(account: OAuthAccount): Promise<OAuthAccount>
  savePasswordResetToken(token: PasswordResetTokenRecord): Promise<PasswordResetTokenRecord>
  findPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetTokenRecord | undefined>
  markPasswordResetTokenConsumed(id: string, consumedAt: string): Promise<void>
  listVentures(): Promise<Venture[]>
  findVentureById(id: string): Promise<Venture | undefined>
  saveVenture(venture: Venture): Promise<Venture>
  listMemberships(): Promise<VentureMembership[]>
  saveMembership(membership: VentureMembership): Promise<VentureMembership>
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
  revokeAllSessionsForUser(userId: string): Promise<void>
  saveExternalActionToken(token: ExternalActionToken): Promise<ExternalActionToken>
  findExternalActionTokenByHash(tokenHash: string): Promise<ExternalActionToken | undefined>
  saveAuditEvent(event: AuditEvent): Promise<AuditEvent>
  listAuditEventsForEntity(entityType: AuditEvent['entityType'], entityId: string): Promise<AuditEvent[]>
  findWebhookReceipt(provider: 'calendly', eventId: string): Promise<WebhookReceipt | undefined>
  saveWebhookReceipt(receipt: WebhookReceipt): Promise<WebhookReceipt>
  saveOutboxEvent(event: OutboxEvent): Promise<OutboxEvent>
  listOutboxEvents(): Promise<OutboxEvent[]>
  saveAiRun(run: AiRun): Promise<AiRun>
  findAiRunById(id: string): Promise<AiRun | undefined>
  saveAiRunFeedback(feedback: AiRunFeedback): Promise<AiRunFeedback>
  saveInvitation(invitation: Invitation): Promise<Invitation>
  findInvitationById(id: string): Promise<Invitation | undefined>
  findInvitationByHash(tokenHash: string): Promise<Invitation | undefined>
  listInvitationsByOrganization(organizationId: string): Promise<Invitation[]>
  findPendingInvitationByEmail(organizationId: string, email: string): Promise<Invitation | undefined>
}

export interface EmailGateway {
  sendMagicLink(input: { email: string; token: string; name: string }): Promise<void>
  sendMentorOutreach(input: { email: string; mentorName: string; requestId: string; token: string }): Promise<void>
  sendPasswordReset(input: { email: string; name: string; token: string }): Promise<void>
  sendWelcome(input: { email: string; name: string }): Promise<void>
  sendInvitation(input: {
    email: string
    inviterName: string
    organizationName: string
    role: UserRole
    token: string
    message?: string
  }): Promise<void>
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

export interface AiGateway {
  generateMeetingSummary(input: MeetingSummaryInput): Promise<MeetingSummaryOutput>
  generateRequestBrief(input: RequestBriefInput): Promise<RequestBriefOutput>
  recommendMentors(input: MentorRecommendationInput & { candidates: MentorRecommendationCandidate[] }): Promise<MentorRecommendationOutput>
}

export interface GoogleOAuthTokens {
  accessToken: string
  refreshToken?: string
  idToken?: string
  expiresInSeconds?: number
  scope?: string
}

export interface GoogleOAuthProfile {
  providerAccountId: string
  email: string
  emailVerified: boolean
  name: string
}

export interface GoogleOAuthGateway {
  redirectUri: string
  buildAuthorizeUrl(state: string): string
  exchangeCode(code: string): Promise<GoogleOAuthTokens>
  fetchProfile(accessToken: string): Promise<GoogleOAuthProfile>
}
