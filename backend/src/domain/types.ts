export type UserRole = 'cfe' | 'founder' | 'student'
export type VentureMembershipRole = 'founder' | 'student'
export type MentorTolerance = 'Low' | 'Medium' | 'High'
export type MentorVisibility = 'Active' | 'Paused'
export type RequestStatus =
  | 'draft'
  | 'cfe_review'
  | 'needs_work'
  | 'awaiting_mentor'
  | 'scheduled'
  | 'follow_up'
  | 'closed'
  | 'cancelled'
export type ArtifactStatus = 'pending' | 'uploaded'

export interface Organization {
  id: string
  name: string
  slug: string
}

export interface Cohort {
  id: string
  organizationId: string
  name: string
}

export interface User {
  id: string
  organizationId: string
  cohortId?: string
  email: string
  name: string
  role: UserRole
  passwordHash?: string
  emailVerified?: boolean
  emailVerifiedAt?: string
  lastLoginAt?: string
}

export type OAuthProvider = 'google'

export interface OAuthAccount {
  id: string
  userId: string
  provider: OAuthProvider
  providerAccountId: string
  email?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
}

export interface PasswordResetTokenRecord {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  consumedAt?: string
}

export interface Venture {
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
}

export interface VentureMembership {
  id: string
  organizationId: string
  ventureId: string
  userId: string
  role: VentureMembershipRole
}

export interface MentorProfile {
  id: string
  organizationId: string
  name: string
  email: string
  title: string
  location: string
  focus: string[]
  stages: string[]
  domains: string[]
  tolerance: MentorTolerance
  monthlyLimit: number
  visibility: MentorVisibility
  responseWindow: string
  calendlyUrl: string
  bio: string
}

export interface MentorRequest {
  id: string
  organizationId: string
  ventureId: string
  founderUserId: string
  cfeOwnerId?: string
  mentorId?: string
  stage: string
  trl: number
  brl: number
  status: RequestStatus
  challenge: string
  desiredOutcome: string
  mentorNotes: string
  createdAt: string
  updatedAt: string
  submittedAt?: string
  meetingAt?: string
  calendlyLink?: string
}

export interface MentorRequestShortlist {
  id: string
  requestId: string
  mentorId: string
  rank: number
}

export interface Artifact {
  id: string
  organizationId: string
  requestId: string
  uploaderUserId: string
  filename: string
  contentType: string
  sizeBytes: number
  storageKey: string
  status: ArtifactStatus
  uploadUrl: string
  createdAt: string
  completedAt?: string
}

export interface Meeting {
  id: string
  organizationId: string
  requestId: string
  mentorId: string
  provider: 'manual' | 'calendly'
  providerEventId?: string
  scheduledAt: string
  joinLink: string
  status: 'scheduled' | 'cancelled'
}

export interface MeetingFeedback {
  id: string
  organizationId: string
  requestId: string
  meetingId: string
  mentorId: string
  mentorNotes: string
  nextStepRequired: boolean
  secondSessionRecommended: boolean
  createdAt: string
}

export interface MagicLinkTokenRecord {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  consumedAt?: string
}

export interface SessionRecord {
  id: string
  userId: string
  refreshTokenHash: string
  expiresAt: string
  revokedAt?: string
}

export interface ExternalActionToken {
  id: string
  requestId: string
  mentorId: string
  tokenHash: string
  purpose: 'mentor_request'
  expiresAt: string
  response?: 'accepted' | 'declined'
  respondedAt?: string
  responseReason?: string
}

export interface AuditEvent {
  id: string
  organizationId: string
  actorType: 'user' | 'mentor' | 'system'
  actorUserId?: string
  actorEmail?: string
  entityType: 'mentor_request' | 'artifact' | 'meeting' | 'auth' | 'mentor'
  entityId: string
  action: string
  fromStatus?: string
  toStatus?: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface WebhookReceipt {
  id: string
  provider: 'calendly'
  eventId: string
  payload: Record<string, unknown>
  receivedAt: string
  processedAt?: string
}

export interface OutboxEvent {
  id: string
  topic: string
  aggregateType: string
  aggregateId: string
  payload: Record<string, unknown>
  status: 'pending' | 'processed'
  createdAt: string
}

export interface RequestView {
  id: string
  ventureId: string
  ventureName: string
  founderName: string
  mentorId?: string
  mentorName?: string
  stage: string
  trl: number
  brl: number
  status: RequestStatus
  createdAt: string
  challenge: string
  artifactList: string[]
  desiredOutcome: string
  cfeOwner?: string
  mentorNotes: string
  meetingAt?: string
  calendlyLink?: string
}


export type AiTask = 'request_brief' | 'mentor_recommendation' | 'meeting_summary'
export type AiRunStatus = 'completed' | 'failed'
export type AiFeedbackRating = 'helpful' | 'not_helpful'
export type AiFeedbackOutcome = 'accepted' | 'edited' | 'rejected'

export interface AiRun {
  id: string
  organizationId: string
  userId: string
  task: AiTask
  provider: 'heuristic' | 'openai'
  requestedProvider: 'auto' | 'heuristic' | 'openai'
  model: string
  promptVersion: string
  inputPayload: Record<string, unknown>
  outputPayload?: Record<string, unknown>
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
  status: AiRunStatus
  errorMessage?: string
  createdAt: string
}

export interface AiRunFeedback {
  id: string
  aiRunId: string
  organizationId: string
  userId: string
  rating: AiFeedbackRating
  outcome: AiFeedbackOutcome
  notes?: string
  editedOutput?: Record<string, unknown>
  createdAt: string
}
