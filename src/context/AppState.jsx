import { createContext, useContext, useMemo, useReducer } from 'react'
import { initialPlatformData } from '../data/platformData'

const AppStateContext = createContext(null)

const nextRequestId = (requests) => {
  const next = requests.length + 1
  return `REQ-${String(next).padStart(3, '0')}`
}

const reducer = (state, action) => {
  switch (action.type) {
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

export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialPlatformData)

  const value = useMemo(
    () => ({
      venture: state.venture,
      mentors: state.mentors,
      requests: state.requests,
      submitRequest: (payload) => dispatch({ type: 'submit-request', payload }),
      approveRequest: (id, owner) => dispatch({ type: 'approve-request', payload: { id, owner } }),
      rejectRequest: (id, reason) => dispatch({ type: 'reject-request', payload: { id, reason } }),
      scheduleRequest: (id, calendlyLink, meetingAt) =>
        dispatch({ type: 'schedule-request', payload: { id, calendlyLink, meetingAt } }),
      saveFeedback: (id, notes) => dispatch({ type: 'save-feedback', payload: { id, notes } }),
      addMentor: (payload) => dispatch({ type: 'add-mentor', payload }),
      updateMentor: (id, updates) => dispatch({ type: 'update-mentor', payload: { id, updates } }),
    }),
    [state],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export const useAppState = () => {
  const value = useContext(AppStateContext)

  if (!value) {
    throw new Error('useAppState must be used within AppStateProvider')
  }

  return value
}
