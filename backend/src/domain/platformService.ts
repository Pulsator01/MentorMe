import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import type {
  AiGateway,
  EmailGateway,
  GoogleOAuthGateway,
  PlatformRepository,
  QueuePublisher,
  StorageService,
} from './interfaces'
import type { PasswordHasher } from '../infra/passwordHasher'
import { artifactStorageKey, futureIso, nextPrefixedId, nowIso, randomToken, sha256 } from './id'
import type {
  Artifact,
  AuditEvent,
  Invitation,
  MentorProfile,
  MentorRequest,
  OAuthAccount,
  PasswordResetTokenRecord,
  RequestView,
  User,
  UserRole,
  Venture,
  VentureMembership,
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

const requestBriefSchema = z.object({
  ventureName: z.string().min(2),
  domain: z.string().min(2).optional(),
  stage: z.string().min(2).optional(),
  trl: z.number().int().min(1).max(9).optional(),
  brl: z.number().int().min(1).max(9).optional(),
  rawNotes: z.string().min(30),
  desiredOutcomeHint: z.string().min(5).optional(),
  artifactRefs: z.array(z.string().min(1)).default([]),
})

const meetingSummarySchema = z.object({
  ventureName: z.string().min(2),
  mentorName: z.string().min(2).optional(),
  requestChallenge: z.string().min(5).optional(),
  desiredOutcome: z.string().min(5).optional(),
  meetingNotes: z.string().min(30),
})

const mentorRecommendationSchema = z.object({
  ventureName: z.string().min(2),
  domain: z.string().min(2).optional(),
  stage: z.string().min(2).optional(),
  trl: z.number().int().min(1).max(9).optional(),
  brl: z.number().int().min(1).max(9).optional(),
  challenge: z.string().min(10),
  desiredOutcome: z.string().min(5).optional(),
  maxResults: z.number().int().min(1).max(5).optional(),
})

const lowercaseEmail = z
  .string()
  .min(3)
  .max(254)
  .email()
  .transform((value) => value.trim().toLowerCase())

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(256, 'Password must be at most 256 characters')

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: lowercaseEmail,
  password: passwordSchema,
  role: z.enum(['founder', 'student']).default('founder'),
  organizationId: z.string().min(1).optional(),
  cohortId: z.string().min(1).optional(),
})

const loginSchema = z.object({
  email: lowercaseEmail,
  password: z.string().min(1).max(256),
})

const forgotPasswordSchema = z.object({
  email: lowercaseEmail,
})

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: passwordSchema,
})

const googleAuthorizeSchema = z.object({
  redirectAfter: z.string().min(1).max(512).optional(),
})

const googleCallbackSchema = z.object({
  code: z.string().min(10).max(2048),
  state: z.string().min(10).max(2048),
})

const founderOnboardingSchema = z.object({
  ventureName: z.string().trim().min(2).max(120),
  domain: z.string().trim().min(2).max(80),
  stage: z.string().trim().min(2).max(60),
  trl: z.number().int().min(1).max(9),
  brl: z.number().int().min(1).max(9),
  location: z.string().trim().min(2).max(120).optional(),
  summary: z.string().trim().min(20).max(2000),
  nextMilestone: z.string().trim().min(5).max(400),
  cohortId: z.string().trim().min(1).optional(),
})

const studentOnboardingSchema = z
  .object({
    ventureId: z.string().trim().min(1).optional(),
    invitationToken: z.string().trim().min(20).optional(),
  })
  .superRefine((value, context) => {
    if (!value.ventureId && !value.invitationToken) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide a ventureId or invitationToken',
        path: [],
      })
    }
  })

const inviteRoleSchema = z.enum(['founder', 'student', 'cfe', 'mentor', 'admin'])

const createInvitationSchema = z.object({
  email: lowercaseEmail,
  role: inviteRoleSchema,
  ventureId: z.string().trim().min(1).optional(),
  cohortId: z.string().trim().min(1).optional(),
  message: z.string().trim().max(800).optional(),
  expiresInDays: z.number().int().min(1).max(60).optional(),
})

const jwtTextEncoder = new TextEncoder()
const PASSWORD_RESET_TTL_HOURS = 1
const SESSION_TTL_HOURS = 24 * 30
const OAUTH_STATE_TTL_SECONDS = 600
const OAUTH_STATE_AUDIENCE = 'mentor-me-oauth-state'
const INVITATION_TTL_DAYS_DEFAULT = 14

type ServiceDeps = {
  repository: PlatformRepository
  email: EmailGateway
  storage: StorageService
  queue: QueuePublisher
  ai: AiGateway
  passwordHasher: PasswordHasher
  googleOAuth?: GoogleOAuthGateway
  jwtIssuer: string
  jwtAudience: string
  jwtSecret: string
  defaultOrganizationId: string
  appBaseUrl: string
}

export class PlatformService {
  constructor(private readonly deps: ServiceDeps) {}

  async requestMagicLink(email: string) {
    const normalized = email.trim().toLowerCase()
    const user = await this.deps.repository.findUserByEmail(normalized)

    if (!user) {
      return { accepted: true }
    }

    const token = randomToken()
    await this.deps.repository.saveMagicLink({
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

    await this.recordOutbox('auth.magic_link_requested', 'auth', user.id, { email: user.email })

    return { accepted: true, token }
  }

  async verifyMagicLink(token: string) {
    const record = (await this.deps.repository.listMagicLinks()).find((item) => item.tokenHash === sha256(token))

    if (!record || record.consumedAt || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid or expired magic link')
    }

    const user = await this.requireUser(record.userId)
    await this.deps.repository.saveMagicLink({ ...record, consumedAt: nowIso() })
    return await this.issueSessionForUser(user, 'auth.magic_link_verified')
  }

  async register(input: unknown) {
    const payload = registerSchema.parse(input)
    const existing = await this.deps.repository.findUserByEmail(payload.email)

    if (existing) {
      throw new Error('An account with that email already exists')
    }

    const passwordHash = await this.deps.passwordHasher.hash(payload.password)
    const userId = await this.allocateUserId(payload.role)
    const organizationId = payload.organizationId || (await this.resolveDefaultOrganizationId())

    const user: User = {
      id: userId,
      organizationId,
      cohortId: payload.cohortId,
      email: payload.email,
      name: payload.name.trim(),
      role: payload.role,
      passwordHash,
      emailVerified: false,
      lastLoginAt: nowIso(),
    }

    await this.deps.repository.saveUser(user)

    await this.deps.email.sendWelcome({
      email: user.email,
      name: user.name,
    })

    await this.recordOutbox('auth.user_registered', 'auth', user.id, {
      email: user.email,
      role: user.role,
    })

    return await this.issueSessionForUser(user, 'auth.password_register', {
      role: user.role,
    })
  }

  async login(input: unknown) {
    const payload = loginSchema.parse(input)
    const user = await this.deps.repository.findUserByEmail(payload.email)

    if (!user || !user.passwordHash) {
      throw new Error('Invalid email or password')
    }

    const valid = await this.deps.passwordHasher.verify(user.passwordHash, payload.password)

    if (!valid) {
      throw new Error('Invalid email or password')
    }

    const refreshed: User = { ...user, lastLoginAt: nowIso() }
    await this.deps.repository.saveUser(refreshed)
    return await this.issueSessionForUser(refreshed, 'auth.password_login')
  }

  async requestPasswordReset(input: unknown) {
    const payload = forgotPasswordSchema.parse(input)
    const user = await this.deps.repository.findUserByEmail(payload.email)

    if (!user) {
      return { accepted: true as const }
    }

    const token = randomToken()
    const record: PasswordResetTokenRecord = {
      id: `prt-${randomToken().slice(0, 10)}`,
      userId: user.id,
      tokenHash: sha256(token),
      expiresAt: futureIso(PASSWORD_RESET_TTL_HOURS),
    }
    await this.deps.repository.savePasswordResetToken(record)

    await this.deps.email.sendPasswordReset({
      email: user.email,
      name: user.name,
      token,
    })

    await this.recordOutbox('auth.password_reset_requested', 'auth', user.id, { email: user.email })

    return { accepted: true as const, token }
  }

  async resetPassword(input: unknown) {
    const payload = resetPasswordSchema.parse(input)
    const record = await this.deps.repository.findPasswordResetTokenByHash(sha256(payload.token))

    if (!record || record.consumedAt || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid or expired password reset link')
    }

    const user = await this.requireUser(record.userId)
    const passwordHash = await this.deps.passwordHasher.hash(payload.password)
    const updated: User = { ...user, passwordHash, lastLoginAt: nowIso() }
    await this.deps.repository.saveUser(updated)
    await this.deps.repository.markPasswordResetTokenConsumed(record.id, nowIso())
    await this.deps.repository.revokeAllSessionsForUser(user.id)

    await this.recordAudit({
      entityType: 'auth',
      entityId: user.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'auth.password_reset_completed',
      payload: {},
    })

    return await this.issueSessionForUser(updated, 'auth.password_reset_completed')
  }

  async changePassword(user: User, input: unknown) {
    const payload = changePasswordSchema.parse(input)
    const stored = await this.requireUser(user.id)

    if (!stored.passwordHash) {
      throw new Error('This account does not have a password set. Use the password-reset flow to set one.')
    }

    const valid = await this.deps.passwordHasher.verify(stored.passwordHash, payload.currentPassword)

    if (!valid) {
      throw new Error('Current password is incorrect')
    }

    if (payload.currentPassword === payload.newPassword) {
      throw new Error('New password must differ from the current password')
    }

    const passwordHash = await this.deps.passwordHasher.hash(payload.newPassword)
    const updated: User = { ...stored, passwordHash }
    await this.deps.repository.saveUser(updated)
    await this.deps.repository.revokeAllSessionsForUser(user.id)

    await this.recordAudit({
      entityType: 'auth',
      entityId: user.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'auth.password_changed',
      payload: {},
    })

    return await this.issueSessionForUser(updated, 'auth.password_changed')
  }

  async googleAuthorizeUrl(input: unknown) {
    const oauth = this.requireGoogleOAuth()
    const payload = googleAuthorizeSchema.parse(input ?? {})
    const state = await this.signOAuthState(payload.redirectAfter)
    return {
      authorizeUrl: oauth.buildAuthorizeUrl(state),
      state,
    }
  }

  async googleOAuthCallback(input: unknown) {
    const oauth = this.requireGoogleOAuth()
    const payload = googleCallbackSchema.parse(input)
    const stateClaims = await this.verifyOAuthState(payload.state)

    const tokens = await oauth.exchangeCode(payload.code)
    const profile = await oauth.fetchProfile(tokens.accessToken)

    if (!profile.emailVerified) {
      throw new Error('Google account email is not verified')
    }

    const linkedAccount = await this.deps.repository.findOAuthAccount('google', profile.providerAccountId)
    let user: User | undefined
    let isNewUser = false
    let isNewLink = false

    if (linkedAccount) {
      user = await this.requireUser(linkedAccount.userId)
    } else {
      const existingByEmail = await this.deps.repository.findUserByEmail(profile.email.toLowerCase())

      if (existingByEmail) {
        user = existingByEmail
        isNewLink = true
      } else {
        const organizationId = await this.resolveDefaultOrganizationId()
        const userId = await this.allocateUserId('founder')
        user = {
          id: userId,
          organizationId,
          email: profile.email.toLowerCase(),
          name: profile.name,
          role: 'founder',
          emailVerified: true,
          emailVerifiedAt: nowIso(),
          lastLoginAt: nowIso(),
        }
        isNewUser = true
        isNewLink = true
        await this.deps.repository.saveUser(user)
        await this.deps.email.sendWelcome({ email: user.email, name: user.name })
      }
    }

    if (!user) {
      throw new Error('Failed to resolve Google user')
    }

    if (isNewLink) {
      const account: OAuthAccount = {
        id: `oauth-${randomToken().slice(0, 10)}`,
        userId: user.id,
        provider: 'google',
        providerAccountId: profile.providerAccountId,
        email: profile.email,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresInSeconds
          ? new Date(Date.now() + tokens.expiresInSeconds * 1000).toISOString()
          : undefined,
      }
      await this.deps.repository.saveOAuthAccount(account)
    }

    if (!user.emailVerified) {
      const verified: User = { ...user, emailVerified: true, emailVerifiedAt: nowIso() }
      await this.deps.repository.saveUser(verified)
      user = verified
    }

    const refreshed: User = { ...user, lastLoginAt: nowIso() }
    await this.deps.repository.saveUser(refreshed)

    if (isNewUser) {
      await this.recordOutbox('auth.user_registered', 'auth', refreshed.id, {
        email: refreshed.email,
        role: refreshed.role,
        provider: 'google',
      })
    }

    const session = await this.issueSessionForUser(
      refreshed,
      isNewUser ? 'auth.google_signup' : 'auth.google_login',
      { provider: 'google' },
    )

    return {
      ...session,
      isNewUser,
      redirectAfter: stateClaims.redirectAfter,
    }
  }

  async refreshSession(refreshToken: string) {
    const session = await this.deps.repository.findSessionByHash(sha256(refreshToken))

    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid session')
    }

    const user = await this.requireUser(session.userId)
    const accessToken = await this.signAccessToken(user)
    return { accessToken, user }
  }

  async logout(refreshToken: string) {
    const session = await this.deps.repository.findSessionByHash(sha256(refreshToken))
    if (session) {
      await this.deps.repository.revokeSession(session.id)
    }
  }

  async authenticate(accessToken: string) {
    const verified = await jwtVerify(accessToken, jwtTextEncoder.encode(this.deps.jwtSecret), {
      issuer: this.deps.jwtIssuer,
      audience: this.deps.jwtAudience,
    })
    return await this.requireUser(String(verified.payload.sub))
  }

  getMe(user: User) {
    return { user }
  }

  async getOnboardingStatus(user: User) {
    const memberships = await this.deps.repository.listMemberships()
    const myMemberships = memberships.filter((membership) => membership.userId === user.id)
    const onboarded = Boolean(user.onboardedAt)

    let nextStep: 'completed' | 'founder_venture_details' | 'student_join_venture' | 'mentor_profile' | 'noop' = 'completed'

    if (!onboarded) {
      if (user.role === 'founder') {
        nextStep = myMemberships.length === 0 ? 'founder_venture_details' : 'completed'
      } else if (user.role === 'student') {
        nextStep = myMemberships.length === 0 ? 'student_join_venture' : 'completed'
      } else if (user.role === 'mentor') {
        nextStep = 'mentor_profile'
      } else {
        nextStep = 'noop'
      }
    }

    return {
      onboarded,
      onboardedAt: user.onboardedAt,
      role: user.role,
      organizationId: user.organizationId,
      cohortId: user.cohortId,
      ventureCount: myMemberships.length,
      nextStep,
    }
  }

  async getStudentJoinOptions(user: User) {
    if (user.role !== 'student') {
      throw new Error('Forbidden')
    }

    const ventures = await this.deps.repository.listVentures()
    const filtered = ventures.filter((venture) => {
      if (venture.organizationId !== user.organizationId) {
        return false
      }
      if (user.cohortId && venture.cohortId !== user.cohortId) {
        return false
      }
      return true
    })

    return {
      ventures: filtered.map((venture) => ({
        id: venture.id,
        name: venture.name,
        founderName: venture.founderName,
        domain: venture.domain,
        stage: venture.stage,
        location: venture.location,
        summary: venture.summary,
      })),
    }
  }

  async completeFounderOnboarding(user: User, input: unknown) {
    if (user.role !== 'founder') {
      throw new Error('Only founders can complete the founder onboarding wizard')
    }

    if (user.onboardedAt) {
      const memberships = (await this.deps.repository.listMemberships()).filter((membership) => membership.userId === user.id)
      if (memberships.length > 0) {
        throw new Error('Founder onboarding is already complete')
      }
    }

    const payload = founderOnboardingSchema.parse(input)
    const cohortId = payload.cohortId || user.cohortId || (await this.resolveDefaultCohortId(user.organizationId))
    const cohort = await this.requireCohortInOrganization(cohortId, user.organizationId)

    const ventureId = `vnt-${randomToken().slice(0, 8)}`
    const venture: Venture = {
      id: ventureId,
      organizationId: user.organizationId,
      cohortId: cohort.id,
      name: payload.ventureName,
      founderName: user.name,
      domain: payload.domain,
      stage: payload.stage,
      trl: payload.trl,
      brl: payload.brl,
      location: payload.location || 'Remote',
      summary: payload.summary,
      nextMilestone: payload.nextMilestone,
      programNote: '',
    }

    const savedVenture = await this.deps.repository.saveVenture(venture)

    const membership: VentureMembership = {
      id: `mem-${randomToken().slice(0, 8)}`,
      organizationId: user.organizationId,
      ventureId: savedVenture.id,
      userId: user.id,
      role: 'founder',
    }

    await this.deps.repository.saveMembership(membership)

    const updatedUser: User = {
      ...user,
      cohortId: cohort.id,
      onboardedAt: nowIso(),
    }
    const persistedUser = await this.deps.repository.saveUser(updatedUser)

    await this.recordAudit({
      organizationId: user.organizationId,
      entityType: 'auth',
      entityId: user.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'onboarding.founder_completed',
      payload: { ventureId: savedVenture.id, ventureName: savedVenture.name },
    })

    await this.recordOutbox('onboarding.completed', 'user', user.id, {
      role: user.role,
      ventureId: savedVenture.id,
    })

    return { user: persistedUser, venture: savedVenture }
  }

  async completeStudentOnboarding(user: User, input: unknown) {
    if (user.role !== 'student') {
      throw new Error('Only students can complete the student onboarding wizard')
    }

    const payload = studentOnboardingSchema.parse(input)
    let ventureId: string | undefined = payload.ventureId
    let acceptedInvitation: Invitation | undefined

    if (payload.invitationToken) {
      const invitation = await this.requireInvitation(payload.invitationToken)
      this.assertInvitationFresh(invitation)

      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new Error('This invitation was issued to a different email address')
      }

      if (invitation.role !== 'student') {
        throw new Error('Invitation role does not match this onboarding step')
      }

      if (!invitation.ventureId) {
        throw new Error('Invitation is missing a venture assignment')
      }

      ventureId = invitation.ventureId
      acceptedInvitation = invitation
    }

    if (!ventureId) {
      throw new Error('A ventureId or invitationToken is required to join a venture')
    }

    const venture = await this.requireVenture(ventureId)

    if (venture.organizationId !== user.organizationId) {
      throw new Error('This venture belongs to a different organization')
    }

    if (user.cohortId && venture.cohortId !== user.cohortId) {
      throw new Error('This venture is not in your cohort')
    }

    const memberships = await this.deps.repository.listMemberships()
    const existing = memberships.find((membership) => membership.userId === user.id && membership.ventureId === venture.id)

    if (!existing) {
      const membership: VentureMembership = {
        id: `mem-${randomToken().slice(0, 8)}`,
        organizationId: venture.organizationId,
        ventureId: venture.id,
        userId: user.id,
        role: 'student',
      }
      await this.deps.repository.saveMembership(membership)
    }

    const updatedUser: User = {
      ...user,
      cohortId: venture.cohortId,
      onboardedAt: user.onboardedAt || nowIso(),
    }
    const persistedUser = await this.deps.repository.saveUser(updatedUser)

    if (acceptedInvitation && acceptedInvitation.status === 'pending') {
      await this.deps.repository.saveInvitation({
        ...acceptedInvitation,
        status: 'accepted',
        acceptedAt: nowIso(),
        acceptedById: user.id,
        updatedAt: nowIso(),
      })
    }

    await this.recordAudit({
      organizationId: user.organizationId,
      entityType: 'auth',
      entityId: user.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'onboarding.student_completed',
      payload: { ventureId: venture.id, invitationId: acceptedInvitation?.id },
    })

    await this.recordOutbox('onboarding.completed', 'user', user.id, {
      role: user.role,
      ventureId: venture.id,
      via: acceptedInvitation ? 'invitation' : 'self_select',
    })

    return { user: persistedUser, venture }
  }

  async createInvitation(user: User, input: unknown) {
    if (user.role !== 'cfe' && user.role !== 'admin') {
      throw new Error('Only CFE/admin users can create invitations')
    }

    const payload = createInvitationSchema.parse(input)

    const existing = await this.deps.repository.findUserByEmail(payload.email)
    if (existing) {
      throw new Error('A user with that email already exists in the platform')
    }

    const pending = await this.deps.repository.findPendingInvitationByEmail(user.organizationId, payload.email)
    if (pending) {
      throw new Error('A pending invitation already exists for that email')
    }

    if (payload.ventureId) {
      const venture = await this.requireVenture(payload.ventureId)
      if (venture.organizationId !== user.organizationId) {
        throw new Error('Venture does not belong to your organization')
      }
    }

    if (payload.cohortId) {
      await this.requireCohortInOrganization(payload.cohortId, user.organizationId)
    }

    const ttlDays = payload.expiresInDays || INVITATION_TTL_DAYS_DEFAULT
    const token = randomToken()
    const invitation: Invitation = {
      id: `inv-${randomToken().slice(0, 10)}`,
      organizationId: user.organizationId,
      cohortId: payload.cohortId,
      ventureId: payload.ventureId,
      email: payload.email,
      role: payload.role,
      tokenHash: sha256(token),
      status: 'pending',
      message: payload.message,
      expiresAt: futureIso(ttlDays * 24),
      createdById: user.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    const saved = await this.deps.repository.saveInvitation(invitation)

    const organization = this.resolveOrganizationName(user.organizationId)

    await this.deps.email.sendInvitation({
      email: saved.email,
      inviterName: user.name,
      organizationName: organization,
      role: saved.role,
      token,
      message: saved.message,
    })

    await this.recordAudit({
      organizationId: user.organizationId,
      entityType: 'auth',
      entityId: saved.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'invitation.created',
      payload: { email: saved.email, role: saved.role },
    })

    await this.recordOutbox('invitation.created', 'invitation', saved.id, {
      email: saved.email,
      role: saved.role,
    })

    return {
      invitation: this.toPublicInvitation(saved),
      token,
    }
  }

  async listInvitations(user: User) {
    if (user.role !== 'cfe' && user.role !== 'admin') {
      throw new Error('Only CFE/admin users can list invitations')
    }

    const records = await this.deps.repository.listInvitationsByOrganization(user.organizationId)
    return {
      invitations: records.map((record) => this.toPublicInvitation(record)),
    }
  }

  async previewInvitation(token: string) {
    const invitation = await this.requireInvitation(token)
    const status = this.computeEffectiveStatus(invitation)
    const organization = this.resolveOrganizationName(invitation.organizationId)
    let venture: Venture | undefined

    if (invitation.ventureId) {
      venture = await this.deps.repository.findVentureById(invitation.ventureId)
    }

    return {
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organizationName: organization,
        ventureName: venture?.name,
        message: invitation.message,
        status,
        expiresAt: invitation.expiresAt,
      },
    }
  }

  async acceptInvitation(user: User, token: string) {
    const invitation = await this.requireInvitation(token)
    this.assertInvitationFresh(invitation)

    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new Error('This invitation was issued to a different email address')
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new Error('This invitation is for a different organization')
    }

    if (invitation.role !== user.role) {
      throw new Error(`Invitation role mismatch (expected ${invitation.role}, current ${user.role})`)
    }

    let updatedUser: User = { ...user }
    let venture: Venture | undefined

    if (invitation.ventureId) {
      venture = await this.requireVenture(invitation.ventureId)
      if (venture.organizationId !== user.organizationId) {
        throw new Error('Invitation venture is in another organization')
      }

      const memberships = await this.deps.repository.listMemberships()
      const has = memberships.some((membership) => membership.userId === user.id && membership.ventureId === venture!.id)

      if (!has) {
        const membership: VentureMembership = {
          id: `mem-${randomToken().slice(0, 8)}`,
          organizationId: user.organizationId,
          ventureId: venture.id,
          userId: user.id,
          role: invitation.role === 'founder' ? 'founder' : 'student',
        }
        await this.deps.repository.saveMembership(membership)
      }

      if (!user.cohortId) {
        updatedUser = { ...updatedUser, cohortId: venture.cohortId }
      }
    } else if (invitation.cohortId && !user.cohortId) {
      await this.requireCohortInOrganization(invitation.cohortId, user.organizationId)
      updatedUser = { ...updatedUser, cohortId: invitation.cohortId }
    }

    if (!updatedUser.onboardedAt) {
      updatedUser = { ...updatedUser, onboardedAt: nowIso() }
    }

    const persistedUser = await this.deps.repository.saveUser(updatedUser)

    await this.deps.repository.saveInvitation({
      ...invitation,
      status: 'accepted',
      acceptedAt: nowIso(),
      acceptedById: user.id,
      updatedAt: nowIso(),
    })

    await this.recordAudit({
      organizationId: user.organizationId,
      entityType: 'auth',
      entityId: invitation.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'invitation.accepted',
      payload: { ventureId: venture?.id },
    })

    return { user: persistedUser, venture }
  }

  async revokeInvitation(user: User, invitationId: string) {
    if (user.role !== 'cfe' && user.role !== 'admin') {
      throw new Error('Only CFE/admin users can revoke invitations')
    }

    const invitation = await this.deps.repository.findInvitationById(invitationId)
    if (!invitation) {
      throw new Error('Invitation not found')
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new Error('Invitation belongs to another organization')
    }

    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be revoked')
    }

    const revoked = await this.deps.repository.saveInvitation({
      ...invitation,
      status: 'revoked',
      revokedAt: nowIso(),
      updatedAt: nowIso(),
    })

    await this.recordAudit({
      organizationId: user.organizationId,
      entityType: 'auth',
      entityId: invitation.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'invitation.revoked',
      payload: { email: invitation.email },
    })

    return { invitation: this.toPublicInvitation(revoked) }
  }

  async listVentures(user: User) {
    const [memberships, ventures] = await Promise.all([
      this.deps.repository.listMemberships(),
      this.deps.repository.listVentures(),
    ])

    if (user.role === 'cfe') {
      return { ventures }
    }

    const ventureIds = memberships.filter((membership) => membership.userId === user.id).map((membership) => membership.ventureId)
    return { ventures: ventures.filter((venture) => ventureIds.includes(venture.id)) }
  }

  async getVenture(user: User, ventureId: string) {
    const venture = await this.authorizeVentureAccess(user, ventureId)
    return { venture }
  }

  async listRequests(user: User) {
    if (user.role === 'cfe') {
      return { requests: await this.listRequestViews() }
    }

    const memberships = await this.deps.repository.listMemberships()
    const requestViews = await this.listRequestViews()
    const ventureIds = memberships
      .filter((membership) => membership.userId === user.id)
      .map((membership) => membership.ventureId)

    return {
      requests: requestViews.filter((request) => ventureIds.includes(request.ventureId)),
    }
  }

  async listRequestsForVenture(user: User, ventureId: string) {
    await this.authorizeVentureAccess(user, ventureId)
    return {
      requests: (await this.listRequestViews()).filter((request) => request.ventureId === ventureId),
    }
  }

  async createRequest(user: User, ventureId: string, input: unknown) {
    if (user.role !== 'founder') {
      throw new Error('Only founders can submit requests')
    }

    const venture = await this.authorizeVentureAccess(user, ventureId)
    const payload = requestCreateSchema.parse(input)
    const existingRequestIds = (await this.deps.repository.listRequests()).map((request) => request.id)
    const requestId = nextPrefixedId(
      'REQ',
      existingRequestIds,
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

    await this.deps.repository.saveRequest(request)
    const reversedArtifactRefs = [...payload.artifactRefs].reverse()
    for (const [index, artifactName] of reversedArtifactRefs.entries()) {
      const artifactId = `art-${String(reversedArtifactRefs.length - index).padStart(2, '0')}`
      await this.deps.repository.saveArtifact({
        id: artifactId,
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
    }
    await this.deps.repository.replaceShortlistsForRequest(
      request.id,
      payload.preferredMentorIds.map((mentorId, index) => ({
        id: `mrs-${request.id}-${index + 1}`,
        requestId: request.id,
        mentorId,
        rank: index + 1,
      })),
    )

    await this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.submitted',
      toStatus: 'cfe_review',
      payload: { ventureId },
    })
    await this.recordOutbox('request.submitted', 'mentor_request', request.id, { ventureId, requestId: request.id })

    return { request: await this.requireRequestView(request.id) }
  }

  async submitRequest(user: User, requestId: string) {
    if (user.role !== 'founder') {
      throw new Error('Only founders can resubmit requests')
    }

    const request = await this.authorizeRequestAccess(user, requestId)

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
    await this.deps.repository.saveRequest(next)
    await this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: request.status === 'draft' ? 'request.submitted' : 'request.resubmitted',
      fromStatus: request.status,
      toStatus: next.status,
      payload: {},
    })
    await this.recordOutbox(
      request.status === 'draft' ? 'request.submitted' : 'request.resubmitted',
      'mentor_request',
      request.id,
      { ventureId: request.ventureId, requestId: request.id },
    )

    return { request: await this.requireRequestView(request.id) }
  }

  async approveRequest(user: User, requestId: string, input: unknown) {
    this.assertRole(user, 'cfe')
    const payload = approveSchema.parse(input)
    const request = await this.requireRequest(requestId)
    const cfeOwner = await this.deps.repository.findUserByEmail(`${payload.ownerName.toLowerCase().replace(/\s+/g, '.')}@mentorme.test`)
    const next = {
      ...request,
      status: 'awaiting_mentor' as const,
      updatedAt: nowIso(),
      cfeOwnerId: cfeOwner?.id || user.id,
    }
    await this.deps.repository.saveRequest(next)
    await this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.approved',
      fromStatus: request.status,
      toStatus: next.status,
      payload: { ownerName: payload.ownerName },
    })
    await this.recordOutbox('request.approved', 'mentor_request', request.id, { ownerName: payload.ownerName })
    return { request: await this.requireRequestView(request.id) }
  }

  async returnRequest(user: User, requestId: string, input: unknown) {
    this.assertRole(user, 'cfe')
    const payload = returnSchema.parse(input)
    const request = await this.requireRequest(requestId)
    const next = {
      ...request,
      status: 'needs_work' as const,
      mentorNotes: payload.reason,
      updatedAt: nowIso(),
    }
    await this.deps.repository.saveRequest(next)
    await this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.returned',
      fromStatus: request.status,
      toStatus: next.status,
      payload: { reason: payload.reason },
    })
    await this.recordOutbox('request.returned', 'mentor_request', request.id, { reason: payload.reason })
    return { request: await this.requireRequestView(request.id) }
  }

  async closeRequest(user: User, requestId: string) {
    this.assertRole(user, 'cfe')
    const request = await this.requireRequest(requestId)
    const next = { ...request, status: 'closed' as const, updatedAt: nowIso() }
    await this.deps.repository.saveRequest(next)
    await this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'request.closed',
      fromStatus: request.status,
      toStatus: 'closed',
      payload: {},
    })
    return { request: await this.requireRequestView(request.id) }
  }

  async listMentors(user: User) {
    const mentors = await this.deps.repository.listMentors()
    return {
      mentors: user.role === 'cfe' ? mentors : mentors.filter((mentor) => mentor.visibility === 'Active'),
    }
  }

  async createMentor(user: User, input: Omit<MentorProfile, 'organizationId'>) {
    this.assertRole(user, 'cfe')
    const mentor = {
      ...input,
      organizationId: user.organizationId,
    }
    await this.deps.repository.saveMentor(mentor)
    await this.recordAudit({
      entityType: 'mentor',
      entityId: mentor.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'mentor.created',
      payload: {},
    })
    return { mentor }
  }

  async updateMentor(user: User, mentorId: string, updates: Partial<MentorProfile>) {
    this.assertRole(user, 'cfe')
    const mentor = await this.deps.repository.findMentorById(mentorId)
    if (!mentor) {
      throw new Error('Mentor not found')
    }
    const next = {
      ...mentor,
      ...updates,
      id: mentor.id,
      organizationId: mentor.organizationId,
    }
    await this.deps.repository.saveMentor(next)
    await this.recordAudit({
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
    await this.authorizeRequestAccess(user, requestId)
    const payload = presignSchema.parse(input)
    const existingArtifactIds = (await this.deps.repository.listArtifactsForRequest(requestId)).map((artifact) =>
      artifact.id.replace('art-', 'art-'),
    )
    const artifactId = nextPrefixedId(
      'art',
      existingArtifactIds,
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

    await this.deps.repository.saveArtifact(artifact)
    await this.recordAudit({
      entityType: 'artifact',
      entityId: artifact.id,
      actorType: 'user',
      actorUserId: user.id,
      action: 'artifact.presigned',
      payload: { requestId },
    })

    return { artifact, uploadUrl: upload.uploadUrl }
  }

  async completeArtifact(user: User, requestId: string, artifactId: string) {
    await this.authorizeRequestAccess(user, requestId)
    const artifact = await this.deps.repository.findArtifactById(artifactId)

    if (!artifact || artifact.requestId !== requestId) {
      throw new Error('Artifact not found')
    }

    const next = {
      ...artifact,
      status: 'uploaded' as const,
      completedAt: nowIso(),
    }
    await this.deps.repository.saveArtifact(next)
    await this.recordAudit({
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
    const request = await this.requireRequest(requestId)
    if (!request.mentorId) {
      throw new Error('Cannot create mentor outreach without a selected mentor')
    }
    const mentor = await this.requireMentor(request.mentorId)
    const token = randomToken()
    await this.deps.repository.saveExternalActionToken({
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
    await this.recordOutbox('mentor.outreach_created', 'mentor_request', requestId, { mentorId: mentor.id })
    return { mentorActionToken: token }
  }

  async getMentorAction(token: string) {
    const actionToken = await this.requireExternalToken(token)
    const mentor = await this.deps.repository.findMentorById(actionToken.mentorId)

    if (!mentor) {
      throw new Error('Mentor not found')
    }

    return {
      mentor,
      mentorAction: {
        expiresAt: actionToken.expiresAt,
        purpose: actionToken.purpose,
        respondedAt: actionToken.respondedAt,
        response: actionToken.response,
        responseReason: actionToken.responseReason,
      },
      request: await this.requireRequestView(actionToken.requestId),
    }
  }

  async mentorRespond(token: string, input: unknown) {
    const payload = mentorRespondSchema.parse(input)
    const actionToken = await this.requireExternalToken(token)

    if (actionToken.respondedAt) {
      throw new Error('Action link has already been used')
    }

    await this.deps.repository.saveExternalActionToken({
      ...actionToken,
      response: payload.decision,
      respondedAt: nowIso(),
      responseReason: payload.reason,
    })

    const request = await this.requireRequest(actionToken.requestId)

    if (payload.decision === 'accepted') {
      await this.recordAudit({
        entityType: 'mentor_request',
        entityId: request.id,
        actorType: 'mentor',
        action: 'mentor.accepted',
        fromStatus: request.status,
        toStatus: request.status,
        payload: { mentorId: actionToken.mentorId },
      })
      await this.recordOutbox('mentor.accepted', 'mentor_request', request.id, { mentorId: actionToken.mentorId })

      return { decision: payload.decision, request: await this.requireRequestView(request.id) }
    }

    const next = {
      ...request,
      mentorId: undefined,
      status: 'awaiting_mentor' as const,
      updatedAt: nowIso(),
    }
    await this.deps.repository.saveRequest(next)
    await this.recordAudit({
      entityType: 'mentor_request',
      entityId: request.id,
      actorType: 'mentor',
      action: 'mentor.declined',
      fromStatus: request.status,
      toStatus: next.status,
      payload: { mentorId: actionToken.mentorId, reason: payload.reason || '' },
    })
    await this.recordOutbox('mentor.declined', 'mentor_request', request.id, {
      mentorId: actionToken.mentorId,
      reason: payload.reason || '',
    })

    return { decision: payload.decision, request: await this.requireRequestView(request.id) }
  }

  async mentorSchedule(token: string, input: unknown) {
    const payload = scheduleSchema.parse(input)
    const actionToken = await this.requireExternalToken(token)

    if (actionToken.response === 'declined') {
      throw new Error('Cannot schedule a request after declining it')
    }

    const request = await this.requireRequest(actionToken.requestId)
    const existingMeetingIds = (await this.deps.repository.listMeetingsForRequest(request.id)).map((meeting) => meeting.id)
    const meetingId = nextPrefixedId(
      'meet',
      existingMeetingIds,
    )
    await this.deps.repository.saveMeeting({
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
    await this.deps.repository.saveRequest(next)
    await this.recordAudit({
      entityType: 'meeting',
      entityId: meetingId,
      actorType: 'mentor',
      action: 'meeting.scheduled',
      payload: { requestId: request.id },
    })
    await this.recordOutbox('meeting.scheduled', 'mentor_request', request.id, { meetingId })
    return { request: await this.requireRequestView(request.id) }
  }

  async mentorFeedback(token: string, input: unknown) {
    const payload = feedbackSchema.parse(input)
    const actionToken = await this.requireExternalToken(token)
    const request = await this.requireRequest(actionToken.requestId)
    const meeting = (await this.deps.repository.listMeetingsForRequest(request.id))[0]

    if (!meeting) {
      throw new Error('No meeting exists for this request')
    }

    await this.deps.repository.saveFeedback({
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
    await this.deps.repository.saveRequest(next)
    await this.recordAudit({
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
    await this.recordOutbox('request.feedback_recorded', 'mentor_request', request.id, {})
    return { request: await this.requireRequestView(request.id) }
  }

  async calendlyWebhook(eventId: string, payload: Record<string, unknown>) {
    const duplicate = await this.deps.repository.findWebhookReceipt('calendly', eventId)

    if (duplicate) {
      return { accepted: true, duplicate: true }
    }

    await this.deps.repository.saveWebhookReceipt({
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
      const request = await this.requireRequest(requestId)
      const scheduledAt = String(
        (payload.payload as { scheduled_at?: string } | undefined)?.scheduled_at || request.meetingAt || nowIso(),
      )
      const joinLink = String(
        (payload.payload as { event?: string; invitee?: string } | undefined)?.event ||
          (payload.payload as { event?: string; invitee?: string } | undefined)?.invitee ||
          request.calendlyLink ||
          '',
      )
      const existingMeetingIds = (await this.deps.repository.listMeetingsForRequest(request.id)).map((meeting) => meeting.id)
      const meetingId = nextPrefixedId(
        'meet',
        existingMeetingIds,
      )
      await this.deps.repository.saveMeeting({
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
      await this.deps.repository.saveRequest({
        ...request,
        status: 'scheduled',
        meetingAt: scheduledAt,
        calendlyLink: joinLink,
        updatedAt: nowIso(),
      })
    }

    return { accepted: true, duplicate: false }
  }

  async generateRequestBrief(user: User, input: unknown) {
    if (!['founder', 'student', 'cfe'].includes(user.role)) {
      throw new Error('Forbidden')
    }

    const payload = requestBriefSchema.parse(input)
    return {
      suggestion: await this.deps.ai.generateRequestBrief(payload),
    }
  }

  async generateMeetingSummary(user: User, input: unknown) {
    if (!['founder', 'student', 'cfe'].includes(user.role)) {
      throw new Error('Forbidden')
    }

    const payload = meetingSummarySchema.parse(input)
    return {
      summary: await this.deps.ai.generateMeetingSummary(payload),
    }
  }

  async generateMentorRecommendations(user: User, input: unknown) {
    if (!['founder', 'student', 'cfe'].includes(user.role)) {
      throw new Error('Forbidden')
    }

    const payload = mentorRecommendationSchema.parse(input)
    const candidates = (await this.deps.repository.listMentors())
      .filter((mentor) => mentor.visibility === 'Active')
      .map((mentor) => ({
        id: mentor.id,
        name: mentor.name,
        title: mentor.title,
        location: mentor.location,
        focus: mentor.focus,
        stages: mentor.stages,
        domains: mentor.domains,
        tolerance: mentor.tolerance,
        monthlyLimit: mentor.monthlyLimit,
        responseWindow: mentor.responseWindow,
        bio: mentor.bio,
      }))

    if (candidates.length === 0) {
      return {
        recommendations: {
          provider: 'heuristic' as const,
          routingNote: 'No active mentors are available right now. Ask CFE to reactivate or add mentors before routing.',
          searchTags: [],
          shortlist: [],
        },
      }
    }

    return {
      recommendations: await this.deps.ai.recommendMentors({
        ...payload,
        candidates,
      }),
    }
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

  private async issueSessionForUser(user: User, action: string, payload: Record<string, unknown> = {}) {
    const refreshToken = randomToken()
    const session = await this.deps.repository.saveSession({
      id: `sess-${randomToken().slice(0, 10)}`,
      userId: user.id,
      refreshTokenHash: sha256(refreshToken),
      expiresAt: futureIso(SESSION_TTL_HOURS),
    })
    const accessToken = await this.signAccessToken(user)

    await this.recordAudit({
      entityType: 'auth',
      entityId: session.id,
      actorType: 'user',
      actorUserId: user.id,
      action,
      payload,
    })

    return { accessToken, refreshToken, user }
  }

  private async signOAuthState(redirectAfter?: string) {
    const nonce = randomToken().slice(0, 16)
    return await new SignJWT({ nonce, redirectAfter: redirectAfter || '' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(this.deps.jwtIssuer)
      .setAudience(OAUTH_STATE_AUDIENCE)
      .setExpirationTime(`${OAUTH_STATE_TTL_SECONDS}s`)
      .sign(jwtTextEncoder.encode(this.deps.jwtSecret))
  }

  private async verifyOAuthState(state: string): Promise<{ nonce: string; redirectAfter?: string }> {
    try {
      const verified = await jwtVerify(state, jwtTextEncoder.encode(this.deps.jwtSecret), {
        issuer: this.deps.jwtIssuer,
        audience: OAUTH_STATE_AUDIENCE,
      })
      const nonce = String(verified.payload.nonce || '')
      const redirectAfter = verified.payload.redirectAfter ? String(verified.payload.redirectAfter) : undefined

      if (!nonce) {
        throw new Error('OAuth state missing nonce')
      }

      return { nonce, redirectAfter: redirectAfter || undefined }
    } catch {
      throw new Error('OAuth state is invalid or has expired')
    }
  }

  private requireGoogleOAuth() {
    if (!this.deps.googleOAuth) {
      throw new Error('Google sign-in is not configured on this server')
    }
    return this.deps.googleOAuth
  }

  private async resolveDefaultOrganizationId(): Promise<string> {
    const users = await this.deps.repository.listUsers()
    return users[0]?.organizationId || this.deps.defaultOrganizationId
  }

  private async allocateUserId(role: UserRole) {
    const users = await this.deps.repository.listUsers()
    const prefix = `user-${role}-`
    const taken = new Set(users.map((existing) => existing.id))
    let suffix = randomToken().slice(0, 8)
    while (taken.has(`${prefix}${suffix}`)) {
      suffix = randomToken().slice(0, 8)
    }
    return `${prefix}${suffix}`
  }

  private assertRole(user: User, role: UserRole) {
    if (user.role !== role) {
      throw new Error('Forbidden')
    }
  }

  private async authorizeVentureAccess(user: User, ventureId: string) {
    const venture = await this.requireVenture(ventureId)

    if (user.role === 'cfe') {
      return venture
    }

    const membership = (await this.deps.repository.listMemberships())
      .find((item) => item.userId === user.id && item.ventureId === ventureId)

    if (!membership) {
      throw new Error('Forbidden')
    }

    return venture
  }

  private async authorizeRequestAccess(user: User, requestId: string) {
    const request = await this.requireRequest(requestId)
    await this.authorizeVentureAccess(user, request.ventureId)
    return request
  }

  private async requireRequestView(requestId: string) {
    const request = (await this.listRequestViews()).find((item) => item.id === requestId)
    if (!request) {
      throw new Error('Request not found')
    }
    return request
  }

  private async listRequestViews(): Promise<RequestView[]> {
    const [ventures, mentors, users, requests] = await Promise.all([
      this.deps.repository.listVentures(),
      this.deps.repository.listMentors(),
      this.deps.repository.listUsers(),
      this.deps.repository.listRequests(),
    ])
    const venturesById = new Map(ventures.map((venture) => [venture.id, venture]))
    const mentorsById = new Map(mentors.map((mentor) => [mentor.id, mentor]))
    const usersById = new Map(users.map((user) => [user.id, user]))

    return await Promise.all(requests.map(async (request) => {
      const artifactList = (await this.deps.repository.listArtifactsForRequest(request.id)).map((artifact) => artifact.filename)
      const venture = venturesById.get(request.ventureId)
      const mentor = request.mentorId ? mentorsById.get(request.mentorId) : undefined
      const cfeOwner = request.cfeOwnerId ? usersById.get(request.cfeOwnerId)?.name : undefined

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
        artifactList,
        desiredOutcome: request.desiredOutcome,
        cfeOwner,
        mentorNotes: request.mentorNotes,
        meetingAt: request.meetingAt,
        calendlyLink: request.calendlyLink,
      }
    }))
  }

  private async requireUser(userId: string) {
    const user = await this.deps.repository.findUserById(userId)
    if (!user) {
      throw new Error('User not found')
    }
    return user
  }

  private async requireVenture(ventureId: string) {
    const venture = await this.deps.repository.findVentureById(ventureId)
    if (!venture) {
      throw new Error('Venture not found')
    }
    return venture
  }

  private async requireRequest(requestId: string) {
    const request = await this.deps.repository.findRequestById(requestId)
    if (!request) {
      throw new Error('Request not found')
    }
    return request
  }

  private async requireMentor(mentorId: string) {
    const mentor = await this.deps.repository.findMentorById(mentorId)
    if (!mentor) {
      throw new Error('Mentor not found')
    }
    return mentor
  }

  private async requireExternalToken(token: string) {
    const record = await this.deps.repository.findExternalActionTokenByHash(sha256(token))

    if (!record || new Date(record.expiresAt).getTime() < Date.now()) {
      throw new Error('Invalid or expired action token')
    }

    return record
  }

  private async requireInvitation(token: string) {
    const invitation = await this.deps.repository.findInvitationByHash(sha256(token))
    if (!invitation) {
      throw new Error('Invitation not found')
    }
    return invitation
  }

  private assertInvitationFresh(invitation: Invitation) {
    const status = this.computeEffectiveStatus(invitation)
    if (status !== 'pending') {
      throw new Error(`Invitation is ${status}`)
    }
  }

  private computeEffectiveStatus(invitation: Invitation): Invitation['status'] {
    if (invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() < Date.now()) {
      return 'expired'
    }
    return invitation.status
  }

  private toPublicInvitation(invitation: Invitation) {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: this.computeEffectiveStatus(invitation),
      message: invitation.message,
      ventureId: invitation.ventureId,
      cohortId: invitation.cohortId,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      acceptedAt: invitation.acceptedAt,
      revokedAt: invitation.revokedAt,
      createdById: invitation.createdById,
    }
  }

  private async requireCohortInOrganization(cohortId: string, organizationId: string) {
    const ventures = await this.deps.repository.listVentures()
    const cohorts = new Set(ventures.filter((venture) => venture.organizationId === organizationId).map((venture) => venture.cohortId))
    const users = await this.deps.repository.listUsers()
    const seededFromUsers = users.filter((u) => u.organizationId === organizationId && u.cohortId).map((u) => u.cohortId as string)
    seededFromUsers.forEach((id) => cohorts.add(id))

    if (cohorts.size === 0) {
      // Fall back to the requested id; downstream Prisma constraints will validate.
      return { id: cohortId, organizationId, name: cohortId }
    }

    if (!cohorts.has(cohortId)) {
      throw new Error('Cohort not found in this organization')
    }

    return { id: cohortId, organizationId, name: cohortId }
  }

  private async resolveDefaultCohortId(organizationId: string) {
    const ventures = await this.deps.repository.listVentures()
    const orgVenture = ventures.find((venture) => venture.organizationId === organizationId)
    if (orgVenture) {
      return orgVenture.cohortId
    }

    const users = await this.deps.repository.listUsers()
    const cohortFromUser = users.find((user) => user.organizationId === organizationId && user.cohortId)?.cohortId
    if (cohortFromUser) {
      return cohortFromUser
    }

    throw new Error('No cohort is configured for this organization yet — ask CFE to create one')
  }

  private resolveOrganizationName(organizationId: string) {
    if (organizationId === 'org-mentorme') {
      return 'MentorMe'
    }
    return organizationId
  }

  private async recordAudit(input: Omit<AuditEvent, 'id' | 'organizationId' | 'createdAt'> & { organizationId?: string }) {
    const users = input.actorUserId ? [] : await this.deps.repository.listUsers()
    const organizationId =
      input.organizationId ||
      (input.actorUserId ? (await this.requireUser(input.actorUserId)).organizationId : users[0]?.organizationId)

    await this.deps.repository.saveAuditEvent({
      id: `audit-${randomToken().slice(0, 10)}`,
      organizationId: organizationId || 'org-mentorme',
      createdAt: nowIso(),
      ...input,
    })
  }

  private async recordOutbox(topic: string, aggregateType: string, aggregateId: string, payload: Record<string, unknown>) {
    const event = await this.deps.repository.saveOutboxEvent({
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
