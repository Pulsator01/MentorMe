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
  PlatformRepository,
  QueuePublisher,
  StorageService,
} from './domain/interfaces'
import { verifyCalendlyWebhookSignature } from './infra/calendlyWebhookSignature'
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node'
import type { BetterAuthInstance } from './infra/betterAuth'

declare module 'fastify' {
  interface FastifyRequest {
    /** Raw JSON body string for Calendly HMAC verification (when route uses a string JSON parser). */
    calendlyRawBody?: string
  }
}

export type HttpSecurityOptions = {
  disableHelmet?: boolean
  disableRateLimit?: boolean
  corsAllowedOrigins?: string[]
  rateLimitGlobalMax?: number
  rateLimitGlobalWindowMs?: number
}

type AppOptions = {
  repository: PlatformRepository
  email: EmailGateway
  storage: StorageService
  queue: QueuePublisher
  ai: AiGateway
  auth?: BetterAuthInstance
  exposeTokens?: boolean
  /** When set, readAuthUser falls back to looking up user by this header value (tests only). */
  testAuthBypassHeader?: string
  cookieSecret: string
  defaultOrganizationId: string
  appBaseUrl: string
  trustProxy?: boolean
  httpSecurity?: HttpSecurityOptions
  calendlyWebhookSigningSecret?: string
}

const artifactCompleteSchema = z.object({
  artifactId: z.string().min(1),
})

const cookieSecurity = [{ cookieAuth: [] }]

const stringIdParamSchema = (name: string, description: string) => ({
  type: 'object',
  properties: {
    [name]: { type: 'string', description },
  },
  required: [name],
})

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
  { name: 'Auth', description: 'Session-based authentication (Better Auth)' },
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
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'mentor_me.session_token',
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
    '/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current authenticated user',
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Authenticated user'),
        },
      },
    },
    '/me/onboarding': {
      get: {
        tags: ['Onboarding'],
        summary: 'Read the current onboarding status for the signed-in user',
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Onboarding status'),
        },
      },
    },
    '/onboarding/founder': {
      post: {
        tags: ['Onboarding'],
        summary: 'Complete the founder onboarding wizard (creates the venture)',
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Available ventures'),
        },
      },
    },
    '/invitations': {
      get: {
        tags: ['Invitations'],
        summary: 'List invitations issued by the current organization',
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Invitations for the organization'),
        },
      },
      post: {
        tags: ['Invitations'],
        summary: 'Create and email an invitation to join the organization',
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Visible ventures'),
        },
      },
    },
    '/ventures/{ventureId}': {
      get: {
        tags: ['Ventures'],
        summary: 'Get one venture by id',
        security: cookieSecurity,
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
        security: cookieSecurity,
        parameters: [pathParameter('ventureId', 'Venture identifier')],
        responses: {
          200: jsonResponse('Requests for the venture'),
        },
      },
      post: {
        tags: ['Ventures'],
        summary: 'Create a mentor request for a venture',
        security: cookieSecurity,
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
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Visible requests'),
        },
      },
    },
    '/requests/{requestId}/submit': {
      post: {
        tags: ['Requests'],
        summary: 'Submit or re-submit a request into CFE review',
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Visible mentors'),
        },
      },
      post: {
        tags: ['Mentors'],
        summary: 'Create a mentor profile',
        security: cookieSecurity,
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
        security: cookieSecurity,
        parameters: [pathParameter('mentorId', 'Mentor identifier')],
        requestBody: jsonRequestBody(mentorUpdateBodySchema),
        responses: {
          200: jsonResponse('Updated mentor'),
        },
      },
    },
    '/mentors/me/actions': {
      get: {
        tags: ['Mentors'],
        summary: 'List mentor requests assigned to the signed-in mentor',
        security: cookieSecurity,
        responses: {
          200: jsonResponse('Assigned mentor actions'),
        },
      },
    },
    '/mentors/me/actions/{requestId}/respond': {
      post: {
        tags: ['Mentors'],
        summary: 'Accept or decline an assigned mentor request as the signed-in mentor',
        security: cookieSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        requestBody: jsonRequestBody(mentorRespondBodySchema),
        responses: {
          200: jsonResponse('Recorded mentor response'),
        },
      },
    },
    '/mentors/me/actions/{requestId}/schedule': {
      post: {
        tags: ['Mentors'],
        summary: 'Schedule an assigned mentor request as the signed-in mentor',
        security: cookieSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        requestBody: jsonRequestBody(mentorScheduleBodySchema),
        responses: {
          200: jsonResponse('Scheduled session'),
        },
      },
    },
    '/mentors/me/actions/{requestId}/feedback': {
      post: {
        tags: ['Mentors'],
        summary: 'Submit feedback for an assigned mentor request as the signed-in mentor',
        security: cookieSecurity,
        parameters: [pathParameter('requestId', 'Mentor request identifier')],
        requestBody: jsonRequestBody(mentorFeedbackBodySchema),
        responses: {
          200: jsonResponse('Recorded mentor feedback'),
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
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
        security: cookieSecurity,
        requestBody: jsonRequestBody(mentorRecommendationBodySchema),
        responses: {
          200: jsonResponse('Generated mentor recommendations'),
        },
      },
    },
  },
}) as OpenAPIV3_1.Document

export const createApp = async (options: AppOptions) => {
  const normalizedAppBaseUrl = options.appBaseUrl.trim()
  const configuredCorsOrigins = (options.httpSecurity?.corsAllowedOrigins ?? []).map((o) => o.trim()).filter(Boolean)
  const corsAllowedOrigins =
    configuredCorsOrigins.length > 0
      ? Array.from(new Set([...configuredCorsOrigins, normalizedAppBaseUrl].filter(Boolean)))
      : configuredCorsOrigins

  const httpSec = {
    disableHelmet: options.httpSecurity?.disableHelmet === true,
    disableRateLimit: options.httpSecurity?.disableRateLimit === true,
    corsAllowedOrigins,
    rateLimitGlobalMax: options.httpSecurity?.rateLimitGlobalMax ?? 400,
    rateLimitGlobalWindowMs: options.httpSecurity?.rateLimitGlobalWindowMs ?? 60_000,
  }

  const app = Fastify({ logger: false, trustProxy: options.trustProxy === true })
  const events = new EventTarget()
  const service = new PlatformService({
    repository: options.repository,
    email: options.email,
    storage: options.storage,
    queue: options.queue,
    ai: options.ai,
    defaultOrganizationId: options.defaultOrganizationId,
    appBaseUrl: options.appBaseUrl,
  })

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

  const readAuthUser = async (request: FastifyRequest) => {
    if (options.testAuthBypassHeader) {
      const email = String(request.headers[options.testAuthBypassHeader] || '')
      if (email) {
        const user = await options.repository.findUserByEmail(email)
        if (!user) throw app.httpErrors.unauthorized()
        return user
      }
    }

    if (!options.auth) {
      throw app.httpErrors.unauthorized('Auth not configured')
    }
    const session = await options.auth.api.getSession({
      headers: fromNodeHeaders(request.raw.headers),
    })
    if (!session) {
      throw app.httpErrors.unauthorized()
    }
    const user = await options.repository.findUserById(session.user.id)
    if (!user) {
      throw app.httpErrors.unauthorized()
    }
    return user
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

  if (options.auth) {
    const betterAuthHandler = toNodeHandler(options.auth)
    type RawRequestWithBody = FastifyRequest['raw'] & {
      body?: unknown
    }
    const setAuthCorsHeaders = (request: FastifyRequest, reply: FastifyReply) => {
      const origin = request.headers.origin
      if (!origin) return
      if (httpSec.corsAllowedOrigins.length > 0 && !httpSec.corsAllowedOrigins.includes(origin)) return

      reply.raw.setHeader('access-control-allow-origin', origin)
      reply.raw.setHeader('access-control-allow-credentials', 'true')
      reply.raw.setHeader('vary', 'Origin')
    }

    app.all('/api/auth/*', async (request, reply) => {
      reply.hijack()

      try {
        setAuthCorsHeaders(request, reply)

        if (request.body !== undefined) {
          const rawRequest = request.raw as RawRequestWithBody
          rawRequest.body = request.body
        }

        await betterAuthHandler(request.raw, reply.raw)
      } catch (error) {
        app.log.error(error, 'Better Auth raw handler failed')

        if (!reply.raw.headersSent && !reply.raw.writableEnded && !reply.raw.destroyed) {
          reply.raw.statusCode = 500
          reply.raw.setHeader('content-type', 'text/plain; charset=utf-8')
          reply.raw.end('Internal Server Error')
        }
      }
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

  app.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get the current authenticated user',
      security: cookieSecurity,
    },
  }, async (request) => {
    const user = await readAuthUser(request)
    return service.getMe(user)
  })

  app.get('/me/onboarding', {
    schema: {
      tags: ['Onboarding'],
      summary: 'Read the current onboarding status for the signed-in user',
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
    },
  }, async (request) => {
    const user = await readAuthUser(request)
    return await service.listVentures(user)
  })

  app.get('/requests', {
    schema: {
      tags: ['Requests'],
      summary: 'List mentor requests visible to the current user',
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.listMentors(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.get('/mentors/me/actions', {
    schema: {
      tags: ['Mentors'],
      summary: 'List mentor requests assigned to the signed-in mentor',
      security: cookieSecurity,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      return await service.listCurrentMentorActions(user)
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/ai/request-brief', {
    schema: {
      tags: ['AI'],
      summary: 'Generate a mentor-ready founder brief from rough notes',
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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
      security: cookieSecurity,
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

  app.post('/mentors/me/actions/:requestId/respond', {
    schema: {
      tags: ['Mentors'],
      summary: 'Accept or decline an assigned mentor request as the signed-in mentor',
      security: cookieSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
      body: mentorRespondBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = await service.mentorSessionRespond(user, params.requestId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentors/me/actions/:requestId/schedule', {
    schema: {
      tags: ['Mentors'],
      summary: 'Schedule an assigned mentor request as the signed-in mentor',
      security: cookieSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
      body: mentorScheduleBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = await service.mentorSessionSchedule(user, params.requestId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/mentors/me/actions/:requestId/feedback', {
    schema: {
      tags: ['Mentors'],
      summary: 'Submit feedback for an assigned mentor request as the signed-in mentor',
      security: cookieSecurity,
      params: stringIdParamSchema('requestId', 'Mentor request identifier'),
      body: mentorFeedbackBodySchema,
    },
  }, async (request, reply) => {
    try {
      const user = await readAuthUser(request)
      const params = z.object({ requestId: z.string().min(1) }).parse(request.params)
      const result = await service.mentorSessionFeedback(user, params.requestId, request.body)
      emitEvent('request.updated', { requestId: result.request.id })
      return result
    } catch (error) {
      return reply.badRequest((error as Error).message)
    }
  })

  app.post('/requests/:requestId/mentor-outreach', {
    schema: {
      tags: ['Requests'],
      summary: 'Create a secure mentor outreach token',
      security: cookieSecurity,
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
      security: cookieSecurity,
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
