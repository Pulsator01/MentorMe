# MentorMe

**"The operating system for mentor access inside incubators."**

## Overview

MentorMe is a mentorship operations platform for incubators, accelerator programs, entrepreneurship cells, and innovation offices. It turns mentor access into one controlled workflow:

- founders submit structured requests with venture context and artifacts
- CFE reviews, returns, approves, and closes requests
- students prepare materials and track follow-through
- mentors receive secure, curated action links instead of ad hoc outreach

The current build already includes a routed React product, a Fastify backend with Swagger/OpenAPI, a Prisma schema with PostgreSQL runtime support, and automated verification across unit, integration, browser, and live Prisma smoke tests.

## Key Features

### Founder workflow

- structured mentor-request composer
- returned-request resubmission
- artifact upload and request tracking
- mentor shortlist and venture context in one workspace

### CFE operations workflow

- live pipeline board for return, approve, outreach, and close actions
- mentor network management for visibility and capacity
- secure mentor-link generation
- visibility into the full request lifecycle

### Mentor and student workflow

- secure mentor desk for inspect, respond, schedule, and feedback
- student workspace for preparation and follow-through
- SSE-backed live request updates with polling fallback

## Technology Stack

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (using CSS variables for theme customization)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [React Router DOM](https://reactrouter.com/)

## Getting Started

1.  **Clone the repository** (if applicable) or navigate to the project directory.

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the application**:
    Navigate to `http://localhost:5173` in your browser.

## Backend Runtime

The repo now includes a Fastify backend, Prisma schema, and worker scaffold under `backend/`.

### Local full-stack demo

1. Copy `.env.example` to `.env` and update values if needed.
2. Start the full local stack:
   ```bash
   npm run dev:full
   ```
3. The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:3001`.
4. Swagger UI is available at `http://localhost:3001/docs/` and the OpenAPI JSON is available at `http://localhost:3001/docs/json`.

### Database and Prisma

The backend uses Prisma automatically whenever `DATABASE_URL` is present. Set `PERSISTENCE_BACKEND=memory` if you want to force the seeded in-memory repository for demos or tests.

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run e2e:prisma
```

The default local `.env` expects PostgreSQL on `localhost:5432`. For local demo auth, the API expects `EXPOSE_DEBUG_TOKENS=true`, which is already set by `npm run dev:full`.

## Review Docs

For the code review package, use:
- [docs/code-review-readiness.md](/Users/owlxshri/Desktop/MentorMe/docs/code-review-readiness.md)
- [docs/frontend-system.md](/Users/owlxshri/Desktop/MentorMe/docs/frontend-system.md)
- [docs/persistence-architecture.md](/Users/owlxshri/Desktop/MentorMe/docs/persistence-architecture.md)
- [docs/system-architecture.md](/Users/owlxshri/Desktop/MentorMe/docs/system-architecture.md)
- [docs/system-architecture.html](/Users/owlxshri/Desktop/MentorMe/docs/system-architecture.html)

## Design System

The application uses a custom theme defined in `src/index.css`:
- **Primary Color**: `Plaksha Blue` (#002147)
- **Accent Color**: `Signal Orange` (#FF4500)
- **Typography**: `Inter` (Sans) for UI, `JetBrains Mono` for data and labels.

## Mid-Sem Pack

For the current mid-sem presentation materials, use:

- [docs/midsem-audit-2026-03-20.md](/Users/owlxshri/Desktop/MentorMe/docs/midsem-audit-2026-03-20.md)
- [docs/midsem-video-scripts-and-slides.md](/Users/owlxshri/Desktop/MentorMe/docs/midsem-video-scripts-and-slides.md)
- [docs/midsem-readiness.md](/Users/owlxshri/Desktop/MentorMe/docs/midsem-readiness.md)
