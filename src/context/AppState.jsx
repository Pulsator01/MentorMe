import { createContext, useContext, useEffect, useReducer, useRef } from 'react'
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

const mapApiState = ({ ventures, requests, mentors, currentVentureId }) => {
  const venture =
    ventures.find((item) => item.id === currentVentureId) ||
    ventures.find((item) => item.name === initialPlatformData.venture.name) ||
    ventures[0] ||
    initialPlatformData.venture

  return {
    venture: toFrontendVenture(venture),
    mentors: mentors.map(toFrontendMentor),
    requests: requests.map(toFrontendRequest),
  }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ...action.payload,
        mode: action.mode || state.mode,
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
      }
    case 'approve-request':
      return {
        ...state,
        requests: state.requests.map((request) =>
          request.id === action.payload.id
            ? { ...request, status: 'awaiting_mentor', cfeOwner: action.payload.owner || request.cfeOwner }
            : request,
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

  const json = async (path, options = {}) => {
    const response = await fetch(`${trim}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'include',
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

  const authorizedJson = async (path, options = {}, allowRefresh = true) => {
    if (!accessToken) {
      throw new Error('Not authenticated')
    }

    try {
      return await json(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch (error) {
      if (!allowRefresh || !(error instanceof Error) || error.status !== 401) {
        throw error
      }

      const refreshBody = await json('/auth/refresh', {
        method: 'POST',
      })

      accessToken = refreshBody.accessToken

      return await authorizedJson(path, options, false)
    }
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

      accessToken = verifyBody.accessToken
      return verifyBody
    },
    getVentures() {
      return authorizedJson('/ventures')
    },
    getRequests() {
      return authorizedJson('/requests')
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
  }
}

export function AppStateProvider({ children }) {
  const location = useLocation()
  const [state, dispatch] = useReducer(reducer, {
    ...initialPlatformData,
    mode: 'local',
  })
  const backendRef = useRef({
    client: null,
    ready: false,
  })

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL

    if (!apiBase) {
      return undefined
    }

    let active = true
    const client = createApiClient(apiBase)
    backendRef.current.client = client

    const sync = async () => {
      try {
        await client.loginForPath(location.pathname)
        if (!active) {
          return
        }
        backendRef.current.ready = true

        const [venturesBody, requestsBody, mentorsBody] = await Promise.all([
          client.getVentures(),
          client.getRequests(),
          client.getMentors(),
        ])

        if (!active) {
          return
        }

        dispatch({
          type: 'hydrate',
          mode: 'api',
          payload: mapApiState({
            ventures: venturesBody.ventures,
            requests: requestsBody.requests,
            mentors: mentorsBody.mentors,
            currentVentureId: state.venture.id,
          }),
        })
      } catch {
        backendRef.current.ready = false
      }
    }

    void sync()

    return () => {
      active = false
    }
  }, [location.pathname, state.venture.id])

  const syncFromApi = async () => {
    if (!backendRef.current.client) {
      return
    }

    const [venturesBody, requestsBody, mentorsBody] = await Promise.all([
      backendRef.current.client.getVentures(),
      backendRef.current.client.getRequests(),
      backendRef.current.client.getMentors(),
    ])

    dispatch({
      type: 'hydrate',
      mode: 'api',
      payload: mapApiState({
        ventures: venturesBody.ventures,
        requests: requestsBody.requests,
        mentors: mentorsBody.mentors,
        currentVentureId: state.venture.id,
      }),
    })
  }

  const value = {
    venture: state.venture,
    mentors: state.mentors,
    requests: state.requests,
    mode: state.mode,
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
