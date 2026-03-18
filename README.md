# Plaksha Counsel | Mentor Platform

**"The Innovation Blueprint"** — A next-generation mentorship matching platform designed for Plaksha's incubation ecosystem.

## 🚀 Overview

Plaksha Counsel serves as the digital "Control Tower" for the mentorship program, connecting student startups with industry experts. The platform facilitates:
- **Smart Matching**: AI-driven mentor recommendations based on startup stage and needs.
- **Progress Tracking**: Visualizing TRL (Technology Readiness Level) and BRL (Business Readiness Level).
- **Pipeline Management**: An admin Kanban board to oversee the entire mentorship lifecycle.

## ✨ Key Features

### 🎓 Student Experience
- **Focus Dashboard**: A clean, 2-column layout emphasizing the "Action Plan" (Nudge Feed) and keeping context (Vitals, Mentors) in a dedicated sidebar.
- **Readiness Gauges**: Custom SVG visualizations for TRL/BRL progress.
- **Mentor Match**: A split-screen interface with "Holographic" AI cards to find the perfect mentor.
- **Meeting Log**: Structured post-meeting analysis with dynamic "Next Steps" checklists.

### 💼 Mentor Experience
- **Low-Friction Dashboard**: A minimalist view for busy professionals.
- **Request Stack**: Quick "Accept/Pass" workflow for incoming student requests.
- **Profile Snapshot**: At-a-glance view of the student's progress and history.

### 🛠 CFE Admin Experience
- **Control Tower**: A Kanban board managing the flow from "Incoming" to "Scheduled".
- **Portfolio Management**: Tools to manage mentor capacity and utilization.
- **Definition Master**: A reference guide for Global Standards (NASA vs EU TRL definitions).

## 🛠️ Technology Stack

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (using CSS variables for theme customization)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [React Router DOM](https://reactrouter.com/)

## 🏁 Getting Started

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

## 🎨 Design System

The application uses a custom theme defined in `src/index.css`:
- **Primary Color**: `Plaksha Blue` (#002147)
- **Accent Color**: `Signal Orange` (#FF4500)
- **Typography**: `Inter` (Sans) for UI, `JetBrains Mono` for data and labels.

---

*Built for Plaksha University.*
