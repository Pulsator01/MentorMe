import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { initialPlatformData } from '../data/platformData'
import { authClient } from '../auth/authClient'

const AppStateContext = createContext(null)

const nextRequestId = (requests) => {
  const next = requests.length + 1
  return `REQ-${String(next).padStart(3, '0')}`
}

const toFrontendMentor = (mentor) => ({
  ...mentor,
  calendly: mentor.calendly || mentor.calendlyUrl || '',
})

const toFrontendVenture = (venture) => ({
  ...venture,
  founder: venture.founder || venture.founderName,
})

const toFrontendRequest = (request) => ({
  ...request,
  artifactList: request.artifactList || [],
  mentorNotes: request.mentorNotes || '',
  meetingAt: request.meetingAt || '',
  calendlyLink: request.calendlyLink || '',
  cfeOwner: request.cfeOwner || 'CFE routing queue',
})

const mapApiState = ({ ventures, requests, mentors, currentUser, currentVentureId }) => {
  const venture =
    ventures.find((item) => item.id === currentVentureId) ||
    ventures.find((item) => item.name === initialPlatformData.venture.name) ||
    ventures[0] ||
    initialPlatformData.venture

  return {
    currentUser: currentUser || null,
    venture: toFrontendVenture(venture),
    mentors: mentors.map(toFrontendMentor),
    requests: requests.map(toFrontendRequest),
  }
}

const NOTIFICATION_CAP = 50

let notificationCounter = 0

const buildNotificationId = () => {
  notificationCounter += 1
  return `n-${Date.now().toString(36)}-${notificationCounter.toString(36)}`
}

const appendNotification = (existing, notification) => {
  const next = [{ read: false, ...notification, id: notification.id || buildNotificationId() }, ...existing]
  return next.slice(0, NOTIFICATION_CAP)
}

const synthesizeRequestNotification = (state, requestId, summary) => {
  if (!requestId) {
    return null
  }

  return {
    type: 'request.updated',
    requestId,
    summary,
    receivedAt: new Date().toISOString(),
  }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ...action.payload,
        mode: action.mode || state.mode,
        bootStatus: 'authenticated',
      }
    case 'set-user':
      return {
        ...state,
        currentUser: action.payload.user,
        bootStatus: action.payload.bootStatus || state.bootStatus,
      }
    case 'reset-session':
      return {
        ...initialPlatformData,
        currentUser: null,
        mode: state.mode,
        bootStatus: 'unauthenticated',
        notifications: [],
      }
    case 'submit-request': {
      const request = {
        id: nextRequestId(state.requests),
        createdAt: new Date().toISOString(),
        status: 'cfe_review',
        mentorNotes: '',
        meetingAt: '',
        calendlyLink: '',
        cfeOwner: 'CFE routing queue',
        ...action.payload,
      }

      return {
        ...state,
        venture: {
          ...state.venture,
          name: action.payload.ventureName || state.venture.name,
          stage: action.payload.stage,
          trl: Number(action.payload.trl),
          brl: Number(action.payload.brl),
        },
        requests: [request, ...state.requests],
        notifications: appendNotification(
          state.notifications,
          synthesizeRequestNotification(state, request.id, `New request ${request.id} submitted for CFE review.`),
        ),
      }
    }
    case 'resubmit-request':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? {
                ...request,
                status: 'cfe_review',
              }
            : request,
        ),
        notifications: appendNotification(
          state.notifications,
          synthesizeRequestNotification(state, action.payload.id, `Request ${action.payload.id} re-submitted for CFE review.`),
        ),
      }
    case 'approve-request':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? { ...request, status: 'awaiting_mentor', cfeOwner: action.payload.owner || request.cfeOwner }
            : request,
        ),
        notifications: appendNotification(
          state.notifications,
          synthesizeRequestNotification(state, action.payload.id, `Request ${action.payload.id} approved — awaiting mentor.`),
        ),
      }
    case 'reject-request':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? { ...request, status: 'needs_work', mentorNotes: action.payload.reason }
            : request,
        ),
        notifications: appendNotification(
          state.notifications,
          synthesizeRequestNotification(state, action.payload.id, `Request ${action.payload.id} returned to founder for revision.`),
        ),
      }
    case 'schedule-request':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? {
                ...request,
                status: 'scheduled',
                meetingAt: action.payload.meetingAt,
                calendlyLink: action.payload.calendlyLink,
              }
            : request,
        ),
        notifications: appendNotification(
          state.notifications,
          synthesizeRequestNotification(state, action.payload.id, `Mentor session scheduled for ${action.payload.id}.`),
        ),
      }
    case 'save-feedback':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? {
                ...request,
                status: 'follow_up',
                mentorNotes: action.payload.notes,
              }
            : request,
        ),
        notifications: appendNotification(
          state.notifications,
          synthesizeRequestNotification(state, action.payload.id, `Mentor feedback recorded for ${action.payload.id}.`),
        ),
      }
    case 'attach-artifact':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? {
                ...request,
                artifactList: [...request.artifactList, action.payload.filename],
              }
            : request,
        ),
      }
    case 'close-request':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? {
                ...request,
                status: 'closed',
              }
            : request,
        ),
        notifications: appendNotification(
          state.notifications,
          synthesizeRequestNotification(state, action.payload.id, `Request ${action.payload.id} closed.`),
        ),
      }
    case 'add-mentor':
      return {
        ...state,
        mentors: [
          {
            id: `m-${action.payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            visibility: 'Active',
            ...action.payload,
          },
          ...state.mentors,
        ],
      }
    case 'update-mentor':
      return {
        ...state,
        mentors: state.mentors.map((mentor) =>
          mentor.id === action.payload.id ? { ...mentor, ...action.payload.updates } : mentor,
        ),
      }
    case 'notification-received': {
      if (!action.payload) {
        return state
      }
      return {
        ...state,
        notifications: appendNotification(state.notifications, action.payload),
      }
    }
    case 'notification-mark-read':
      return {
        ...state,
        notifications: state.notifications.map((notification) =>
          notification.id === action.payload.id ? { ...notification, read: true } : notification,
        ),
      }
    case 'notification-mark-all-read':
      return {
        ...state,
        notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
      }
    case 'notifications-clear':
      return {
        ...state,
        notifications: [],
      }
    default:
      return state
  }
}

export const buildMentorUpdatePayload = (updates) => {
  const payload = Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined))

  if (updates.calendly !== undefined) {
    payload.calendlyUrl = updates.calendly
  }

  delete payload.calendly
  return payload
}

export const createApiClient = (baseUrl) => {
  const trim = baseUrl.replace(/\/$/, '')

  const buildJsonHeaders = (options = {}) => {
    const headers = {
      ...(options.headers || {}),
    }

    const hasExplicitContentType =
      Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')

    if (options.body !== undefined && !hasExplicitContentType) {
      headers['Content-Type'] = 'application/json'
    }

    return headers
  }

  const request = async (path, options = {}) =>
    await fetch(`${trim}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
      credentials: 'include',
    })

  const json = async (path, options = {}) => {
    const response = await request(path, {
      ...options,
      headers: buildJsonHeaders(options),
    })

    if (!response.ok) {
      const text = await response.text()
      const error = new Error(text || `Request failed for ${path} (${response.status})`)
      error.status = response.status
      throw error
    }

    if (response.status === 204) {
      return null
    }

    return await response.json()
  }

  const authenticatedFetch = async (path, options = {}) => {
    const response = await request(path, {
      ...options,
      headers: buildJsonHeaders(options),
    })

    if (!response.ok) {
      const text = await response.text()
      const error = new Error(text || `Request failed for ${path} (${response.status})`)
      error.status = response.status
      throw error
    }

    return response
  }

  const authenticatedJson = async (path, options = {}) => {
    const response = await authenticatedFetch(path, options)

    if (response.status === 204) {
      return null
    }

    return await response.json()
  }

  const parseStreamChunk = (buffer, onMessage) => {
    let nextBuffer = buffer
    let delimiterIndex = nextBuffer.indexOf('\n\n')

    while (delimiterIndex >= 0) {
      const block = nextBuffer.slice(0, delimiterIndex)
      const payload = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')

      if (payload) {
        onMessage(JSON.parse(payload))
      }

      nextBuffer = nextBuffer.slice(delimiterIndex + 2)
      delimiterIndex = nextBuffer.indexOf('\n\n')
    }

    return nextBuffer
  }

  return {
    async bootstrap() {
      try {
        const me = await authenticatedJson('/me')
        return { user: me.user }
      } catch (error) {
        if (error?.status === 401 || error?.status === 400) {
          return null
        }
        throw error
      }
    },
    getMe() {
      return authenticatedJson('/me')
    },
    getOnboardingStatus() {
      return authenticatedJson('/me/onboarding')
    },
    completeFounderOnboarding(payload) {
      return authenticatedJson('/onboarding/founder', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    completeStudentOnboarding(payload) {
      return authenticatedJson('/onboarding/student', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    getStudentJoinOptions() {
      return authenticatedJson('/onboarding/student/options')
    },
    listInvitations() {
      return authenticatedJson('/invitations')
    },
    createInvitation(payload) {
      return authenticatedJson('/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    revokeInvitation(invitationId) {
      return authenticatedJson(`/invitations/${invitationId}`, {
        method: 'DELETE',
      })
    },
    previewInvitation(token) {
      return json(`/invitations/${encodeURIComponent(token)}`)
    },
    acceptInvitation(token) {
      return authenticatedJson(`/invitations/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
      })
    },
    getVentures() {
      return authenticatedJson('/ventures')
    },
    getVenture(ventureId) {
      return authenticatedJson(`/ventures/${ventureId}`)
    },
    getRequests() {
      return authenticatedJson('/requests')
    },
    getRequestsForVenture(ventureId) {
      return authenticatedJson(`/ventures/${ventureId}/requests`)
    },
    getMentors() {
      return authenticatedJson('/mentors')
    },
    createRequest(ventureId, payload) {
      return authenticatedJson(`/ventures/${ventureId}/requests`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    submitRequest(requestId) {
      return authenticatedJson(`/requests/${requestId}/submit`, {
        method: 'POST',
      })
    },
    approveRequest(requestId, ownerName) {
      return authenticatedJson(`/requests/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ ownerName }),
      })
    },
    returnRequest(requestId, reason) {
      return authenticatedJson(`/requests/${requestId}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },
    closeRequest(requestId) {
      return authenticatedJson(`/requests/${requestId}/close`, {
        method: 'POST',
      })
    },
    presignArtifact(requestId, payload) {
      return authenticatedJson(`/requests/${requestId}/artifacts/presign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    completeArtifact(requestId, artifactId) {
      return authenticatedJson(`/requests/${requestId}/artifacts/complete`, {
        method: 'POST',
        body: JSON.stringify({ artifactId }),
      })
    },
    addMentor(payload) {
      return authenticatedJson('/mentors', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    updateMentor(mentorId, updates) {
      return authenticatedJson(`/mentors/${mentorId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    },
    createMentorOutreach(requestId) {
      return authenticatedJson(`/requests/${requestId}/mentor-outreach`, {
        method: 'POST',
      })
    },
    generateRequestBrief(payload) {
      return authenticatedJson('/ai/request-brief', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    generateMentorRecommendations(payload) {
      return authenticatedJson('/ai/mentor-recommendations', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    generateMeetingSummary(payload) {
      return authenticatedJson('/ai/meeting-summary', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    getMentorAction(token) {
      return json(`/mentor-actions/${token}`)
    },
    getCurrentMentorActions() {
      return authenticatedJson('/mentors/me/actions')
    },
    mentorRespond(token, payload) {
      return json(`/mentor-actions/${token}/respond`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    mentorSessionRespond(requestId, payload) {
      return authenticatedJson(`/mentors/me/actions/${requestId}/respond`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    mentorSchedule(token, payload) {
      return json(`/mentor-actions/${token}/schedule`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    mentorSessionSchedule(requestId, payload) {
      return authenticatedJson(`/mentors/me/actions/${requestId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    mentorFeedback(token, payload) {
      return json(`/mentor-actions/${token}/feedback`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    mentorSessionFeedback(requestId, payload) {
      return authenticatedJson(`/mentors/me/actions/${requestId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    async openNotificationsStream(onMessage, signal) {
      const response = await authenticatedFetch('/notifications/stream', {
        headers: {
          Accept: 'text/event-stream',
        },
        signal,
      })

      if (!response.body) {
        throw new Error('Notifications stream is unavailable')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            buffer = parseStreamChunk(buffer, onMessage)
            break
          }

          buffer += decoder.decode(value, { stream: true })
          buffer = parseStreamChunk(buffer, onMessage)
        }
      } finally {
        reader.releaseLock()
      }
    },
  }
}

const PUBLIC_PATH_PREFIXES = [
  '/welcome',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/mentors/action',
  '/invite',
]

const isPublicPath = (pathname) => PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))

export function AppStateProvider({ children }) {
  const location = useLocation()
  const apiBase = import.meta.env.VITE_API_BASE_URL
  const initialMode = apiBase ? 'api' : 'local'
  const [state, dispatch] = useReducer(reducer, {
    ...initialPlatformData,
    currentUser: null,
    mode: initialMode,
    bootStatus: apiBase ? 'pending' : 'ready',
    notifications: [],
  })
  const stateRef = useRef(state)
  const pathRef = useRef(location.pathname)
  const backendRef = useRef({
    client: null,
    ready: false,
  })

  pathRef.current = location.pathname

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const syncFromApi = useCallback(async (clientOverride, pathnameOverride = pathRef.current) => {
    const client = clientOverride || backendRef.current.client

    if (!client) {
      return
    }

    const venturesBody = await client.getVentures()
    const scopedVentureId =
      stateRef.current.venture?.id ||
      venturesBody.ventures.find((item) => item.name === initialPlatformData.venture.name)?.id ||
      venturesBody.ventures[0]?.id
    const isScopedWorkspace = pathnameOverride.startsWith('/founders') || pathnameOverride.startsWith('/students')

    const [meBody, requestsBody, mentorsBody, ventureBody] = await Promise.all([
      client.getMe(),
      isScopedWorkspace && scopedVentureId ? client.getRequestsForVenture(scopedVentureId) : client.getRequests(),
      client.getMentors(),
      isScopedWorkspace && scopedVentureId ? client.getVenture(scopedVentureId) : Promise.resolve(null),
    ])

    dispatch({
      type: 'hydrate',
      mode: 'api',
      payload: mapApiState({
        currentUser: meBody.user,
        ventures: ventureBody ? [ventureBody.venture] : venturesBody.ventures,
        requests: requestsBody.requests,
        mentors: mentorsBody.mentors,
        currentVentureId: scopedVentureId,
      }),
    })
  }, [])

  const startBackgroundSync = useCallback(
    (client, pathname) => {
      const streamAbortController = new AbortController()
      let active = true

      void client
        .openNotificationsStream(
          (message) => {
            if (!active || message?.type === 'connected') {
              return
            }

            const requestId = typeof message?.requestId === 'string' ? message.requestId : null
            if (requestId) {
              dispatch({
                type: 'notification-received',
                payload: {
                  type: 'request.updated',
                  requestId,
                  summary: `Request ${requestId} was updated.`,
                  receivedAt: new Date().toISOString(),
                  payload: message,
                },
              })
            }

            void syncFromApi(client, pathname)
          },
          streamAbortController.signal,
        )
        .catch(() => {})

      const pollTimer = window.setInterval(() => {
        if (!active) {
          return
        }

        void syncFromApi(client, pathname)
      }, 2500)

      return () => {
        active = false
        streamAbortController.abort()
        window.clearInterval(pollTimer)
      }
    },
    [syncFromApi],
  )

  useEffect(() => {
    if (!apiBase) {
      return undefined
    }

    let active = true
    const client = backendRef.current.client || createApiClient(apiBase)
    backendRef.current.client = client

    const boot = async () => {
      try {
        const session = await client.bootstrap()

        if (!active) {
          return
        }

        if (!session) {
          backendRef.current.ready = false
          dispatch({ type: 'set-user', payload: { user: null, bootStatus: 'unauthenticated' } })
          return
        }

        backendRef.current.ready = true
        dispatch({ type: 'set-user', payload: { user: session.user, bootStatus: 'authenticated' } })
      } catch {
        if (!active) {
          return
        }
        backendRef.current.ready = false
        dispatch({ type: 'set-user', payload: { user: null, bootStatus: 'unauthenticated' } })
      }
    }

    void boot()

    return () => {
      active = false
    }
  }, [apiBase])

  useEffect(() => {
    if (!backendRef.current.ready || !backendRef.current.client) {
      return undefined
    }

    if (isPublicPath(location.pathname)) {
      return undefined
    }

    void syncFromApi(backendRef.current.client, location.pathname)
    return startBackgroundSync(backendRef.current.client, location.pathname)
  }, [location.pathname, state.currentUser?.id, startBackgroundSync, syncFromApi])

  const ensureClient = useCallback(() => {
    if (!backendRef.current.client) {
      throw new Error('The API backend is not configured for this build (set VITE_API_BASE_URL).')
    }
    return backendRef.current.client
  }, [])

  const refreshCurrentUser = useCallback(async (sessionUser) => {
    if (sessionUser) {
      dispatch({ type: 'set-user', payload: { user: sessionUser, bootStatus: 'authenticated' } })
    }
    backendRef.current.ready = true
    if (backendRef.current.client) {
      await syncFromApi(backendRef.current.client, pathRef.current)
    }
  }, [syncFromApi])

  const getOnboardingStatus = useCallback(async () => {
    const client = ensureClient()
    return await client.getOnboardingStatus()
  }, [ensureClient])

  const completeFounderOnboarding = useCallback(async (payload) => {
    const client = ensureClient()
    const result = await client.completeFounderOnboarding(payload)
    await refreshCurrentUser(result.user)
    return result
  }, [ensureClient, refreshCurrentUser])

  const completeStudentOnboarding = useCallback(async (payload) => {
    const client = ensureClient()
    const result = await client.completeStudentOnboarding(payload)
    await refreshCurrentUser(result.user)
    return result
  }, [ensureClient, refreshCurrentUser])

  const getStudentJoinOptions = useCallback(async () => {
    const client = ensureClient()
    return await client.getStudentJoinOptions()
  }, [ensureClient])

  const getMentorAction = useCallback(async (token) => {
    if (!backendRef.current.client) {
      throw new Error('Mentor action links require the API backend')
    }

    return await backendRef.current.client.getMentorAction(token)
  }, [])

  const getCurrentMentorActions = useCallback(async () => {
    if (!backendRef.current.client) {
      const currentState = stateRef.current
      const localMentor =
        currentState.mentors.find((mentor) => currentState.requests.some((request) => request.mentorId === mentor.id)) ||
        currentState.mentors[0]
      const actions = currentState.requests
        .filter((request) => request.mentorId === localMentor?.id)
        .map((request) => ({
          mentorAction: {
            purpose: 'mentor_request',
            response: ['scheduled', 'follow_up', 'closed'].includes(request.status) ? 'accepted' : undefined,
          },
          request,
        }))

      return { mentor: localMentor, actions }
    }

    return await backendRef.current.client.getCurrentMentorActions()
  }, [])

  const respondToMentorAction = useCallback(async (token, payload) => {
    if (!backendRef.current.client) {
      throw new Error('Mentor action links require the API backend')
    }

    return await backendRef.current.client.mentorRespond(token, payload)
  }, [])

  const respondToMentorRequest = useCallback(async (requestId, payload) => {
    if (!backendRef.current.client) {
      const request = state.requests.find((item) => item.id === requestId)
      return { decision: payload.decision, request }
    }

    const result = await backendRef.current.client.mentorSessionRespond(requestId, payload)
    await syncFromApi()
    return result
  }, [state.requests, syncFromApi])

  const scheduleMentorAction = useCallback(async (token, payload) => {
    if (!backendRef.current.client) {
      throw new Error('Mentor action links require the API backend')
    }

    return await backendRef.current.client.mentorSchedule(token, payload)
  }, [])

  const scheduleMentorRequest = useCallback(async (requestId, payload) => {
    if (!backendRef.current.client) {
      dispatch({
        type: 'schedule-request',
        payload: {
          id: requestId,
          calendlyLink: payload.calendlyLink,
          meetingAt: payload.meetingAt,
        },
      })
      return {
        request: {
          ...state.requests.find((item) => item.id === requestId),
          status: 'scheduled',
          calendlyLink: payload.calendlyLink,
          meetingAt: payload.meetingAt,
        },
      }
    }

    const result = await backendRef.current.client.mentorSessionSchedule(requestId, payload)
    await syncFromApi()
    return result
  }, [state.requests, syncFromApi])

  const saveMentorActionFeedback = useCallback(async (token, payload) => {
    if (!backendRef.current.client) {
      throw new Error('Mentor action links require the API backend')
    }

    return await backendRef.current.client.mentorFeedback(token, payload)
  }, [])

  const saveMentorRequestFeedback = useCallback(async (requestId, payload) => {
    if (!backendRef.current.client) {
      dispatch({ type: 'save-feedback', payload: { id: requestId, notes: payload.mentorNotes } })
      return {
        request: {
          ...state.requests.find((item) => item.id === requestId),
          status: 'follow_up',
          mentorNotes: payload.mentorNotes,
        },
      }
    }

    const result = await backendRef.current.client.mentorSessionFeedback(requestId, payload)
    await syncFromApi()
    return result
  }, [state.requests, syncFromApi])

  const value = {
    currentUser: state.currentUser,
    venture: state.venture,
    mentors: state.mentors,
    requests: state.requests,
    notifications: state.notifications,
    unreadNotificationCount: state.notifications.filter((notification) => !notification.read).length,
    mode: state.mode,
    bootStatus: state.bootStatus,
    apiConfigured: Boolean(apiBase),
    markNotificationRead: (id) => dispatch({ type: 'notification-mark-read', payload: { id } }),
    markAllNotificationsRead: () => dispatch({ type: 'notification-mark-all-read' }),
    clearNotifications: () => dispatch({ type: 'notifications-clear' }),
    authClient,
    register: async ({ name, email, password, role }) => {
      if (!authClient) throw new Error('Auth backend is not configured')
      const result = await authClient.signUp.email({ name, email, password, role })
      if (result.error) throw new Error(result.error.message || 'Registration failed')
      await refreshCurrentUser(result.data?.user)
      return result.data
    },
    login: async ({ email, password }) => {
      if (!authClient) throw new Error('Auth backend is not configured')
      const result = await authClient.signIn.email({ email, password })
      if (result.error) throw new Error(result.error.message || 'Sign in failed')
      await refreshCurrentUser(result.data?.user)
      return result.data
    },
    logout: async () => {
      if (authClient) {
        try {
          await authClient.signOut()
        } catch {
          // ignore signout errors
        }
      }
      backendRef.current.ready = false
      dispatch({ type: 'reset-session' })
    },
    forgotPassword: async (email) => {
      if (!authClient) throw new Error('Auth backend is not configured')
      const result = await authClient.forgetPassword({ email, redirectTo: '/reset-password' })
      if (result.error) throw new Error(result.error.message || 'Could not send reset email')
      return result.data
    },
    resetPassword: async ({ token, password }) => {
      if (!authClient) throw new Error('Auth backend is not configured')
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) throw new Error(result.error.message || 'Password reset failed')
      return result.data
    },
    changePassword: async ({ currentPassword, newPassword }) => {
      if (!authClient) throw new Error('Auth backend is not configured')
      const result = await authClient.changePassword({ currentPassword, newPassword })
      if (result.error) throw new Error(result.error.message || 'Password change failed')
      return result.data
    },
    startGoogleOAuth: async () => {
      if (!authClient) throw new Error('Auth backend is not configured')
      await authClient.signIn.social({ provider: 'google' })
    },
    requestMagicLink: async (email) => {
      if (!authClient) throw new Error('Auth backend is not configured')
      const result = await authClient.signIn.magicLink({ email })
      if (result.error) throw new Error(result.error.message || 'Could not send magic link')
      return result.data
    },
    verifyMagicLink: async (token) => {
      if (!authClient) throw new Error('Auth backend is not configured')
      const result = await authClient.magicLink.verify({ query: { token } })
      if (result.error) throw new Error(result.error.message || 'Magic link verification failed')
      await refreshCurrentUser(result.data?.user)
      return result.data
    },
    getOnboardingStatus,
    completeFounderOnboarding,
    completeStudentOnboarding,
    getStudentJoinOptions,
    listInvitations: async () => {
      const client = ensureClient()
      return await client.listInvitations()
    },
    createInvitation: async (payload) => {
      const client = ensureClient()
      return await client.createInvitation(payload)
    },
    revokeInvitation: async (invitationId) => {
      const client = ensureClient()
      return await client.revokeInvitation(invitationId)
    },
    previewInvitation: async (token) => {
      const client = ensureClient()
      return await client.previewInvitation(token)
    },
    acceptInvitation: async (token) => {
      const client = ensureClient()
      const result = await client.acceptInvitation(token)
      await refreshCurrentUser(result.user)
      return result
    },
    submitRequest: async (payload) => {
      if (backendRef.current.ready && backendRef.current.client && state.venture.id) {
        await backendRef.current.client.createRequest(state.venture.id, {
          stage: payload.stage,
          trl: Number(payload.trl),
          brl: Number(payload.brl),
          challenge: payload.challenge,
          desiredOutcome: payload.desiredOutcome,
          preferredMentorIds: payload.mentorId ? [payload.mentorId] : [],
          artifactRefs: payload.artifactList || [],
        })
        await syncFromApi()
        return
      }

      dispatch({ type: 'submit-request', payload })
    },
    resubmitRequest: async (id) => {
      if (backendRef.current.ready && backendRef.current.client) {
        await backendRef.current.client.submitRequest(id)
        await syncFromApi()
        return
      }

      dispatch({ type: 'resubmit-request', payload: { id } })
    },
    approveRequest: async (id, owner) => {
      if (backendRef.current.ready && backendRef.current.client) {
        await backendRef.current.client.approveRequest(id, owner)
        await syncFromApi()
        return
      }

      dispatch({ type: 'approve-request', payload: { id, owner } })
    },
    rejectRequest: async (id, reason) => {
      if (backendRef.current.ready && backendRef.current.client) {
        await backendRef.current.client.returnRequest(id, reason)
        await syncFromApi()
        return
      }

      dispatch({ type: 'reject-request', payload: { id, reason } })
    },
    closeRequest: async (id) => {
      if (backendRef.current.ready && backendRef.current.client) {
        await backendRef.current.client.closeRequest(id)
        await syncFromApi()
        return
      }

      dispatch({ type: 'close-request', payload: { id } })
    },
    uploadArtifact: async (id, file) => {
      if (backendRef.current.ready && backendRef.current.client) {
        const presigned = await backendRef.current.client.presignArtifact(id, {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          sizeBytes: file.size || 1,
        })
        await backendRef.current.client.completeArtifact(id, presigned.artifact.id)
        await syncFromApi()
        return presigned.artifact
      }

      dispatch({ type: 'attach-artifact', payload: { id, filename: file.name } })
      return { id: `${id}-${file.name}` }
    },
    scheduleRequest: async (id, calendlyLink, meetingAt) =>
      dispatch({ type: 'schedule-request', payload: { id, calendlyLink, meetingAt } }),
    saveFeedback: async (id, notes) => dispatch({ type: 'save-feedback', payload: { id, notes } }),
    addMentor: async (payload) => {
      if (backendRef.current.ready && backendRef.current.client) {
        const fallbackEmail = `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@mentorme.test`
        await backendRef.current.client.addMentor({
          id: `m-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: payload.name,
          email: payload.email?.trim() || fallbackEmail,
          title: payload.title,
          location: payload.location,
          focus: payload.focus,
          stages: payload.stages,
          domains: payload.domains,
          tolerance: payload.tolerance,
          monthlyLimit: Number(payload.monthlyLimit),
          visibility: 'Active',
          responseWindow: payload.responseWindow,
          calendlyUrl: payload.calendly || '',
          bio: payload.bio,
        })
        await syncFromApi()
        return
      }

      dispatch({ type: 'add-mentor', payload })
    },
    updateMentor: async (id, updates) => {
      if (backendRef.current.ready && backendRef.current.client) {
        await backendRef.current.client.updateMentor(id, buildMentorUpdatePayload(updates))
        await syncFromApi()
        return
      }

      dispatch({ type: 'update-mentor', payload: { id, updates } })
    },
    createMentorOutreach: async (id) => {
      if (!backendRef.current.ready || !backendRef.current.client) {
        return { mentorActionToken: `local-preview-${id.toLowerCase()}` }
      }

      return await backendRef.current.client.createMentorOutreach(id)
    },
    generateAiRequestBrief: async (payload) => {
      if (!backendRef.current.client) {
        throw new Error('The AI assistant requires the API backend to be running.')
      }

      return await backendRef.current.client.generateRequestBrief(payload)
    },
    generateAiMentorRecommendations: async (payload) => {
      if (!backendRef.current.client) {
        throw new Error('The AI mentor matcher requires the API backend to be running.')
      }

      return await backendRef.current.client.generateMentorRecommendations(payload)
    },
    generateAiMeetingSummary: async (payload) => {
      if (!backendRef.current.client) {
        throw new Error('The AI assistant requires the API backend to be running.')
      }

      return await backendRef.current.client.generateMeetingSummary(payload)
    },
    getMentorAction,
    getCurrentMentorActions,
    respondToMentorAction,
    respondToMentorRequest,
    scheduleMentorAction,
    scheduleMentorRequest,
    saveMentorActionFeedback,
    saveMentorRequestFeedback,
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export const useAppState = () => {
  const value = useContext(AppStateContext)

  if (!value) {
    throw new Error('useAppState must be used within AppStateProvider')
  }

  return value
}
