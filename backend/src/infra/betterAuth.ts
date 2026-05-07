import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import argon2 from 'argon2'
import type { PrismaClient } from '@prisma/client'
import type { EmailGateway } from '../domain/interfaces'

const argonOptions: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
}

export type BetterAuthInstance = ReturnType<typeof createBetterAuth>

export function createBetterAuth(opts: {
  prisma: PrismaClient
  secret: string
  baseURL: string
  appBaseUrl: string
  trustedOrigins: string[]
  email: EmailGateway
  defaultOrganizationId: string
  googleClientId?: string
  googleClientSecret?: string
  cookieDomain?: string
  cookieSecure?: boolean
}) {
  return betterAuth({
    database: prismaAdapter(opts.prisma, { provider: 'postgresql' }),
    basePath: '/api/auth',
    secret: opts.secret,
    baseURL: opts.baseURL,
    trustedOrigins: opts.trustedOrigins,

    emailAndPassword: {
      enabled: true,
      password: {
        hash: (password: string) => argon2.hash(password, argonOptions),
        verify: (data: { hash: string; password: string }) => argon2.verify(data.hash, data.password),
      },
      sendResetPassword: async ({ user, url }) => {
        await opts.email.sendPasswordReset({
          email: user.email,
          name: user.name,
          token: url,
        })
      },
    },

    socialProviders: {
      ...(opts.googleClientId && opts.googleClientSecret
        ? {
            google: {
              clientId: opts.googleClientId,
              clientSecret: opts.googleClientSecret,
            },
          }
        : {}),
    },

    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await opts.email.sendMagicLink({
            email,
            token: url,
            name: email,
          })
        },
      }),
    ],

    user: {
      additionalFields: {
        role: { type: 'string', required: true, defaultValue: 'founder', input: true },
        organizationId: {
          type: 'string',
          required: true,
          defaultValue: opts.defaultOrganizationId,
          input: true,
        },
        cohortId: { type: 'string', required: false, input: true },
        onboardedAt: { type: 'string', required: false },
        lastLoginAt: { type: 'string', required: false },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },

    advanced: {
      cookiePrefix: 'mentor_me',
      ...(opts.cookieDomain ? { defaultCookieAttributes: { domain: opts.cookieDomain } } : {}),
    },
  })
}
