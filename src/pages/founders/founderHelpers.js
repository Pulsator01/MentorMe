export const stageOptions = ['Idea', 'TRL 3+', 'MVP', 'Pilot', 'Scale']

export const statusTone = {
  draft: 'slate',
  cfe_review: 'amber',
  needs_work: 'rose',
  awaiting_mentor: 'blue',
  scheduled: 'emerald',
  follow_up: 'blue',
  closed: 'slate',
}

export const statusLabels = {
  draft: 'Draft',
  cfe_review: 'CFE review',
  needs_work: 'Needs work',
  awaiting_mentor: 'Awaiting mentor',
  scheduled: 'Scheduled',
  follow_up: 'Follow-up',
  closed: 'Closed',
}

export const formatDate = (value, opts) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(opts || {}),
  })

export const domainTokens = (text = '') =>
  text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

export const getMatchScore = (mentor, form) => {
  const tokens = domainTokens(`${form.domain} ${form.challenge}`)
  let score = 58

  mentor.focus.forEach((focus) => {
    if (tokens.some((token) => focus.toLowerCase().includes(token))) {
      score += 7
    }
  })

  mentor.domains.forEach((domain) => {
    if (tokens.some((token) => domain.toLowerCase().includes(token))) {
      score += 6
    }
  })

  if (mentor.stages.some((stage) => stage.toLowerCase() === form.stage.toLowerCase())) {
    score += 12
  }

  if (mentor.tolerance === 'High') {
    score += 6
  }

  return Math.min(99, score)
}

export const getFallbackReasons = (mentor, form) => {
  const tokens = domainTokens(
    `${form.domain} ${form.challenge} ${form.desiredOutcome}`,
  )
  const domainHits = mentor.domains.filter((domain) =>
    tokens.some((token) => domain.toLowerCase().includes(token)),
  )
  const focusHits = mentor.focus.filter((focus) =>
    tokens.some((token) => focus.toLowerCase().includes(token)),
  )

  return [
    domainHits.length > 0 ? `Domain overlap: ${domainHits.slice(0, 2).join(', ')}` : '',
    focusHits.length > 0 ? `Functional fit: ${focusHits.slice(0, 2).join(', ')}` : '',
    mentor.stages.some((stage) => stage.toLowerCase() === form.stage.toLowerCase())
      ? `Has experience with ${form.stage} stage asks`
      : '',
    mentor.tolerance === 'High' ? 'High patience tolerance suits an evolving founder ask' : '',
  ].filter(Boolean)
}

export const buildFounderRequestNudge = (request, mentorName) => {
  if (request.status === 'scheduled') {
    return {
      id: request.id,
      title: `Prepare for ${request.ventureName}`,
      time: formatDate(request.meetingAt, { year: 'numeric' }),
      description: `Upload the pre-read and confirm who from CFE will join the session with ${mentorName || 'the mentor'}.`,
      status: 'urgent',
      action: 'Upload pre-read',
    }
  }

  if (request.status === 'follow_up') {
    return {
      id: request.id,
      title: 'Capture what changed after the meeting',
      time: 'Within 24h',
      description:
        'Log the mentor recommendation, any follow-up needed from CFE, and whether a second session is worth it.',
      status: 'calm',
      action: 'Log follow-up',
    }
  }

  if (request.status === 'needs_work') {
    return {
      id: request.id,
      title: `${request.ventureName} is in needs work`,
      time: 'Action required',
      description:
        request.mentorNotes || 'CFE needs a sharper brief before routing this request again.',
      status: 'warning',
      action: 'Revise brief',
    }
  }

  return {
    id: request.id,
    title: `${request.ventureName} is in ${request.status.replace('_', ' ')}`,
    time: formatDate(request.createdAt, { year: 'numeric' }),
    description:
      'CFE is checking fit, patience threshold, and whether the request is strong enough to send forward.',
    status: request.status === 'cfe_review' ? 'warning' : 'calm',
    action: request.status === 'cfe_review' ? 'Wait for approval' : 'Review request',
  }
}

export const filterFounderRequests = (requests, venture) =>
  requests.filter(
    (request) =>
      request.ventureName === venture.name && request.founderName === venture.founder,
  )

export const summarizeRequestCounts = (requests) => ({
  queued: requests.filter((request) =>
    ['draft', 'cfe_review', 'awaiting_mentor'].includes(request.status),
  ).length,
  scheduled: requests.filter((request) => request.status === 'scheduled').length,
  needsWork: requests.filter((request) => request.status === 'needs_work').length,
  followUp: requests.filter((request) => request.status === 'follow_up').length,
  closed: requests.filter((request) => request.status === 'closed').length,
})
