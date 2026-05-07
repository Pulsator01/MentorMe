import { createAuthClient } from 'better-auth/react'
import { magicLinkClient } from 'better-auth/client/plugins'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

export const authClient = apiBaseUrl
  ? createAuthClient({
      baseURL: apiBaseUrl,
      plugins: [magicLinkClient()],
    })
  : null
