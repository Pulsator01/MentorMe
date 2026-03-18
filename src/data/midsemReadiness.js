export const productSnapshot = {
  name: 'MentorMe',
  oneLiner:
    'A mentorship operations platform for incubation programs that need founders, students, CFE teams, and mentors to work through one clean pipeline.',
  market:
    'University incubators, entrepreneurship cells, accelerator programs, innovation offices, and startup support teams that coordinate mentors across many ventures.',
  businessModel:
    'Institutional SaaS priced per cohort or annual program seat, with mentor-network operations and workflow visibility as the first paid wedge.',
}

export const journeyChecklist = [
  {
    name: 'Founder intake',
    detail: 'Founders describe the venture, attach proof, shortlist mentors, and send a clean request to CFE.',
    status: 'done',
  },
  {
    name: 'CFE triage',
    detail: 'CFE reviews the ask, returns weak briefs, approves strong ones, and manages routing capacity.',
    status: 'done',
  },
  {
    name: 'Mentor response',
    detail: 'Mentors can now accept or decline securely from the outreach link before scheduling.',
    status: 'done',
  },
  {
    name: 'Student follow-through',
    detail: 'Students prepare materials, track session prep, and close the loop after meetings.',
    status: 'done',
  },
  {
    name: 'Live sync and AI assist',
    detail: 'SSE is exposed and AI endpoints are still the next layer, but the current mid-sem flow works without them.',
    status: 'in_progress',
  },
]

export const endpointChecklist = [
  {
    method: 'POST',
    path: '/auth/magic-link/request',
    category: 'Non-AI',
    screen: 'Role bootstrap',
    purpose: 'Issue local demo magic link token.',
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
    purpose: 'Refresh access token from cookie session.',
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
    screen: 'Founder and CFE workspaces',
    purpose: 'Load mentor request pipeline.',
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
    purpose: 'Resubmit a returned request to CFE.',
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
    path: '/requests/:requestId/artifacts/presign',
    category: 'Non-AI',
    screen: 'Founder request composer',
    purpose: 'Prepare artifact upload.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/requests/:requestId/artifacts/complete',
    category: 'Non-AI',
    screen: 'Founder request composer',
    purpose: 'Mark uploaded artifact as complete.',
    status: 'done',
  },
  {
    method: 'GET',
    path: '/mentors',
    category: 'Non-AI',
    screen: 'Founder matching and CFE mentor network',
    purpose: 'Load mentor roster and visibility state.',
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
    purpose: 'Create secure mentor action link.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/mentor-actions/:token/respond',
    category: 'Non-AI',
    screen: 'Secure mentor action flow',
    purpose: 'Accept or decline mentor outreach.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/mentor-actions/:token/schedule',
    category: 'Non-AI',
    screen: 'Secure mentor action flow',
    purpose: 'Schedule a confirmed session.',
    status: 'done',
  },
  {
    method: 'POST',
    path: '/mentor-actions/:token/feedback',
    category: 'Non-AI',
    screen: 'Secure mentor action flow',
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
    screen: 'Live updates',
    purpose: 'Expose SSE updates when request state changes.',
    status: 'in_progress',
  },
  {
    method: 'POST',
    path: '/ai/request-brief',
    category: 'AI',
    screen: 'Founder request composer',
    purpose: 'Turn raw notes into a mentor-ready brief.',
    status: 'planned',
  },
  {
    method: 'POST',
    path: '/ai/meeting-summary',
    category: 'AI',
    screen: 'Student follow-up',
    purpose: 'Summarize mentor conversations into next-step tasks.',
    status: 'planned',
  },
]

export const dbEntities = [
  {
    name: 'User, Venture, VentureMembership',
    detail: 'Role-aware access control and venture scoping.',
  },
  {
    name: 'MentorProfile, MentorCapacitySnapshot',
    detail: 'Mentor metadata, visibility, and bandwidth tracking.',
  },
  {
    name: 'MentorRequest, MentorRequestShortlist',
    detail: 'Request intake, shortlist ranking, and state transitions.',
  },
  {
    name: 'Artifact, Meeting, MeetingFeedback',
    detail: 'Attachments, scheduling, and post-session capture.',
  },
  {
    name: 'Session, MagicLinkToken, ExternalActionToken',
    detail: 'Authentication and secure external action flows.',
  },
  {
    name: 'AuditEvent, OutboxEvent, WebhookReceipt',
    detail: 'Traceability, async work, and webhook idempotency.',
  },
]

export const feedbackLearnings = [
  {
    title: 'Users need routing clarity, not another inbox',
    detail:
      'The product now centers CFE as the operating layer so founders do not contact mentors directly and mentors do not receive noisy low-context requests.',
  },
  {
    title: 'A weak brief wastes mentor capacity',
    detail:
      'Returned-request and resubmission flows matter because the quality gate is part of the product, not just an admin detail.',
  },
  {
    title: 'Student work is different from founder work',
    detail:
      'The student workspace is intentionally separate so prep, materials, and follow-up are visible without exposing the full founder request composer.',
  },
]

export const honestNextSteps = [
  'Wire Prisma/PostgreSQL as the active runtime instead of the seeded in-memory repository.',
  'Consume the existing SSE stream in the frontend so pipeline changes land live without manual refresh.',
  'Add at least one production-grade AI endpoint after the non-AI workflow is stable.',
  'Replace demo-mode role bootstrap with explicit user sign-in and session-aware frontend routing.',
]
