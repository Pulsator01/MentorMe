# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-04-26

### Added

- Prisma migration for auth/onboarding-related schema and `AiRun` / `AiRunFeedback` tables.
- `backend/scripts/loadLocalEnv.ts` so `prisma-e2e` loads repo-root `.env` consistently.
- Playwright `e2e/welcome-auth.spec.ts` and optional `VITE_PLAYWRIGHT_AUTO_AUTH` boot path for stable E2E against protected routes.

### Changed

- `platformService` persists `AiRun` rows after AI calls that supply `getAiMeta` (with regression coverage in `app.test.ts`).
- Render `preDeployCommand` runs `prisma migrate deploy` for API and worker services.
- E2E helpers and specs updated for multi-page routes (`/cfe/pipeline`, founder pipeline), mentor seed user `radhika@mentorme.test`, and isolated CFE browser context.
- README and `docs/infra-setup.md` updated for migrations, E2E env, and Playwright auto-auth.

## [0.1.1] - 2026-04-26

### Security

- Require non-placeholder `JWT_SECRET` and `COOKIE_SECRET` when `NODE_ENV=production` (API exits at startup if missing).
- Validate self-service `organizationId` / `cohortId` on `POST /auth/register` against known organizations and cohort membership.
- Verify Calendly webhooks with `Calendly-Webhook-Signature` when `CALENDLY_WEBHOOK_SIGNING_SECRET` is set; reject webhooks in production if the secret is unset.
- Sanitize Google OAuth `redirectAfter` and auth `next` query parameters to block open redirects.
- Enforce `RequireRole` on founder, student, CFE, and mentor workspace routes (API mode; local demo mode unchanged).
- Fail closed in `RequireOnboarded` when onboarding status cannot be fetched (error UI with retry instead of treating failure as completed).

### Fixed

- Track `src/pages/founders/founderHelpers.js` in version control so production builds and CI resolve shared founder/student helpers.
- Invitation accept: do not create a student venture membership when the invitation role is not `founder` or `student`.

## [0.1.0] - 2026-04-26

### Added

- Public marketing landing at `/welcome` with product narrative and CTAs to sign in or sign up.
- Multi-page workspaces for founders (`/founders`, `/founders/new-request`, `/founders/pipeline`), students (`/students`, `/students/follow-up`), and CFE (`/cfe`, `/cfe/pipeline`, `/cfe/network`, `/cfe/invitations`) with shared in-app sub-navigation.
- Onboarding wizards for founders and students, invitation accept flow, and CFE invitation management.
- Dedicated auth routes: login, signup, forgot/reset password, Google OAuth callback, magic-link verify.
- Notifications page (client-side activity log from SSE in API mode) and settings page (profile, change password, sign-out).
- Backend: email+password and Google OAuth alongside magic links; password reset; session refresh cookies.
- Production infrastructure adapters: Resend (HTTP), S3/R2-compatible presigned uploads, BullMQ publisher, transactional outbox worker, and `createInfraRuntime` factory.
- HTTP hardening: `@fastify/helmet`, `@fastify/rate-limit` (global + auth burst routes, `/healthz` excluded), CORS allow-list via `ALLOWED_ORIGINS`, optional `@sentry/node` on API and worker.

### Changed

- `createApp` is now **async** so rate-limit registration completes before route definitions (required for `@fastify/rate-limit` with Fastify 5).
- API server bootstraps asynchronously with optional Sentry initialisation and environment-driven `httpSecurity` options.
- README and developer docs now use repository-relative links; deployment section references Render blueprint and infra runbook.

### Fixed

- TypeScript boundary casts for BullMQ + `ioredis` duplicate type trees when passing Redis connections into `Queue` / `Worker`.
