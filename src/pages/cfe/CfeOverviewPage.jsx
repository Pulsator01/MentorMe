import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, ClipboardList, Mail, ShieldCheck, Users } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import { Badge, SectionCard, SectionHeading, StatCard } from '../../components/ui'
import CfeSubNav from './CfeSubNav'

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
    description: 'Bring founders, students, mentors, and CFE admins into the workspace cleanly.',
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
    <div className="space-y-5 pb-8">
      <CfeSubNav />

      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">CFE team workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Triage mentor access without turning the workflow into a mess.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              The overview keeps the queue numbers honest. Use the pipeline page to act, the mentor network page to manage capacity, and the invitations page to bring people in.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Live pipeline"
                value={stats.live}
                detail="Requests still moving through review, revision, routing, or scheduling."
                accent="amber"
              />
              <StatCard
                label="Review queue"
                value={stats.reviewQueue}
                detail="Submissions waiting for a CFE go or no-go decision."
                accent="rose"
              />
              <StatCard
                label="Needs work"
                value={stats.needsWork}
                detail="Requests that were returned for better context or better material."
                accent="rose"
              />
              <StatCard
                label="Scheduled"
                value={stats.scheduled}
                detail="Approved sessions that already have a slot or meeting link."
                accent="cyan"
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <ShieldCheck size={18} className="text-slate-500" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">Keep the guardrails simple</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                No direct founder-to-mentor access. CFE approves the handoff after checking stage, artifacts, and patience fit.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Users size={18} className="text-slate-500" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{mentorCapacity} monthly mentor slots</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Total active bandwidth across the network. Open Mentor Network to pause visibility or lower monthly capacity.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Activity size={18} className="text-slate-500" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">TRL 3 is the serious mentoring threshold</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Lower-readiness ventures can still ask for help, but CFE should be selective about spending mentor time too early.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Quick actions"
            title="Move work without scrolling the whole page"
            description="Each CFE responsibility lives behind one click so the workspace stays focused."
          />
          <div className="space-y-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                    <action.icon size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{action.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{action.description}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 self-center text-sm font-semibold text-slate-700">
                  {action.cta}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Recent activity"
            title="Requests waiting on a CFE decision"
            description="A short list so the team can decide where to start. The full board lives on the pipeline page."
            action={
              <Link
                to="/cfe/pipeline"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Open pipeline
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            }
          />
          {recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              No active CFE work right now. Approved requests show up on the pipeline as they come in.
            </div>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((request) => (
                <li
                  key={request.id}
                  data-testid={`cfe-recent-${request.id.toLowerCase()}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{request.id}</p>
                        <Badge tone={STATUS_TONES[request.status] || 'slate'}>
                          {STATUS_LABELS[request.status] || request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-slate-950">{request.ventureName}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{request.challenge}</p>
                    </div>
                    <Badge tone={request.trl >= 3 ? 'emerald' : 'rose'}>TRL {request.trl}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

export default CfeOverviewPage
