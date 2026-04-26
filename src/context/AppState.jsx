import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { initialPlatformData } from '../data/platformData'

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

const getRoleEmailForPath = (path) => {
  if (path.startsWith('/cfe')) {
    return 'ritu.cfe@mentorme.test'
  }

  if (path.startsWith('/students')) {
    return 'ria.student@mentorme.test'
  }

  return 'aarav.sharma@mentorme.test'
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
  let accessToken = null

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

  const authorizedFetch = async (path, options = {}, allowRefresh = true) => {
    if (!accessToken) {
      if (!allowRefresh) {
        throw new Error('Not authenticated')
      }

      try {
        const refreshBody = await json('/auth/refresh', { method: 'POST' })
        accessToken = refreshBody.accessToken
      } catch (error) {
        throw new Error(error?.message || 'Not authenticated')
      }
    }

    const response = await request(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (response.ok) {
      return response
    }

    if (!allowRefresh || response.status !== 401) {
      const text = await response.text()
      const error = new Error(text || `Request failed for ${path} (${response.status})`)
      error.status = response.status
      throw error
    }

    const refreshBody = await json('/auth/refresh', {
      method: 'POST',
    })

    accessToken = refreshBody.accessToken
    return await authorizedFetch(path, options, false)
  }

  const authorizedJson = async (path, options = {}, allowRefresh = true) => {
    const response = await authorizedFetch(
      path,
      {
        ...options,
        headers: buildJsonHeaders(options),
      },
      allowRefresh,
    )

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

  const captureSession = (body) => {
    if (body?.accessToken) {
      accessToken = body.accessToken
    }
    return body
  }

  return {
    async loginForPath(pathname) {
      const email = getRoleEmailForPath(pathname)
      const requestBody = await json('/auth/magic-link/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      if (!requestBody?.debugToken) {
        throw new Error('Debug token is unavailable. Start the API with EXPOSE_DEBUG_TOKENS=true for local demo auth.')
      }

      const verifyBody = await json('/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token: requestBody.debugToken }),
      })

      return captureSession(verifyBody)
    },
    async register({ name, email, password, role, organizationId, cohortId }) {
      const body = await json('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          ...(role ? { role } : {}),
          ...(organizationId ? { organizationId } : {}),
          ...(cohortId ? { cohortId } : {}),
        }),
      })
      return captureSession(body)
    },
    async login({ email, password }) {
      const body = await json('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      return captureSession(body)
    },
    async forgotPassword(email) {
      return await json('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    },
    async resetPassword({ token, password }) {
      const body = await json('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      return captureSession(body)
    },
    async changePassword({ currentPassword, newPassword }) {
      const body = await authorizedJson('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      return captureSession(body)
    },
    async requestMagicLink(email) {
      return await json('/auth/magic-link/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    },
    async verifyMagicLink(token) {
      const body = await json('/auth/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
      return captureSession(body)
    },
    async getGoogleAuthorizeUrl(redirectAfter) {
      return await json('/auth/google/authorize-url', {
        method: 'POST',
        body: JSON.stringify(redirectAfter ? { redirectAfter } : {}),
      })
    },
    async completeGoogleOAuth({ code, state }) {
      const body = await json('/auth/google/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state }),
      })
      return captureSession(body)
    },
    async bootstrap() {
      try {
        const refreshBody = await json('/auth/refresh', { method: 'POST' })
        accessToken = refreshBody.accessToken
        const me = await authorizedJson('/me', {}, false)
        return { user: me.user, accessToken }
      } catch (error) {
        accessToken = null
        if (error?.status === 401 || error?.status === 400) {
          return null
        }
        throw error
      }
    },
    async logout() {
      try {
        await json('/auth/logout', { method: 'POST' })
      } finally {
        accessToken = null
      }
    },
    hasSession() {
      return Boolean(accessToken)
    },
    clearSession() {
      accessToken = null
    },
    getMe() {
      return authorizedJson('/me')
    },
    getOnboardingStatus() {
      return authorizedJson('/me/onboarding')
    },
    completeFounderOnboarding(payload) {
      return authorizedJson('/onboarding/founder', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    completeStudentOnboarding(payload) {
      return authorizedJson('/onboarding/student', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    getStudentJoinOptions() {
      return authorizedJson('/onboarding/student/options')
    },
    listInvitations() {
      return authorizedJson('/invitations')
    },
    createInvitation(payload) {
      return authorizedJson('/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    revokeInvitation(invitationId) {
      return authorizedJson(`/invitations/${invitationId}`, {
        method: 'DELETE',
      })
    },
    previewInvitation(token) {
      return json(`/invitations/${encodeURIComponent(token)}`)
    },
    acceptInvitation(token) {
      return authorizedJson(`/invitations/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
      })
    },
    getVentures() {
      return authorizedJson('/ventures')
    },
    getVenture(ventureId) {
      return authorizedJson(`/ventures/${ventureId}`)
    },
    getRequests() {
      return authorizedJson('/requests')
    },
    getRequestsForVenture(ventureId) {
      return authorizedJson(`/ventures/${ventureId}/requests`)
    },
    getMentors() {
      return authorizedJson('/mentors')
    },
    createRequest(ventureId, payload) {
      return authorizedJson(`/ventures/${ventureId}/requests`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    submitRequest(requestId) {
      return authorizedJson(`/requests/${requestId}/submit`, {
        method: 'POST',
      })
    },
    approveRequest(requestId, ownerName) {
      return authorizedJson(`/requests/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ ownerName }),
      })
    },
    returnRequest(requestId, reason) {
      return authorizedJson(`/requests/${requestId}/return`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },
    closeRequest(requestId) {
      return authorizedJson(`/requests/${requestId}/close`, {
        method: 'POST',
      })
    },
    presignArtifact(requestId, payload) {
      return authorizedJson(`/requests/${requestId}/artifacts/presign`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    completeArtifact(requestId, artifactId) {
      return authorizedJson(`/requests/${requestId}/artifacts/complete`, {
        method: 'POST',
        body: JSON.stringify({ artifactId }),
      })
    },
    addMentor(payload) {
      return authorizedJson('/mentors', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    updateMentor(mentorId, updates) {
      return authorizedJson(`/mentors/${mentorId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    },
    createMentorOutreach(requestId) {
      return authorizedJson(`/requests/${requestId}/mentor-outreach`, {
        method: 'POST',
      })
    },
    generateRequestBrief(payload) {
      return authorizedJson('/ai/request-brief', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    generateMentorRecommendations(payload) {
      return authorizedJson('/ai/mentor-recommendations', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    generateMeetingSummary(payload) {
      return authorizedJson('/ai/meeting-summary', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    getMentorAction(token) {
      return json(`/mentor-actions/${token}`)
    },
    mentorRespond(token, payload) {
      return json(`/mentor-actions/${token}/respond`, {
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
    mentorFeedback(token, payload) {
      return json(`/mentor-actions/${token}/feedback`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    async openNotificationsStream(onMessage, signal) {
      const response = await authorizedFetch('/notifications/stream', {
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

const PUBLIC_PATH_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth', '/mentors/action', '/invite']

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
  const backendRef = useRef({
    client: null,
    ready: false,
  })

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const syncFromApi = useCallback(async (clientOverride, pathnameOverride = location.pathname) => {
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
  }, [location.pathname])

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

  const ensureClient = () => {
    if (!backendRef.current.client) {
      throw new Error('The API backend is not configured for this build (set VITE_API_BASE_URL).')
    }
    return backendRef.current.client
  }

  const refreshCurrentUser = useCallback(async (sessionUser) => {
    if (sessionUser) {
      dispatch({ type: 'set-user', payload: { user: sessionUser, bootStatus: 'authenticated' } })
    }
    backendRef.current.ready = true
    if (backendRef.current.client) {
      await syncFromApi(backendRef.current.client, location.pathname)
    }
  }, [location.pathname, syncFromApi])

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
    register: async (payload) => {
      const client = ensureClient()
      const session = await client.register(payload)
      await refreshCurrentUser(session.user)
      return session
    },
    login: async (payload) => {
      const client = ensureClient()
      const session = await client.login(payload)
      await refreshCurrentUser(session.user)
      return session
    },
    logout: async () => {
      if (backendRef.current.client) {
        try {
          await backendRef.current.client.logout()
        } catch {
          backendRef.current.client.clearSession()
        }
      }
      backendRef.current.ready = false
      dispatch({ type: 'reset-session' })
    },
    forgotPassword: async (email) => {
      const client = ensureClient()
      return await client.forgotPassword(email)
    },
    resetPassword: async (payload) => {
      const client = ensureClient()
      const session = await client.resetPassword(payload)
      await refreshCurrentUser(session.user)
      return session
    },
    changePassword: async (payload) => {
      const client = ensureClient()
      const session = await client.changePassword(payload)
      await refreshCurrentUser(session.user)
      return session
    },
    startGoogleOAuth: async (redirectAfter) => {
      const client = ensureClient()
      return await client.getGoogleAuthorizeUrl(redirectAfter)
    },
    completeGoogleOAuth: async (payload) => {
      const client = ensureClient()
      const session = await client.completeGoogleOAuth(payload)
      await refreshCurrentUser(session.user)
      return session
    },
    requestMagicLink: async (email) => {
      const client = ensureClient()
      return await client.requestMagicLink(email)
    },
    verifyMagicLink: async (token) => {
      const client = ensureClient()
      const session = await client.verifyMagicLink(token)
      await refreshCurrentUser(session.user)
      return session
    },
    getOnboardingStatus: async () => {
      const client = ensureClient()
      return await client.getOnboardingStatus()
    },
    completeFounderOnboarding: async (payload) => {
      const client = ensureClient()
      const result = await client.completeFounderOnboarding(payload)
      await refreshCurrentUser(result.user)
      return result
    },
    completeStudentOnboarding: async (payload) => {
      const client = ensureClient()
      const result = await client.completeStudentOnboarding(payload)
      await refreshCurrentUser(result.user)
      return result
    },
    getStudentJoinOptions: async () => {
      const client = ensureClient()
      return await client.getStudentJoinOptions()
    },
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
        await backendRef.current.client.addMentor({
          id: `m-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: payload.name,
          email: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@mentorme.test`,
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
    getMentorAction: async (token) => {
      if (!backendRef.current.client) {
        throw new Error('Mentor action links require the API backend')
      }

      return await backendRef.current.client.getMentorAction(token)
    },
    respondToMentorAction: async (token, payload) => {
      if (!backendRef.current.client) {
        throw new Error('Mentor action links require the API backend')
      }

      return await backendRef.current.client.mentorRespond(token, payload)
    },
    scheduleMentorAction: async (token, payload) => {
      if (!backendRef.current.client) {
        throw new Error('Mentor action links require the API backend')
      }

      return await backendRef.current.client.mentorSchedule(token, payload)
    },
    saveMentorActionFeedback: async (token, payload) => {
      if (!backendRef.current.client) {
        throw new Error('Mentor action links require the API backend')
      }

      return await backendRef.current.client.mentorFeedback(token, payload)
    },
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
