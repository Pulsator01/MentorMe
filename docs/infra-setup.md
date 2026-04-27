# Infrastructure setup (Resend, R2/S3, Redis BullMQ)

This doc explains how to wire MentorMe to its three production-grade infra
dependencies: **email** (Resend), **object storage** (S3 or Cloudflare R2),
and **the queue** (Redis + BullMQ). All three are optional — when the relevant
environment variables are missing the backend transparently falls back to the
in-process stubs, so local dev and the test suite never need real cloud
credentials.

```
┌─────────────────┐        ┌──────────────────────────┐        ┌─────────────────┐
│  Fastify API    │──────▶ │  createInfraRuntime()    │ ──────▶│  Resend (HTTP)  │
│  (server.ts)    │        │   email.gateway          │        │                 │
│                 │        │   storage.service        │ ──────▶│  S3 / R2        │
│  Outbox writes  │ ─────▶ │   queue.publisher        │ ──────▶│  Redis (BullMQ) │
└─────────────────┘        └──────────────────────────┘        └────────┬────────┘
                                                                        │
                                                                        ▼
                                                            ┌─────────────────────┐
                                                            │ BullMQ worker       │
                                                            │ (worker.ts)         │
                                                            │ marks OutboxEvent   │
                                                            │ rows as processed   │
                                                            └─────────────────────┘
```

The factory lives in [`backend/src/infra/runtime.ts`](../backend/src/infra/runtime.ts).
It is invoked from both `backend/src/server.ts` (the API process) and
`backend/src/worker.ts` (the background worker), so both processes see the
same set of gateways selected by the same env vars.

---

## Database migrations

Schema changes ship as SQL migrations under `backend/prisma/migrations/`. After
pulling new code, apply them to the target database before starting processes:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

On Render, the tracked [`render.yaml`](../render.yaml) blueprint sets
`preDeployCommand` to that command for both the API and worker services so each
deploy runs migrations against `DATABASE_URL` automatically.

---

## Selecting the runtime mode

| Service | Real gateway is selected when… | Otherwise falls back to |
| --- | --- | --- |
| Email   | `RESEND_API_KEY` **and** `EMAIL_FROM` are set | `StubEmailGateway` (in-memory log) |
| Storage | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` are all set | `StubStorageService` (in-memory log) |
| Queue   | `REDIS_URL` is set | `InlineQueuePublisher` (logs to stdout) |

Boot logs from both processes print the resolved modes (`email=resend`,
`storage=s3`, `queue=bullmq` etc.) so you can confirm at a glance.

---

## 1. Email — Resend

We use Resend's HTTP API directly via `fetch`; no SDK is required.

1. Create a Resend account, verify the sending domain you control, and create
   an API key under **API Keys → Create API Key** with `sending_access`.
2. Set the following env vars on the API service **and** the worker (the
   worker emits scheduled / nudge emails too):
   - `RESEND_API_KEY` — `re_...` token from Resend.
   - `EMAIL_FROM` — verified sender, e.g. `MentorMe <noreply@mentorme.app>`.
   - `EMAIL_REPLY_TO` *(optional)* — single Reply-To address.
   - `APP_BASE_URL` — public URL of the frontend (used to render links inside
     emails, e.g. `https://mentorme-web.onrender.com`).
3. Smoke test: trigger a magic-link from `/login`. The Resend dashboard will
   show the message under **Logs**, and the API request log will print
   `email send ok` from `ResendEmailGateway`.

### What gets emailed

- `sendMagicLink` — passwordless login token.
- `sendWelcome` — confirmation after signup.
- `sendPasswordReset` — reset token landing on `/reset-password`.
- `sendMentorOutreach` — mentor approve/decline link with a one-time token.
- `sendInvitation` — CFE invite landing on `/invite/:token`.

All bodies are HTML-escaped before substitution; user-supplied names cannot
inject markup.

---

## 2. Object storage — S3 or Cloudflare R2

Implemented in [`backend/src/infra/s3StorageService.ts`](../backend/src/infra/s3StorageService.ts)
on top of `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. The service
exposes two methods:

- `createPresignedUpload({ key, contentType })` → returns a `PUT` URL the
  browser uploads to directly.
- `resolvePublicUrl(key)` → returns a public URL when `S3_PUBLIC_BASE_URL`
  is configured (otherwise `undefined`, and the frontend keeps the storage key).

### AWS S3

```
S3_BUCKET=mentorme-uploads
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://mentorme-uploads.s3.amazonaws.com   # optional
S3_PRESIGN_TTL_SECONDS=900                                     # optional, default 900
```

Make sure the IAM user has `s3:PutObject` and (if you serve files publicly)
`s3:GetObject` on `arn:aws:s3:::mentorme-uploads/*`.

### Cloudflare R2

R2 is S3-compatible if you point the SDK at the R2 endpoint and force
path-style addressing.

```
S3_BUCKET=mentorme-uploads
S3_REGION=auto
S3_ACCESS_KEY_ID=<r2 access key>
S3_SECRET_ACCESS_KEY=<r2 secret>
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_BASE_URL=https://files.mentorme.app   # your r2.dev or custom domain
```

CORS for the bucket needs to allow `PUT` from the frontend origin:

```jsonc
[
  {
    "AllowedOrigins": ["https://mentorme-web.onrender.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "x-amz-meta-*"],
    "MaxAgeSeconds": 600
  }
]
```

---

## 3. Queue — Redis + BullMQ

`BullMqQueuePublisher` lazily creates one BullMQ `Queue` per topic and shares
a single `ioredis` connection. The connection is created with
`maxRetriesPerRequest: null` and `enableReadyCheck: false` because BullMQ
workers require those flags.

The worker (`backend/src/worker.ts`) calls `startOutboxWorkers`, which spins
up one `Worker` per topic listed in `OUTBOX_TOPICS`. Each job carries the
`outboxId` from the originating `OutboxEvent`; the worker looks the row up
and flips its status to `processed`. Processing is idempotent — replaying an
already-processed event is a no-op.

### Topics

```
auth.magic_link_requested      meeting.scheduled
auth.password_reset_requested  mentor.accepted
auth.user_registered           mentor.declined
invitation.created             mentor.outreach_created
onboarding.completed           request.approved
request.feedback_recorded      request.returned
request.submitted
```

### Configuration

```
REDIS_URL=redis://default:password@host:6379
```

Render's managed Redis service exposes its connection string via
`fromService.property: connectionString`, which is what `render.yaml` uses
for both the API and worker services.

For local dev:

```
docker run -p 6379:6379 redis:7
```

…and the default `REDIS_URL=redis://localhost:6379` in `.env.example` will
just work.

### Job options

`BullMqQueuePublisher` defaults every job to:

```ts
{
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 60 * 60, count: 1000 },
  removeOnFail: { age: 24 * 60 * 60 },
}
```

These can be overridden by passing `defaultJobOptions` to
`createBullMqQueuePublisher` if you need a different retry profile.

---

## 4. Render deploy snippet

`render.yaml` in the repo root provisions everything: PostgreSQL, Redis, the
API web service, the background worker, and the static frontend. After
`render blueprint launch`:

1. Add the secrets that Render will not generate for you — `RESEND_API_KEY`,
   `EMAIL_FROM`, `EMAIL_REPLY_TO`, `OPENAI_API_KEY`, `S3_*`, `GOOGLE_OAUTH_*`
   — under each service's **Environment** tab. The blueprint marks all of
   them with `sync: false` so Render prompts you to fill them in once.
2. Run the Prisma migration on first deploy (`prisma migrate deploy` is part
   of `npm run start:api`'s prelude in this repo; if you change that, run it
   manually from the Render shell).
3. Hit `/healthz` on the API and `https://<frontend>` to verify both are
   green.

---

## 5. Local dev quick reference

```
# Stubs everywhere — no Resend, no S3, no Redis required.
cp .env.example .env
npm install
npm run dev      # frontend on :5173, API on :3001 in stub mode
```

```
# Real Redis only (test the worker end-to-end).
docker run -p 6379:6379 redis:7
REDIS_URL=redis://localhost:6379 npm run start:worker
```

```
# Real Resend (verify a real email goes out).
export RESEND_API_KEY=re_xxx
export EMAIL_FROM='MentorMe Dev <noreply@your-verified-domain>'
export APP_BASE_URL=http://localhost:5173
npm run start:api
```

```
# Real R2 storage from local dev.
export S3_BUCKET=mentorme-uploads-dev
export S3_REGION=auto
export S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
export S3_FORCE_PATH_STYLE=true
export S3_ACCESS_KEY_ID=...
export S3_SECRET_ACCESS_KEY=...
npm run start:api
```

---

## 6. Security headers, CORS, rate limits, and Sentry

The Fastify stack wires **`@fastify/helmet`** (baseline headers + CSP tuned for
Swagger UI), **`@fastify/rate-limit`** (global IP bucket with `/healthz`
excluded, plus a tighter per-route bucket on `POST /auth/*` endpoints), and
**`@fastify/cors`** (reflective origins in dev, strict allow-list in prod).

| Variable | Purpose |
| --- | --- |
| `ALLOWED_ORIGINS` | Comma-separated list of browser origins that may call the API with cookies. Empty = reflect `Origin` (local only). |
| `TRUST_PROXY` | Set `true` (or rely on `RENDER=true`) so `X-Forwarded-For` is honoured for rate limiting. |
| `RATE_LIMIT_GLOBAL_MAX` / `RATE_LIMIT_GLOBAL_WINDOW_MS` | Global request ceiling per IP per window. |
| `RATE_LIMIT_AUTH_MAX` / `RATE_LIMIT_AUTH_WINDOW_MS` | Burst limiter for authentication routes. |
| `SENTRY_DSN` | When set, the API initialises `@sentry/node` with `fastifyIntegration` (HTTP 5xx captured) and the worker reports boot/shutdown failures. |
| `SENTRY_ENVIRONMENT` / `SENTRY_TRACES_SAMPLE_RATE` | Optional Sentry metadata; keep traces at `0` unless you are actively profiling. |

`createApp` is **async** so the rate-limit plugin (which registers an `onRoute`
hook asynchronously) finishes **before** application routes are declared—this
guarantees every route receives the limiter. Callers (`server.ts`, Vitest
harnesses, `prisma-e2e.ts`) must `await createApp(...)`.
