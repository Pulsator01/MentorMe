import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'
import { z } from 'zod'
import { PlatformService } from './domain/platformService'
import type {
  AiGateway,
  EmailGateway,
  GoogleOAuthGateway,
  PlatformRepository,
  QueuePublisher,
  StorageService,
} from './domain/interfaces'
import type { PasswordHasher } from './infra/passwordHasher'
import { verifyCalendlyWebhookSignature } from './infra/calendlyWebhookSignature'

declare module 'fastify' {
  interface FastifyRequest {
    /** Raw JSON body string for Calendly HMAC verification (when route uses a string JSON parser). */
    calendlyRawBody?: string
  }
}

export type HttpSecurityOptions = {
  /** When true, skips @fastify/helmet (tests only). */
  disableHelmet?: boolean
  /** When true, skips @fastify/rate-limit entirely (tests only). */
  disableRateLimit?: boolean
  /**
   * Allowed browser origins for credentialed CORS. When empty or omitted,
   * the API reflects the request `Origin` header (development / Vitest).
   */
  corsAllowedOrigins?: string[]
  rateLimitGlobalMax?: number
  rateLimitGlobalWindowMs?: number
  /** Stricter per-route bucket for high-abuse auth endpoints. */
  rateLimitAuthMax?: number
  rateLimitAuthWindowMs?: number
}

type AppOptions = {
  repository: PlatformRepository
  email: EmailGateway
  storage: StorageService
  queue: QueuePublisher
  ai: AiGateway
  passwordHasher: PasswordHasher
  googleOAuth?: GoogleOAuthGateway
  exposeTokens?: boolean
  jwtIssuer: string
  jwtAudience: string
  jwtSecret: string
  cookieSecret: string
  cookieDomain?: string
  cookieSecure?: boolean
  defaultOrganizationId: string
  appBaseUrl: string
  /** Set true behind Render / other reverse proxies so rate limits use X-Forwarded-For. */
  trustProxy?: boolean
  httpSecurity?: HttpSecurityOptions
  /**
   * Calendly webhook signing key (UTF-8). When set, `Calendly-Webhook-Signature` must validate.
   * In `NODE_ENV=production`, webhooks are rejected (503) if this is unset.
   */
  calendlyWebhookSigningSecret?: string
}

const artifactCompleteSchema = z.object({
  artifactId: z.string().min(1),
})

const bearerSecurity = [{ bearerAuth: [] }]
const refreshSecurity = [{ refreshCookie: [] }]

const stringIdParamSchema = (name: string, description: string) => ({
  type: 'object',
  properties: {
    [name]: { type: 'string', description },
  },
  required: [name],
})

const magicLinkRequestBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
  },
  required: ['email'],
}

const magicLinkVerifyBodySchema = {
  type: 'object',
  properties: {
    token: { type: 'string' },
  },
  required: ['token'],
}

const registerBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 120 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8, maxLength: 256 },
    role: { type: 'string', enum: ['founder', 'student'] },
    organizationId: { type: 'string' },
    cohortId: { type: 'string' },
  },
  required: ['name', 'email', 'password'],
}

const loginBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1, maxLength: 256 },
  },
  required: ['email', 'password'],
}

const forgotPasswordBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
  },
  required: ['email'],
}

const resetPasswordBodySchema = {
  type: 'object',
  properties: {
    token: { type: 'string', minLength: 20 },
    password: { type: 'string', minLength: 8, maxLength: 256 },
  },
  required: ['token', 'password'],
}

const changePasswordBodySchema = {
  type: 'object',
  properties: {
    currentPassword: { type: 'string', minLength: 1, maxLength: 256 },
    newPassword: { type: 'string', minLength: 8, maxLength: 256 },
  },
  required: ['currentPassword', 'newPassword'],
}

const googleAuthorizeBodySchema = {
  type: 'object',
  properties: {
    redirectAfter: { type: 'string', maxLength: 512 },
  },
}

const googleCallbackBodySchema = {
  type: 'object',
  properties: {
    code: { type: 'string', minLength: 10, maxLength: 2048 },
    state: { type: 'string', minLength: 10, maxLength: 2048 },
  },
  required: ['code', 'state'],
}

const founderOnboardingBodySchema = {
  type: 'object',
  properties: {
    ventureName: { type: 'string', minLength: 2, maxLength: 120 },
    domain: { type: 'string', minLength: 2, maxLength: 80 },
    stage: { type: 'string', minLength: 2, maxLength: 60 },
    trl: { type: 'integer', minimum: 1, maximum: 9 },
    brl: { type: 'integer', minimum: 1, maximum: 9 },
    location: { type: 'string', minLength: 2, maxLength: 120 },
    summary: { type: 'string', minLength: 20, maxLength: 2000 },
    nextMilestone: { type: 'string', minLength: 5, maxLength: 400 },
    cohortId: { type: 'string', minLength: 1 },
  },
  required: ['ventureName', 'domain', 'stage', 'trl', 'brl', 'summary', 'nextMilestone'],
}

const studentOnboardingBodySchema = {
  type: 'object',
  properties: {
    ventureId: { type: 'string', minLength: 1 },
    invitationToken: { type: 'string', minLength: 20 },
  },
}

const createInvitationBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['founder', 'student', 'cfe', 'mentor', 'admin'] },
    ventureId: { type: 'string', minLength: 1 },
    cohortId: { type: 'string', minLength: 1 },
    message: { type: 'string', maxLength: 800 },
    expiresInDays: { type: 'integer', minimum: 1, maximum: 60 },
  },
  required: ['email', 'role'],
}

const createRequestBodySchema = {
  type: 'object',
  properties: {
    stage: { type: 'string' },
    trl: { type: 'integer', minimum: 1, maximum: 9 },
    brl: { type: 'integer', minimum: 1, maximum: 9 },
    challenge: { type: 'string' },
    desiredOutcome: { type: 'string' },
    preferredMentorIds: {
      type: 'array',
      items: { type: 'string' },
    },
    artifactRefs: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['stage', 'trl', 'brl', 'challenge', 'desiredOutcome'],
}

const returnRequestBodySchema = {
  type: 'object',
  properties: {
    reason: { type: 'string' },
  },
  required: ['reason'],
}

const approveRequestBodySchema = {
  type: 'object',
  properties: {
    ownerName: { type: 'string' },
  },
  required: ['ownerName'],
}

const presignArtifactBodySchema = {
  type: 'object',
  properties: {
    filename: { type: 'string' },
    contentType: { type: 'string' },
    sizeBytes: { type: 'integer', minimum: 1 },
  },
  required: ['filename', 'contentType', 'sizeBytes'],
}

const artifactCompleteBodySchema = {
  type: 'object',
  properties: {
    artifactId: { type: 'string' },
  },
  required: ['artifactId'],
}

const mentorProfileBodySchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    title: { type: 'string' },
    location: { type: 'string' },
    focus: { type: 'array', items: { type: 'string' } },
    stages: { type: 'array', items: { type: 'string' } },
    domains: { type: 'array', items: { type: 'string' } },
    tolerance: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    monthlyLimit: { type: 'integer', minimum: 1 },
    visibility: { type: 'string', enum: ['Active', 'Paused'] },
    responseWindow: { type: 'string' },
    calendlyUrl: { type: 'string' },
    bio: { type: 'string' },
  },
  required: [
    'id',
    'name',
    'email',
    'title',
    'location',
    'focus',
    'stages',
    'domains',
    'tolerance',
    'monthlyLimit',
    'visibility',
    'responseWindow',
    'calendlyUrl',
    'bio',
  ],
}

const mentorUpdateBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    title: { type: 'string' },
    location: { type: 'string' },
    focus: { type: 'array', items: { type: 'string' } },
    stages: { type: 'array', items: { type: 'string' } },
    domains: { type: 'array', items: { type: 'string' } },
    tolerance: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    monthlyLimit: { type: 'integer', minimum: 1 },
    visibility: { type: 'string', enum: ['Active', 'Paused'] },
    responseWindow: { type: 'string' },
    calendlyUrl: { type: 'string' },
    bio: { type: 'string' },
  },
}

const mentorRespondBodySchema = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['accepted', 'declined'] },
    reason: { type: 'string' },
  },
  required: ['decision'],
}

const mentorScheduleBodySchema = {
  type: 'object',
  properties: {
    calendlyLink: { type: 'string', format: 'uri' },
    meetingAt: { type: 'string', format: 'date-time' },
  },
  required: ['calendlyLink', 'meetingAt'],
}

const mentorFeedbackBodySchema = {
  type: 'object',
  properties: {
    mentorNotes: { type: 'string' },
    nextStepRequired: { type: 'boolean' },
    secondSessionRecommended: { type: 'boolean' },
  },
  required: ['mentorNotes', 'nextStepRequired', 'secondSessionRecommended'],
}

const calendlyWebhookHeadersSchema = {
  type: 'object',
  properties: {
    'x-calendly-event-id': { type: 'string' },
    'calendly-webhook-signature': { type: 'string' },
  },
  required: ['x-calendly-event-id'],
}

const requestBriefBodySchema = {
  type: 'object',
  properties: {
    ventureName: { type: 'string' },
    domain: { type: 'string' },
    stage: { type: 'string' },
    trl: { type: 'integer', minimum: 1, maximum: 9 },
    brl: { type: 'integer', minimum: 1, maximum: 9 },
    rawNotes: { type: 'string' },
    desiredOutcomeHint: { type: 'string' },
    artifactRefs: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['ventureName', 'rawNotes'],
}

const meetingSummaryBodySchema = {
  type: 'object',
  properties: {
    ventureName: { type: 'string' },
    mentorName: { type: 'string' },
    requestChallenge: { type: 'string' },
    desiredOutcome: { type: 'string' },
    meetingNotes: { type: 'string' },
  },
  required: ['ventureName', 'meetingNotes'],
}

const mentorRecommendationBodySchema = {
  type: 'object',
  properties: {
    ventureName: { type: 'string' },
    domain: { type: 'string' },
    stage: { type: 'string' },
    trl: { type: 'integer', minimum: 1, maximum: 9 },
    brl: { type: 'integer', minimum: 1, maximum: 9 },
    challenge: { type: 'string' },
    desiredOutcome: { type: 'string' },
    maxResults: { type: 'integer', minimum: 1, maximum: 5 },
  },
  required: ['ventureName', 'challenge'],
}

const openApiInfo = {
  title: 'MentorMe API',
  description: 'Mentor routing, intake, and follow-through API for the MentorMe platform.',
  version: '0.2.0',
}

const openApiTags = [
  { name: 'Infra', description: 'Operational health and deployment probes' },
  { name: 'Auth', description: 'Magic-link auth and session management' },
  { name: 'Onboarding', description: 'First-run onboarding wizards for founders and students' },
  { name: 'Invitations', description: 'CFE-issued invitations to join an organization' },
  { name: 'Ventures', description: 'Venture and mentor-request intake flows' },
  { name: 'Requests', description: 'CFE review, artifacts, outreach, and lifecycle transitions' },
  { name: 'Mentors', description: 'Mentor roster management and secure external actions' },
  { name: 'Integrations', description: 'Calendly and live update integration points' },
  { name: 'AI', description: 'AI-assisted request drafting, meeting summaries, and evaluation support' },
]

const openApiComponents = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    refreshCookie: {
      type: 'apiKey',
      in: 'cookie',
      name: 'mentor_me_refresh',
    },
  },
}

const pathParameter = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string' },
})

const headerParameter = (name: string, description: string) => ({
  name,
  in: 'header',
  required: true,
  description,
  schema: { type: 'string' },
})

const jsonRequestBody = (schema: Record<string, unknown>, description?: string) => ({
  ...(description ? { description } : {}),
  required: true,
  content: {
    'application/json': {
      schema,
    },
  },
})

const jsonResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        additionalProperties: true,
      },
    },
  },
})

const noContentResponse = {
  description: 'No content',
}

const buildOpenApiDocument = () =>
  ({
  openapi: '3.1.0',
  info: openApiInfo,
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development server',
    },
  ],
  tags: openApiTags,
  components: openApiComponents,
  paths: {
    '/healthz': {
      get: {
        tags: ['Infra'],
        summary: 'Liveness probe for deployments and local smoke checks',
        responses: {
          200: jsonResponse('Healthy service'),
        },
      },
    },
    '/auth/magic-link/request': {
      post: {
        tags: ['Auth'],
        summary: 'Request a magic link',
        requestBody: jsonRequestBody(magicLinkRequestBodySchema),
        responses: {
          202: jsonResponse('Accepted'),
        },
      },
    },
    '/auth/magic-link/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Verify a magic link token',
        requestBody: jsonRequestBody(magicLinkVerifyBodySchema),
        responses: {
          200: jsonResponse('Verified session'),
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new founder or student account with email and password',
        requestBody: jsonRequestBody(registerBodySchema),
        responses: {
          201: jsonResponse('Registered user with session'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with email and password',
        requestBody: jsonRequestBody(loginBodySchema),
        responses: {
          200: jsonResponse('Authenticated session'),
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password-reset email (always returns 202)',
        requestBody: jsonRequestBody(forgotPasswordBodySchema),
        responses: {
          202: jsonResponse('Accepted'),
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Consume a password-reset token and set a new password',
        requestBody: jsonRequestBody(resetPasswordBodySchema),
        responses: {
          200: jsonResponse('Password reset and new session issued'),
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change the current user password (requires authentication)',
        security: bearerSecurity,
        requestBody: jsonRequestBody(changePasswordBodySchema),
        responses: {
          200: jsonResponse('Password changed and new session issued'),
        },
      },
    },
    '/auth/google/authorize-url': {
      post: {
        tags: ['Auth'],
        summary: 'Build a Google OAuth authorize URL with signed CSRF state',
        requestBody: jsonRequestBody(googleAuthorizeBodySchema),
        responses: {
          200: jsonResponse('Google OAuth authorize URL'),
          501: jsonResponse('Google sign-in is not configured on this server'),
        },
      },
    },
    '/auth/google/callback': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange a Google OAuth authorization code for a MentorMe session',
        requestBody: jsonRequestBody(googleCallbackBodySchema),
        responses: {
          200: jsonResponse('Google sign-in session'),
          501: jsonResponse('Google sign-in is not configured on this server'),
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh an access token from the session cookie',
        security: refreshSecurity,
        responses: {
          200: jsonResponse('Refreshed access token'),
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out and clear the refresh cookie',
        security: refreshSecurity,
        responses: {
          204: noContentResponse,
        },
      },
    },
    '/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current authenticated user',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Authenticated user'),
        },
      },
    },
    '/me/onboarding': {
      get: {
        tags: ['Onboarding'],
        summary: 'Read the current onboarding status for the signed-in user',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Onboarding status'),
        },
      },
    },
    '/onboarding/founder': {
      post: {
        tags: ['Onboarding'],
        summary: 'Complete the founder onboarding wizard (creates the venture)',
        security: bearerSecurity,
        requestBody: jsonRequestBody(founderOnboardingBodySchema),
        responses: {
          201: jsonResponse('Onboarded user with new venture'),
        },
      },
    },
    '/onboarding/student': {
      post: {
        tags: ['Onboarding'],
        summary: 'Complete the student onboarding wizard (joins a venture)',
        security: bearerSecurity,
        requestBody: jsonRequestBody(studentOnboardingBodySchema),
        responses: {
          200: jsonResponse('Onboarded user with venture membership'),
        },
      },
    },
    '/onboarding/student/options': {
      get: {
        tags: ['Onboarding'],
        summary: 'List ventures the current student can join in their cohort',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Available ventures'),
        },
      },
    },
    '/invitations': {
      get: {
        tags: ['Invitations'],
        summary: 'List invitations issued by the current organization',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Invitations for the organization'),
        },
      },
      post: {
        tags: ['Invitations'],
        summary: 'Create and email an invitation to join the organization',
        security: bearerSecurity,
        requestBody: jsonRequestBody(createInvitationBodySchema),
        responses: {
          201: jsonResponse('Created invitation'),
        },
      },
    },
    '/invitations/{token}': {
      get: {
        tags: ['Invitations'],
        summary: 'Public preview of an invitation by its raw token (does not consume it)',
        parameters: [pathParameter('token', 'Invitation token')],
        responses: {
          200: jsonResponse('Invitation preview'),
        },
      },
    },
    '/invitations/{token}/accept': {
      post: {
        tags: ['Invitations'],
        summary: 'Accept an invitation as the currently signed-in user',
        security: bearerSecurity,
        parameters: [pathParameter('token', 'Invitation token')],
        responses: {
          200: jsonResponse('Accepted invitation'),
        },
      },
    },
    '/invitations/{invitationId}': {
      delete: {
        tags: ['Invitations'],
        summary: 'Revoke a pending invitation',
        security: bearerSecurity,
        parameters: [pathParameter('invitationId', 'Invitation identifier')],
        responses: {
          200: jsonResponse('Revoked invitation'),
        },
      },
    },
    '/ventures': {
      get: {
        tags: ['Ventures'],
        summary: 'List ventures visible to the current user',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Visible ventures'),
        },
      },
    },
    '/ventures/{ventureId}': {
      get: {
        tags: ['Ventures'],
        summary: 'Get one venture by id',
        security: bearerSecurity,
        parameters: [pathParameter('ventureId', 'Venture identifier')],
        responses: {
          200: jsonResponse('Venture detail'),
        },
      },
    },
    '/ventures/{ventureId}/requests': {
      get: {
        tags: ['Ventures'],
        summary: 'List requests for a specific venture',
        security: bearerSecurity,
        parameters: [pathParameter('ventureId', 'Venture identifier')],
        responses: {
          200: jsonResponse('Requests for the venture'),
        },
      },
      post: {
        tags: ['Ventures'],
        summary: 'Create a mentor request for a venture',
        security: bearerSecurity,
        parameters: [pathParameter('ventureId', 'Venture identifier')],
        requestBody: jsonRequestBody(createRequestBodySchema),
        responses: {
          201: jsonResponse('Created request'),
        },
      },
    },
    '/requests': {
      get: {
        tags: ['Requests'],
        summary: 'List mentor requests visible to the current user',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Visible requests'),
        },
      },
    },
    '/requests/{requestId}/submit': {
      post: {
        tags: ['Requests'],
        summary: 'Submit or re-submit a request into CFE review',
        security: bearerSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        responses: {
          200: jsonResponse('Submitted request'),
        },
      },
    },
    '/requests/{requestId}/return': {
      post: {
        tags: ['Requests'],
        summary: 'Return a request for revision',
        security: bearerSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        requestBody: jsonRequestBody(returnRequestBodySchema),
        responses: {
          200: jsonResponse('Returned request'),
        },
      },
    },
    '/requests/{requestId}/approve': {
      post: {
        tags: ['Requests'],
        summary: 'Approve a request for mentor outreach',
        security: bearerSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        requestBody: jsonRequestBody(approveRequestBodySchema),
        responses: {
          200: jsonResponse('Approved request'),
        },
      },
    },
    '/requests/{requestId}/close': {
      post: {
        tags: ['Requests'],
        summary: 'Close a request',
        security: bearerSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        responses: {
          200: jsonResponse('Closed request'),
        },
      },
    },
    '/requests/{requestId}/artifacts/presign': {
      post: {
        tags: ['Requests'],
        summary: 'Create a presigned artifact upload',
        security: bearerSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        requestBody: jsonRequestBody(presignArtifactBodySchema),
        responses: {
          201: jsonResponse('Presigned upload'),
        },
      },
    },
    '/requests/{requestId}/artifacts/complete': {
      post: {
        tags: ['Requests'],
        summary: 'Mark an uploaded artifact as complete',
        security: bearerSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        requestBody: jsonRequestBody(artifactCompleteBodySchema),
        responses: {
          200: jsonResponse('Completed artifact'),
        },
      },
    },
    '/requests/{requestId}/mentor-outreach': {
      post: {
        tags: ['Requests'],
        summary: 'Create a secure mentor outreach token',
        security: bearerSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        responses: {
          201: jsonResponse('Created mentor outreach token'),
        },
      },
    },
    '/mentors': {
      get: {
        tags: ['Mentors'],
        summary: 'List mentors visible to the current user',
        security: bearerSecurity,
        responses: {
          200: jsonResponse('Visible mentors'),
        },
      },
      post: {
        tags: ['Mentors'],
        summary: 'Create a mentor profile',
        security: bearerSecurity,
        requestBody: jsonRequestBody(mentorProfileBodySchema),
        responses: {
          201: jsonResponse('Created mentor'),
        },
      },
    },
    '/mentors/{mentorId}': {
      patch: {
        tags: ['Mentors'],
        summary: 'Update a mentor profile',
        security: bearerSecurity,
        parameters: [pathParameter('mentorId', 'Mentor identifier')],
        requestBody: jsonRequestBody(mentorUpdateBodySchema),
        responses: {
          200: jsonResponse('Updated mentor'),
        },
      },
    },
    '/mentor-actions/{token}': {
      get: {
        tags: ['Mentors'],
        summary: 'Inspect a secure mentor action link',
        parameters: [pathParameter('token', 'Secure mentor action token')],
        responses: {
          200: jsonResponse('Mentor action detail'),
        },
      },
    },
    '/mentor-actions/{token}/respond': {
      post: {
        tags: ['Mentors'],
        summary: 'Accept or decline outreach with a secure token',
        parameters: [pathParameter('token', 'Secure mentor action token')],
        requestBody: jsonRequestBody(mentorRespondBodySchema),
        responses: {
          200: jsonResponse('Recorded mentor response'),
        },
      },
    },
    '/mentor-actions/{token}/schedule': {
      post: {
        tags: ['Mentors'],
        summary: 'Schedule a mentor session through a secure token link',
        parameters: [pathParameter('token', 'Secure mentor action token')],
        requestBody: jsonRequestBody(mentorScheduleBodySchema),
        responses: {
          200: jsonResponse('Scheduled session'),
        },
      },
    },
    '/mentor-actions/{token}/feedback': {
      post: {
        tags: ['Mentors'],
        summary: 'Submit post-session mentor feedback through a secure token link',
        parameters: [pathParameter('token', 'Secure mentor action token')],
        requestBody: jsonRequestBody(mentorFeedbackBodySchema),
        responses: {
          200: jsonResponse('Recorded mentor feedback'),
        },
      },
    },
    '/webhooks/calendly': {
      post: {
        tags: ['Integrations'],
        summary: 'Receive Calendly scheduling webhooks',
        parameters: [
          headerParameter('x-calendly-event-id', 'Calendly provider event identifier'),
          headerParameter('calendly-webhook-signature', 'Calendly HMAC signature (required when signing secret is configured)'),
        ],
        requestBody: jsonRequestBody({ type: 'object', additionalProperties: true }),
        responses: {
          202: jsonResponse('Accepted webhook'),
        },
      },
    },
    '/notifications/stream': {
      get: {
        tags: ['Integrations'],
        summary: 'Open the request update event stream',
        security: bearerSecurity,
        responses: {
          200: {
            description: 'Server-sent event stream',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    '/ai/request-brief': {
      post: {
        tags: ['AI'],
        summary: 'Generate a mentor-ready founder brief from rough notes',
        security: bearerSecurity,
        requestBody: jsonRequestBody(requestBriefBodySchema),
        responses: {
          200: jsonResponse('Generated mentor-ready brief suggestion'),
        },
      },
    },
    '/ai/meeting-summary': {
      post: {
        tags: ['AI'],
        summary: 'Generate a structured meeting summary and follow-through tasks',
        security: bearerSecurity,
        requestBody: jsonRequestBody(meetingSummaryBodySchema),
        responses: {
          200: jsonResponse('Generated meeting summary'),
        },
      },
    },
    '/ai/mentor-recommendations': {
      post: {
        tags: ['AI'],
        summary: 'Rank active mentors from the database for a founder request',
        security: bearerSecurity,
        requestBody: jsonRequestBody(mentorRecommendationBodySchema),
        responses: {
          200: jsonResponse('Generated mentor recommendations'),
        },
      },
    },
  },
}) as OpenAPIV3_1.Document

const mergeAuthBurstRoute = <T extends Record<string, unknown>>(
  route: T,
  auth: { disableRateLimit: boolean; authMax: number; authWindowMs: number },
): T => {
  if (auth.disableRateLimit) {
    return route
  }
  const prevConfig =
    typeof route.config === 'object' && route.config !== null && !Array.isArray(route.config)
      ? (route.config as Record<string, unknown>)
      : {}
  return {
    ...route,
    config: {
      ...prevConfig,
      rateLimit: {
        max: auth.authMax,
        timeWindow: auth.authWindowMs,
      },
    },
  }
}

export const createApp = async (options: AppOptions) => {
  const httpSec = {
    disableHelmet: options.httpSecurity?.disableHelmet === true,
    disableRateLimit: options.httpSecurity?.disableRateLimit === true,
    corsAllowedOrigins: (options.httpSecurity?.corsAllowedOrigins ?? []).map((o) => o.trim()).filter(Boolean),
    rateLimitGlobalMax: options.httpSecurity?.rateLimitGlobalMax ?? 400,
    rateLimitGlobalWindowMs: options.httpSecurity?.rateLimitGlobalWindowMs ?? 60_000,
    rateLimitAuthMax: options.httpSecurity?.rateLimitAuthMax ?? 40,
    rateLimitAuthWindowMs: options.httpSecurity?.rateLimitAuthWindowMs ?? 900_000,
  }

  const authBurst = {
    disableRateLimit: httpSec.disableRateLimit,
    authMax: httpSec.rateLimitAuthMax,
    authWindowMs: httpSec.rateLimitAuthWindowMs,
  }

  const app = Fastify({ logger: false, trustProxy: options.trustProxy === true })
  const events = new EventTarget()
  const service = new PlatformService({
    repository: options.repository,
    email: options.email,
    storage: options.storage,
    queue: options.queue,
    ai: options.ai,
    passwordHasher: options.passwordHasher,
    googleOAuth: options.googleOAuth,
    jwtIssuer: options.jwtIssuer,
    jwtAudience: options.jwtAudience,
    jwtSecret: options.jwtSecret,
    defaultOrganizationId: options.defaultOrganizationId,
    appBaseUrl: options.appBaseUrl,
  })

  const refreshCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    ...(options.cookieDomain ? { domain: options.cookieDomain } : {}),
    ...(options.cookieSecure ? { secure: true } : {}),
  }

  if (!httpSec.disableHelmet) {
    app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      strictTransportSecurity:
        process.env.NODE_ENV === 'production'
          ? {
              maxAge: 31536000,
              includeSubDomains: true,
              preload: true,
            }
          : false,
    })
  }

  app.register(cors, {
    origin: httpSec.corsAllowedOrigins.length > 0 ? httpSec.corsAllowedOrigins : true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  app.register(cookie, { secret: options.cookieSecret })
  app.register(sensible)
  app.register(swagger, {
    mode: 'static',
    specification: {
      document: buildOpenApiDocument() as unknown as OpenAPIV3.Document,
    },
  })
  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  })

  const readAuthUser = async (request: { headers: Record<string, unknown> }) => {
    const authorization = String(request.headers.authorization || '')

    if (!authorization.startsWith('Bearer ')) {
      throw app.httpErrors.unauthorized()
    }

    try {
      return await service.authenticate(authorization.replace('Bearer ', ''))
    } catch {
      throw app.httpErrors.unauthorized()
    }
  }

  const emitEvent = (name: string, detail: Record<string, unknown>) => {
    events.dispatchEvent(new CustomEvent(name, { detail }))
  }

  if (!httpSec.disableRateLimit) {
    await app.register(rateLimit, {
      global: true,
      max: httpSec.rateLimitGlobalMax,
      timeWindow: httpSec.rateLimitGlobalWindowMs,
      allowList: (request: FastifyRequest, _key: string) => {
        const raw = request.raw.url || ''
        const pathOnly = raw.split('?')[0] || ''
        return pathOnly === '/healthz' || pathOnly === '/healthz/'
      },
    })
  }

  app.get('/healthz', {
    schema: {
      tags: ['Infra'],
      summary: 'Liveness probe for deployments and local smoke checks',
    },
  }, async () => ({
    status: 'ok',
  }))

  app.post('/auth/magic-link/request', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request a magic link',
        body: magicLinkRequestBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    const payload = z.object({ email: z.string().email() }).parse(request.body)
    const result = await service.requestMagicLink(payload.email)
    return reply.code(202).send({
      accepted: true,
      ...(options.exposeTokens && result.token ? { debugToken: result.token } : {}),
    })
  })

  app.post('/auth/magic-link/verify', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Verify a magic link token',
        body: magicLinkVerifyBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const payload = z.object({ token: z.string().min(10) }).parse(request.body)
      const result = await service.verifyMagicLink(payload.token)
      reply.setCookie('mentor_me_refresh', result.refreshToken, refreshCookieOptions)
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/register', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new founder or student account with email and password',
        body: registerBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const result = await service.register(request.body)
      reply.setCookie('mentor_me_refresh', result.refreshToken, refreshCookieOptions)
      return reply.code(201).send({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/login', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Sign in with email and password',
        body: loginBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const result = await service.login(request.body)
      reply.setCookie('mentor_me_refresh', result.refreshToken, refreshCookieOptions)
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      return reply.unauthorized((error as Error).message)
    }
  })

  app.post('/auth/forgot-password', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request a password-reset email (always returns 202)',
        body: forgotPasswordBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const result = await service.requestPasswordReset(request.body)
      return reply.code(202).send({
        accepted: true,
        ...(options.exposeTokens && result.token ? { debugToken: result.token } : {}),
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/reset-password', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Consume a password-reset token and set a new password',
        body: resetPasswordBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const result = await service.resetPassword(request.body)
      reply.setCookie('mentor_me_refresh', result.refreshToken, refreshCookieOptions)
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/change-password', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Change the current user password (requires authentication)',
        security: bearerSecurity,
        body: changePasswordBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const result = await service.changePassword(user, request.body)
      reply.setCookie('mentor_me_refresh', result.refreshToken, refreshCookieOptions)
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/google/authorize-url', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Build a Google OAuth authorize URL with signed CSRF state',
        body: googleAuthorizeBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const result = await service.googleAuthorizeUrl(request.body)
      return reply.send(result)
    } catch (error) {
      const message = (error as Error).message
      if (message.includes('not configured')) {
        return reply.code(501).send({ error: message })
      }
      return reply.badRequest(message)
    }
  })

  app.post('/auth/google/callback', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Exchange a Google OAuth authorization code for a MentorMe session',
        body: googleCallbackBodySchema,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const result = await service.googleOAuthCallback(request.body)
      reply.setCookie('mentor_me_refresh', result.refreshToken, refreshCookieOptions)
      return reply.send({
        accessToken: result.accessToken,
        user: result.user,
        isNewUser: result.isNewUser,
        redirectAfter: result.redirectAfter,
      })
    } catch (error) {
      const message = (error as Error).message
      if (message.includes('not configured')) {
        return reply.code(501).send({ error: message })
      }
      return reply.badRequest(message)
    }
  })

  app.post('/auth/refresh', mergeAuthBurstRoute(
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh an access token from the session cookie',
        security: refreshSecurity,
      },
    },
    authBurst,
  ), async (request, reply) => {
    try {
      const refreshToken = request.cookies.mentor_me_refresh
      if (!refreshToken) {
        return reply.unauthorized()
      }
      const result = await service.refreshSession(refreshToken)
      return reply.send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/auth/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Log out and clear the refresh cookie',
      security: refreshSecurity,
    },
  }, async (request, reply) => {
    const refreshToken = request.cookies.mentor_me_refresh
    if (refreshToken) {
      await service.logout(refreshToken)
    }
    reply.clearCookie('mentor_me_refresh', {
      path: '/',
      ...(options.cookieDomain ? { domain: options.cookieDomain } : {}),
    })
    return reply.code(204).send()
  })

  app.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get the current authenticated user',
      security: bearerSecurity,
    },
  }, async (request) => {
    const user = await readAuthUser(request)
    return service.getMe(user)
  })

  app.get('/me/onboarding', {
    schema: {
      tags: ['Onboarding'],
      summary: 'Read the current onboarding status for the signed-in user',
      security: bearerSecurity,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.getOnboardingStatus(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/onboarding/founder', {
    schema: {
      tags: ['Onboarding'],
      summary: 'Complete the founder onboarding wizard (creates the venture)',
      security: bearerSecurity,
      body: founderOnboardingBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const result = await service.completeFounderOnboarding(user, request.body)
      return reply.code(201).send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/onboarding/student', {
    schema: {
      tags: ['Onboarding'],
      summary: 'Complete the student onboarding wizard (joins a venture)',
      security: bearerSecurity,
      body: studentOnboardingBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const result = await service.completeStudentOnboarding(user, request.body)
      return reply.send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/onboarding/student/options', {
    schema: {
      tags: ['Onboarding'],
      summary: 'List ventures the current student can join in their cohort',
      security: bearerSecurity,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.getStudentJoinOptions(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/invitations', {
    schema: {
      tags: ['Invitations'],
      summary: 'Create and email an invitation to join the organization',
      security: bearerSecurity,
      body: createInvitationBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const result = await service.createInvitation(user, request.body)
      return reply.code(201).send({
        invitation: result.invitation,
        ...(options.exposeTokens ? { debugToken: result.token } : {}),
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/invitations', {
    schema: {
      tags: ['Invitations'],
      summary: 'List invitations issued by the current organization',
      security: bearerSecurity,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.listInvitations(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/invitations/:token', {
    schema: {
      tags: ['Invitations'],
      summary: 'Public preview of an invitation by its raw token (does not consume it)',
      params: stringIdParamSchema('token', 'Invitation token'),
    },
  }, async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(20) }).parse(request.params)
      return await service.previewInvitation(params.token)
    } catch (error) {
      return reply.notFound((error as Error).message)
    }
  })

  app.post('/invitations/:token/accept', {
    schema: {
      tags: ['Invitations'],
      summary: 'Accept an invitation as the currently signed-in user',
      security: bearerSecurity,
      params: stringIdParamSchema('token', 'Invitation token'),
    },
  }, async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(20) }).parse(request.params)
      const user = await readAuthUser(request)
      const result = await service.acceptInvitation(user, params.token)
      return reply.send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.delete('/invitations/:invitationId', {
    schema: {
      tags: ['Invitations'],
      summary: 'Revoke a pending invitation',
      security: bearerSecurity,
      params: stringIdParamSchema('invitationId', 'Invitation identifier'),
    },
  }, async (request, reply) => {
    try {
      const params = z.object({ invitationId: z.string().min(1) }).parse(request.params)
      const user = await readAuthUser(request)
      const result = await service.revokeInvitation(user, params.invitationId)
      return reply.send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/ventures', {
    schema: {
      tags: ['Ventures'],
      summary: 'List ventures visible to the current user',
      security: bearerSecurity,
    },
  }, async (request) => {
    const user = await readAuthUser(request)
    return await service.listVentures(user)
  })

  app.get('/requests', {
    schema: {
      tags: ['Requests'],
      summary: 'List mentor requests visible to the current user',
      security: bearerSecurity,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.listRequests(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/ventures/:ventureId', {
    schema: {
      tags: ['Ventures'],
      summary: 'Get one venture by id',
      security: bearerSecurity,
      params: stringIdParamSchema('ventureId', 'Venture identifier'),
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ ventureId: z.string().min(1) }).parse(request.params)
      return await service.getVenture(user, params.ventureId)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/ventures/:ventureId/requests', {
    schema: {
      tags: ['Ventures'],
      summary: 'List requests for a specific venture',
      security: bearerSecurity,
      params: stringIdParamSchema('ventureId', 'Venture identifier'),
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ ventureId: z.string().min(1) }).parse(request.params)
      return await service.listRequestsForVenture(user, params.ventureId)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/ventures/:ventureId/requests', {
    schema: {
      tags: ['Ventures'],
      summary: 'Create a mentor request for a venture',
      security: bearerSecurity,
      params: stringIdParamSchema('ventureId', 'Venture identifier'),
      body: createRequestBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ ventureId: z.string().min(1) }).parse(request.params)
      const result = await service.createRequest(user, params.ventureId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return reply.code(201).send(result)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/submit', {
    schema: {
      tags: ['Requests'],
      summary: 'Submit or re-submit a request into CFE review',
      security: bearerSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = await service.submitRequest(user, params.requestId)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/return', {
    schema: {
      tags: ['Requests'],
      summary: 'Return a request for revision',
      security: bearerSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
      body: returnRequestBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = await service.returnRequest(user, params.requestId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/approve', {
    schema: {
      tags: ['Requests'],
      summary: 'Approve a request for mentor outreach',
      security: bearerSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
      body: approveRequestBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = await service.approveRequest(user, params.requestId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/close', {
    schema: {
      tags: ['Requests'],
      summary: 'Close a request',
      security: bearerSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = await service.closeRequest(user, params.requestId)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/artifacts/presign', {
    schema: {
      tags: ['Requests'],
      summary: 'Create a presigned artifact upload',
      security: bearerSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
      body: presignArtifactBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      return reply.code(201).send(await service.presignArtifact(user, params.requestId, request.body))
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/artifacts/complete', {
    schema: {
      tags: ['Requests'],
      summary: 'Mark an uploaded artifact as complete',
      security: bearerSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
      body: artifactCompleteBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const body = artifactCompleteSchema.parse(request.body)
      return await service.completeArtifact(user, params.requestId, body.artifactId)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/mentors', {
    schema: {
      tags: ['Mentors'],
      summary: 'List mentors visible to the current user',
      security: bearerSecurity,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.listMentors(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/ai/request-brief', {
    schema: {
      tags: ['AI'],
      summary: 'Generate a mentor-ready founder brief from rough notes',
      security: bearerSecurity,
      body: requestBriefBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.generateRequestBrief(user, request.body)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/ai/meeting-summary', {
    schema: {
      tags: ['AI'],
      summary: 'Generate a structured meeting summary and follow-through tasks',
      security: bearerSecurity,
      body: meetingSummaryBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.generateMeetingSummary(user, request.body)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/ai/mentor-recommendations', {
    schema: {
      tags: ['AI'],
      summary: 'Rank active mentors from the database for a founder request',
      security: bearerSecurity,
      body: mentorRecommendationBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.generateMentorRecommendations(user, request.body)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentors', {
    schema: {
      tags: ['Mentors'],
      summary: 'Create a mentor profile',
      security: bearerSecurity,
      body: mentorProfileBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const mentor = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        title: z.string(),
        location: z.string(),
        focus: z.array(z.string()),
        stages: z.array(z.string()),
        domains: z.array(z.string()),
        tolerance: z.enum(['Low', 'Medium', 'High']),
        monthlyLimit: z.number().int().positive(),
        visibility: z.enum(['Active', 'Paused']),
        responseWindow: z.string(),
        calendlyUrl: z.string(),
        bio: z.string(),
      }).parse(request.body)
      return reply.code(201).send(await service.createMentor(user, mentor))
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.patch('/mentors/:mentorId', {
    schema: {
      tags: ['Mentors'],
      summary: 'Update a mentor profile',
      security: bearerSecurity,
      params: stringIdParamSchema('mentorId', 'Mentor identifier'),
      body: mentorUpdateBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ mentorId: z.string().min(1) }).parse(request.params)
      return await service.updateMentor(user, params.mentorId, request.body as Record<string, unknown>)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/mentor-outreach', {
    schema: {
      tags: ['Requests'],
      summary: 'Create a secure mentor outreach token',
      security: bearerSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      return reply.code(201).send(await service.createMentorOutreach(user, params.requestId))
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/mentor-actions/:token', {
    schema: {
      tags: ['Mentors'],
      summary: 'Inspect a secure mentor action link',
      params: stringIdParamSchema('token', 'Secure mentor action token'),
    },
  }, async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(10) }).parse(request.params)
      return await service.getMentorAction(params.token)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentor-actions/:token/respond', {
    schema: {
      tags: ['Mentors'],
      summary: 'Accept or decline outreach with a secure token',
      params: stringIdParamSchema('token', 'Secure mentor action token'),
      body: mentorRespondBodySchema,
    },
  }, async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(10) }).parse(request.params)
      const result = await service.mentorRespond(params.token, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentor-actions/:token/schedule', {
    schema: {
      tags: ['Mentors'],
      summary: 'Schedule a mentor session through a secure token link',
      params: stringIdParamSchema('token', 'Secure mentor action token'),
      body: mentorScheduleBodySchema,
    },
  }, async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(10) }).parse(request.params)
      const result = await service.mentorSchedule(params.token, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentor-actions/:token/feedback', {
    schema: {
      tags: ['Mentors'],
      summary: 'Submit post-session mentor feedback through a secure token link',
      params: stringIdParamSchema('token', 'Secure mentor action token'),
      body: mentorFeedbackBodySchema,
    },
  }, async (request, reply) => {
    try {
      const params = z.object({ token: z.string().min(10) }).parse(request.params)
      const result = await service.mentorFeedback(params.token, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  const handleCalendlyWebhook = async (request: FastifyRequest, reply: FastifyReply) => {
    const nodeEnv = process.env.NODE_ENV || 'development'
    const signingSecret = (options.calendlyWebhookSigningSecret || '').trim()
    const rawBody = request.calendlyRawBody ?? JSON.stringify(request.body ?? {})

    if (nodeEnv === 'production' && !signingSecret) {
      return reply.code(503).send({ error: 'Calendly webhooks are not configured (missing CALENDLY_WEBHOOK_SIGNING_SECRET).' })
    }

    if (signingSecret) {
      const sigHeader =
        request.headers['calendly-webhook-signature'] || request.headers['Calendly-Webhook-Signature']
      const sigValue = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader
      if (!verifyCalendlyWebhookSignature(signingSecret, rawBody, sigValue)) {
        return reply.code(401).send({ error: 'Invalid Calendly webhook signature' })
      }
    }

    const eventId = String(request.headers['x-calendly-event-id'] || '')
    if (!eventId) {
      return reply.badRequest('Missing x-calendly-event-id header')
    }
    return reply.code(202).send(await service.calendlyWebhook(eventId, request.body as Record<string, unknown>))
  }

  await app.register(
    async (scoped) => {
      scoped.removeContentTypeParser('application/json')
      scoped.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
        try {
          const raw = typeof body === 'string' ? body : String(body)
          req.calendlyRawBody = raw
          done(null, JSON.parse(raw))
        } catch (err) {
          done(err as Error, undefined)
        }
      })

      scoped.post('/calendly', {
        schema: {
          tags: ['Integrations'],
          summary: 'Receive Calendly scheduling webhooks',
          headers: calendlyWebhookHeadersSchema,
          body: {
            type: 'object',
            additionalProperties: true,
          },
        },
      }, handleCalendlyWebhook)
    },
    { prefix: '/webhooks' },
  )

  app.get('/notifications/stream', {
    schema: {
      tags: ['Integrations'],
      summary: 'Open the request update event stream',
      security: bearerSecurity,
    },
  }, async (request, reply) => {
    try {
      await readAuthUser(request)

      reply.raw.setHeader('Content-Type', 'text/event-stream')
      reply.raw.setHeader('Cache-Control', 'no-cache')
      reply.raw.setHeader('Connection', 'keep-alive')
      reply.raw.flushHeaders?.()
      reply.hijack()

      const send = (event: Event) => {
        const detail = (event as CustomEvent<Record<string, unknown>>).detail
        reply.raw.write(`data: ${JSON.stringify(detail)}\n\n`)
      }

      events.addEventListener('request.updated', send)
      reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
      reply.raw.on('close', () => {
        events.removeEventListener('request.updated', send)
        reply.raw.end()
      })
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  return app
}
