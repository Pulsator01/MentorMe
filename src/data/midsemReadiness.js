export const productSnapshot = {
  name: 'MentorMe',
  oneLiner:
    'A mentorship operations platform for incubation programs that need founders, students, mentors, and CFE teams to work through one clean pipeline.',
  market:
    'University incubators, entrepreneurship cells, accelerator programs, innovation offices, and startup support teams that coordinate mentor access across many ventures.',
  businessModel:
    'Institutional SaaS priced per cohort or annual program seat, with mentor-network operations, workflow visibility, and compliance-friendly auditability as the first paid wedge.',
}

export const journeyChecklist = [
  {
    name: 'Founder intake',
    detail: 'Founders describe the venture, attach proof, shortlist mentors, submit to CFE, and add more artifacts later if the brief changes.',
    status: 'done',
  },
  {
    name: 'CFE triage',
    detail: 'CFE reviews the ask, returns weak briefs, approves strong ones, generates secure mentor links, and closes requests after follow-up.',
    status: 'done',
  },
  {
    name: 'Mentor response',
    detail: 'Mentors open a secure link, inspect the request, accept or decline, schedule the meeting, and submit feedback after the call.',
    status: 'done',
  },
  {
    name: 'Student follow-through',
    detail: 'Students prepare materials, track session prep, and close the loop after meetings without seeing the full founder intake flow.',
    status: 'done',
  },
  {
    name: 'Live sync',
    detail: 'Founder and CFE workspaces refresh through the SSE stream when requests move through review, outreach, scheduling, and feedback.',
    status: 'done',
  },
  {
    name: 'AI assist',
    detail: 'Founders can draft a mentor-ready brief and students can turn raw meeting notes into structured follow-through through the AI endpoint layer.',
    status: 'done',
  },
]

export const endpointChecklist = [
  {
    method: 'POST',
    path: '/auth/magic-link/request',
    category: 'Non-AI',
    screen: 'Role bootstrap',
    purpose: 'Issue local demo magic-link token.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/auth/magic-link/verify',
    category: 'Non-AI',
    screen: 'Role bootstrap',
    purpose: 'Verify token and create session.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/auth/refresh',
    category: 'Non-AI',
    screen: 'Shared app state',
    purpose: 'Refresh the access token from the cookie session.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/auth/logout',
    category: 'Non-AI',
    screen: 'Session contract',
    purpose: 'Invalidate the refresh session cookie.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/me',
    category: 'Non-AI',
    screen: 'Sidebar session card',
    purpose: 'Load the current authenticated user context.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/ventures',
    category: 'Non-AI',
    screen: 'Founder and CFE workspaces',
    purpose: 'Load ventures scoped to the current role.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/requests',
    category: 'Non-AI',
    screen: 'CFE workspace',
    purpose: 'Load the full mentor request pipeline.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/ventures/:ventureId',
    category: 'Non-AI',
    screen: 'Founder and student workspaces',
    purpose: 'Load the scoped venture detail card.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/ventures/:ventureId/requests',
    category: 'Non-AI',
    screen: 'Founder and student workspaces',
    purpose: 'Load requests scoped to the active venture.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/ventures/:ventureId/requests',
    category: 'Non-AI',
    screen: 'Founder request composer',
    purpose: 'Create and submit a new request to CFE.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/submit',
    category: 'Non-AI',
    screen: 'Founder request tracker',
    purpose: 'Re-submit a returned request to CFE.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/return',
    category: 'Non-AI',
    screen: 'CFE pipeline board',
    purpose: 'Return an underdeveloped brief for revision.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/approve',
    category: 'Non-AI',
    screen: 'CFE pipeline board',
    purpose: 'Approve a request and move it to mentor routing.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/close',
    category: 'Non-AI',
    screen: 'CFE pipeline board',
    purpose: 'Close a request after the follow-up loop is complete.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/artifacts/presign',
    category: 'Non-AI',
    screen: 'Founder request tracker',
    purpose: 'Prepare artifact upload for an existing request.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/artifacts/complete',
    category: 'Non-AI',
    screen: 'Founder request tracker',
    purpose: 'Mark the uploaded artifact as complete.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/mentors',
    category: 'Non-AI',
    screen: 'Founder matching and CFE mentor network',
    purpose: 'Load the mentor roster and visibility state.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/mentors',
    category: 'Non-AI',
    screen: 'Mentor network',
    purpose: 'Create a mentor profile.',
    status: 'done',
  },
  {
    method: 'PATCH',
    path: '/mentors/:mentorId',
    category: 'Non-AI',
    screen: 'Mentor network',
    purpose: 'Pause visibility and tune capacity.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/mentor-outreach',
    category: 'Non-AI',
    screen: 'CFE pipeline ops',
    purpose: 'Create a secure mentor action link.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/mentor-actions/:token',
    category: 'Non-AI',
    screen: 'Secure mentor desk',
    purpose: 'Load the mentor, request, and token state for the secure desk.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/mentor-actions/:token/respond',
    category: 'Non-AI',
    screen: 'Secure mentor desk',
    purpose: 'Accept or decline mentor outreach.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/mentor-actions/:token/schedule',
    category: 'Non-AI',
    screen: 'Secure mentor desk',
    purpose: 'Schedule a confirmed session.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/mentor-actions/:token/feedback',
    category: 'Non-AI',
    screen: 'Secure mentor desk',
    purpose: 'Capture post-meeting mentor notes.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/webhooks/calendly',
    category: 'Non-AI',
    screen: 'Scheduling integration',
    purpose: 'Sync provider events idempotently.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/notifications/stream',
    category: 'Non-AI',
    screen: 'Founder and CFE live sync',
    purpose: 'Expose SSE updates when request state changes.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/ai/request-brief',
    category: 'AI',
    screen: 'Founder request composer',
    purpose: 'Turn raw notes into a mentor-ready brief.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/ai/meeting-summary',
    category: 'AI',
    screen: 'Student follow-up',
    purpose: 'Summarize mentor conversations into next-step tasks.',
    status: 'done',
  },
]

export const aiBenchmarkSnapshot = {
  endpoints: 2,
  benchmarkCases: 4,
  passThreshold: '75%',
  defaultProvider: 'Heuristic locally for deterministic demos, OpenAI automatically when credentials are present.',
  judgeMode: 'LLM-as-judge via OpenAI structured outputs, with a heuristic rubric fallback for offline verification.',
}

export const aiBenchmarkChecklist = [
  {
    name: 'Founder brief benchmark',
    endpoint: '/ai/request-brief',
    samples: '2 sample input/output cases',
    judge:
      'Scores routing clarity, missing information, mentor fit, and whether the generated brief is strong enough for CFE review.',
    status: 'done',
  },
  {
    name: 'Meeting summary benchmark',
    endpoint: '/ai/meeting-summary',
    samples: '2 sample input/output cases',
    judge:
      'Scores summary fidelity, role-specific action items, second-session signal quality, and follow-through usefulness.',
    status: 'done',
  },
]

export const dbEntities = [
  {
    name: 'User, Venture, VentureMembership',
    detail: 'Role-aware access control, current-user context, and venture scoping for founders, students, and CFE.',
  },
  {
    name: 'MentorProfile, MentorCapacitySnapshot',
    detail: 'Mentor metadata, visibility, and bandwidth tracking for routing decisions.',
  },
  {
    name: 'MentorRequest, MentorRequestShortlist',
    detail: 'Request intake, shortlist ranking, lifecycle transitions, and close-out state.',
  },
  {
    name: 'Artifact, Meeting, MeetingFeedback',
    detail: 'Attachments, scheduling, and post-session capture.',
  },
  {
    name: 'Session, MagicLinkToken, ExternalActionToken',
    detail: 'Authentication, refresh sessions, and secure external mentor actions.',
  },
  {
    name: 'AuditEvent, OutboxEvent, WebhookReceipt',
    detail: 'Traceability, async work, and webhook idempotency across the workflow.',
  },
]

export const feedbackLearnings = [
  {
    title: 'Users need routing clarity, not another inbox',
    detail:
      'The product centers CFE as the operating layer so founders do not contact mentors directly and mentors do not receive noisy low-context requests.',
  },
  {
    title: 'A weak brief wastes mentor capacity',
    detail:
      'Returned-request, resubmission, and artifact-update flows matter because the quality gate is part of the product, not just an admin detail.',
  },
  {
    title: 'Mentor friction has to stay tiny',
    detail:
      'The secure mentor desk is intentionally narrow: inspect one request, respond, schedule, and leave one useful note instead of forcing mentors into an admin-heavy dashboard.',
  },
  {
    title: 'Student work is different from founder work',
    detail:
      'The student workspace is intentionally separate so prep, materials, and follow-up are visible without exposing the full founder request composer.',
  },
]

export const honestNextSteps = [
  'Run the OpenAI-backed eval benchmark before switching default models so QoS stays measurable when model choices change.',
  'Deploy the Render blueprint with real production secrets and share the public URL with mentors for hands-on feedback.',
  'Replace demo role bootstrap with explicit sign-in, session handoff, and a user-visible logout flow.',
  'Swap the stub artifact upload URL for a real object-storage provider.',
  'Extend live updates into the mentor desk so external-token actions do not rely on refresh after load.',
]

export const deploymentChecklist = [
  {
    title: 'API health probe',
    detail: 'The Fastify app now exposes GET /healthz so hosting platforms can verify liveness before routing traffic.',
    status: 'done',
  },
  {
    title: 'Static frontend plus Node services',
    detail:
      'The frontend stays deployable as a static Vite build while the Fastify API and worker run as separate Node services against PostgreSQL.',
    status: 'done',
  },
  {
    title: 'Blueprint manifest',
    detail:
      'A tracked render.yaml provisions the frontend, API, worker, and PostgreSQL with the right startup commands and env contract.',
    status: 'done',
  },
  {
    title: 'Credentialed production launch',
    detail:
      'Still depends on external platform accounts and secrets such as DATABASE_URL, JWT secrets, cookie secret, and optional OpenAI keys.',
    status: 'external',
  },
]
