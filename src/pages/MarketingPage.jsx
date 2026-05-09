import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const MotionDiv = motion.div
const MotionH1 = motion.h1
const MotionP = motion.p
import {
  ArrowRight,
  BrainCircuit,
  ClipboardList,
  LayoutDashboard,
  Mail,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge, SectionCard, SectionHeading } from '../components/ui'
import WarpBackground from '../components/WarpBackground'

const pillars = [
  {
    icon: LayoutDashboard,
    title: 'Founders',
    body: 'Compose structured mentor requests with venture context, TRL/BRL, artifacts, and AI-assisted briefs—then track every hand-off in a dedicated pipeline.',
  },
  {
    icon: ClipboardList,
    title: 'CFE & program teams',
    body: 'Review, return, approve, and close requests on a live Kanban. Manage mentor capacity, invitations, and outreach tokens without shadow spreadsheets.',
  },
  {
    icon: Users,
    title: 'Students & mentors',
    body: 'Students get prep checklists and an AI follow-up assistant. Mentors work from secure, time-boxed action links—inspect, respond, schedule, and debrief.',
  },
]

const steps = [
  { n: '01', title: 'Authenticate', copy: 'Email and password, Google OAuth, or magic links with refresh sessions.' },
  { n: '02', title: 'Onboard once', copy: 'Founders and students complete a short wizard; CFE issues invitations for staff roles.' },
  { n: '03', title: 'Run the pipeline', copy: 'Requests move from draft through CFE review, mentor outreach, sessions, and closeout with SSE updates.' },
  { n: '04', title: 'Ship with confidence', copy: 'Production email (Resend), object storage (S3/R2), Redis-backed queues, and hardened HTTP defaults when you deploy.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
}

function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link to="/welcome" className="text-sm font-semibold tracking-tight text-white">
            MentorMe
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/founders"
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
            >
              Get started
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-slate-950 pb-20 pt-28 sm:pb-28 sm:pt-36">
        <WarpBackground speed={0.15} starCount={120} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6">
          <MotionDiv custom={0} variants={fadeUp} initial="hidden" animate="visible">
            <Badge tone="amber">Mentor operations platform</Badge>
          </MotionDiv>
          <MotionH1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-6 max-w-4xl text-5xl font-semibold tracking-tight text-balance text-white sm:text-6xl"
          >
            The operating system for mentor access inside incubators
          </MotionH1>
          <MotionP
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg"
          >
            MentorMe replaces ad hoc inboxes and side-channel DMs with one auditable workflow—from founder ask to
            mentor session to CFE closeout—while keeping each role in a focused, multi-page workspace.
          </MotionP>
          <MotionDiv
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/founders"
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 hover:shadow-amber-400/30"
            >
              Enter the platform
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
            >
              Choose a workspace
            </Link>
          </MotionDiv>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6 sm:py-20">
        <section className="grid gap-5 md:grid-cols-3">
          {pillars.map((pillar, i) => (
            <MotionDiv
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.1, duration: 0.45, ease: 'easeOut' }}
            >
              <SectionCard className="h-full border-slate-200/80">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <pillar.icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">{pillar.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.body}</p>
                  </div>
                </div>
              </SectionCard>
            </MotionDiv>
          ))}
        </section>

        <SectionCard className="border-slate-200/80">
          <SectionHeading
            eyebrow="Product"
            title="Built for real program operations"
            description="Role-based routing, onboarding wizards, invitations, notifications, and account settings—without collapsing everything into a single mega-view."
          />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            <li className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <Users className="mt-0.5 shrink-0 text-indigo-600" size={20} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Role-tailored experience</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Separate journeys for founders, CFEs, mentors, and students with focused dashboards, workflows, and
                  actions at every stage.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <BrainCircuit className="mt-0.5 shrink-0 text-sky-600" size={20} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">AI where it helps</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Request briefs, mentor recommendations, and meeting summaries with a runtime-selectable OpenAI or
                  heuristic provider.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <Mail className="mt-0.5 shrink-0 text-amber-600" size={20} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Real outbound infra</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Resend for email, S3-compatible storage for artifacts, and Redis + BullMQ for transactional outbox
                  processing when you wire env vars.
                </p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <Sparkles className="mt-0.5 shrink-0 text-rose-600" size={20} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Live updates</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Server-sent events push request changes to the UI, with a client-side notification log and polling
                  fallback where needed.
                </p>
              </div>
            </li>
          </ul>
        </SectionCard>

        <section>
          <SectionHeading
            eyebrow="Flow"
            title="From intake to closeout in four beats"
            description="Every cohort is different, but the lifecycle stays the same—so your team can scale playbooks instead of reinventing them each batch."
          />
          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{step.n}</span>
                <div>
                  <p className="font-semibold text-slate-950">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <SectionCard className="border-slate-900 bg-slate-950 text-white">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Ready</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Bring your next cohort onto MentorMe</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/founders"
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                Enter the platform
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Choose a workspace
              </Link>
            </div>
          </div>
        </SectionCard>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <p>MentorMe — structured mentor access for accelerators, entrepreneurship cells, and innovation offices.</p>
      </footer>
    </div>
  )
}

export default MarketingPage
