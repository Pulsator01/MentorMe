# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
