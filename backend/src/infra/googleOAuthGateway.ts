import type { GoogleOAuthGateway, GoogleOAuthProfile, GoogleOAuthTokens } from '../domain/interfaces'

interface GoogleOAuthOptions {
  clientId: string
  clientSecret: string
  redirectUri: string
  authorizeUrl?: string
  tokenUrl?: string
  userInfoUrl?: string
  scope?: string
  fetchImpl?: typeof fetch
}

const DEFAULT_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const DEFAULT_SCOPE = 'openid email profile'

interface GoogleTokenResponse {
  access_token: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
  id_token?: string
}

interface GoogleUserInfoResponse {
  id: string
  email: string
  verified_email?: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

export const createGoogleOAuthGateway = (options: GoogleOAuthOptions): GoogleOAuthGateway => {
  const fetchImpl = options.fetchImpl ?? fetch
  const authorizeUrl = options.authorizeUrl ?? DEFAULT_AUTHORIZE_URL
  const tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL
  const userInfoUrl = options.userInfoUrl ?? DEFAULT_USERINFO_URL
  const scope = options.scope ?? DEFAULT_SCOPE

  if (!options.clientId || !options.clientSecret || !options.redirectUri) {
    throw new Error('Google OAuth gateway requires clientId, clientSecret, and redirectUri')
  }

  return {
    redirectUri: options.redirectUri,

    buildAuthorizeUrl(state: string) {
      const params = new URLSearchParams({
        client_id: options.clientId,
        redirect_uri: options.redirectUri,
        response_type: 'code',
        scope,
        access_type: 'offline',
        include_granted_scopes: 'true',
        prompt: 'select_account',
        state,
      })
      return `${authorizeUrl}?${params.toString()}`
    },

    async exchangeCode(code: string): Promise<GoogleOAuthTokens> {
      const body = new URLSearchParams({
        code,
        client_id: options.clientId,
        client_secret: options.clientSecret,
        redirect_uri: options.redirectUri,
        grant_type: 'authorization_code',
      })

      const response = await fetchImpl(tokenUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Google token exchange failed (${response.status}): ${errorText.slice(0, 200)}`)
      }

      const json = (await response.json()) as GoogleTokenResponse

      if (!json.access_token) {
        throw new Error('Google token response missing access_token')
      }

      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token,
        idToken: json.id_token,
        expiresInSeconds: typeof json.expires_in === 'number' ? json.expires_in : undefined,
        scope: json.scope,
      }
    },

    async fetchProfile(accessToken: string): Promise<GoogleOAuthProfile> {
      const response = await fetchImpl(userInfoUrl, {
        headers: { authorization: `Bearer ${accessToken}` },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Google userinfo fetch failed (${response.status}): ${errorText.slice(0, 200)}`)
      }

      const json = (await response.json()) as GoogleUserInfoResponse

      if (!json.id || !json.email) {
        throw new Error('Google userinfo response missing id or email')
      }

      return {
        providerAccountId: json.id,
        email: json.email,
        emailVerified: json.verified_email ?? false,
        name: json.name || [json.given_name, json.family_name].filter(Boolean).join(' ') || json.email,
      }
    },
  }
}
