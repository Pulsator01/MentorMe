import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const MotionDiv = motion.div
import { Activity, ArrowRight, ClipboardList, Mail, ShieldCheck, Users } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import { Badge, SectionCard, SectionHeading, StatCard } from '../../components/ui'

const QUICK_ACTIONS = [
  {
    title: 'Open the pipeline board',
    description: 'Approve, return, route, or close requests across every active stage.',
    to: '/cfe/pipeline',
    cta: 'Go to pipeline',
    icon: ClipboardList,
  },
  {
    title: 'Manage the mentor network',
    description: 'Pause visibility, adjust capacity, and add new mentors to the directory.',
    to: '/cfe/network',
    cta: 'Open network',
    icon: Users,
  },
  {
    title: 'Issue or revoke invitations',
    description: 'Bring founders, students, mentors, and CFE admins into the workspace.',
    to: '/cfe/invitations',
    cta: 'Manage invitations',
    icon: Mail,
  },
]

const STATUS_LABELS = {
  cfe_review: 'CFE review',
  needs_work: 'Needs work',
  awaiting_mentor: 'Awaiting mentor',
  scheduled: 'Scheduled',
  follow_up: 'Follow-up',
}

const STATUS_TONES = {
  cfe_review: 'amber',
  needs_work: 'rose',
  awaiting_mentor: 'blue',
  scheduled: 'emerald',
  follow_up: 'slate',
}

function CfeOverviewPage() {
  const { requests, mentors } = useAppState()

  const stats = useMemo(() => {
    const live = requests.filter((request) =>
      ['cfe_review', 'awaiting_mentor', 'scheduled', 'needs_work', 'follow_up'].includes(request.status),
    )
    return {
      live: live.length,
      reviewQueue: requests.filter((request) => request.status === 'cfe_review').length,
      needsWork: requests.filter((request) => request.status === 'needs_work').length,
      scheduled: requests.filter((request) => request.status === 'scheduled').length,
      followUps: requests.filter((request) => request.status === 'follow_up').length,
    }
  }, [requests])

  const mentorCapacity = useMemo(
    () => mentors.reduce((sum, mentor) => sum + mentor.monthlyLimit, 0),
    [mentors],
  )

  const recentActivity = useMemo(
    () =>
      [...requests]
        .filter((request) => ['cfe_review', 'needs_work', 'follow_up'].includes(request.status))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [requests],
  )

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 pb-10"
    >
      <SectionCard className="bg-slate-950 text-white sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">CFE team workspace</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.5rem]">
              Triage mentor access without the admin mess.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-300">
              Use the pipeline to act, the mentor network to manage capacity, and the invitations page to bring people in.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Live pipeline" value={stats.live} detail="Requests moving through the system." accent="amber" />
              <StatCard label="Review queue" value={stats.reviewQueue} detail="Waiting for a CFE go/no-go." accent="rose" />
              <StatCard label="Needs work" value={stats.needsWork} detail="Returned for better context." accent="rose" />
              <StatCard label="Scheduled" value={stats.scheduled} detail="Sessions with a confirmed slot." accent="cyan" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <ShieldCheck size={20} className="text-emerald-400" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold">No direct founder-to-mentor access</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                CFE approves the handoff after checking stage, artifacts, and patience fit.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Users size={20} className="text-sky-400" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold">{mentorCapacity} monthly mentor slots</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Total active bandwidth. Open the network to adjust capacity.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <Activity size={20} className="text-amber-400" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold">TRL 3 mentoring threshold</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Be selective about spending mentor time on lower-readiness ventures.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <SectionHeading
            eyebrow="Quick actions"
            title="Move work forward"
          />
          <div className="space-y-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <action.icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">{action.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{action.description}</p>
                  </div>
                </div>
                <ArrowRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Recent activity"
            title="Requests waiting on a decision"
            action={
              <Link
                to="/cfe/pipeline"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Open pipeline
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            }
          />
          {recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              No active CFE work right now.
            </div>
          ) : (
            <ul className="space-y-4">
              {recentActivity.map((request) => (
                <li
                  key={request.id}
                  data-testid={`cfe-recent-${request.id.toLowerCase()}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{request.id}</p>
                        <Badge tone={STATUS_TONES[request.status] || 'slate'}>
                          {STATUS_LABELS[request.status] || request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <h3 className="mt-2 font-semibold text-slate-950">{request.ventureName}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{request.challenge}</p>
                    </div>
                    <Badge tone={request.trl >= 3 ? 'emerald' : 'rose'}>TRL {request.trl}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </MotionDiv>
  )
}

export default CfeOverviewPage
