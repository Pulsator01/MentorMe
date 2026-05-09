import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const MotionDiv = motion.div
import { ArrowRight, ClipboardList, Send } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import NudgeFeed from '../../components/NudgeFeed'
import ReadinessGauge from '../../components/ReadinessGauge'
import { Badge, SectionCard, SectionHeading, StatCard } from '../../components/ui'
import { normalizeLifecycleStage } from '../../data/stageOptions'
import {
  buildFounderRequestNudge,
  filterFounderRequests,
  formatDate,
  statusLabels,
  statusTone,
  summarizeRequestCounts,
} from './founderHelpers'

const PRIMARY_ACTIONS = [
  {
    title: 'Compose a new mentor request',
    description: 'Describe the venture, attach proof, and let CFE review the brief before mentor exposure.',
    to: '/founders/new-request',
    cta: 'Open request composer',
    icon: Send,
  },
  {
    title: 'Review the venture pipeline',
    description: 'See every request you have submitted, the current status, and what CFE is waiting on.',
    to: '/founders/pipeline',
    cta: 'Open pipeline',
    icon: ClipboardList,
  },
]

function FounderOverviewPage() {
  const { venture, requests } = useAppState()
  const ventureStage = normalizeLifecycleStage(venture.stage)

  const founderRequests = useMemo(
    () => filterFounderRequests(requests, venture),
    [requests, venture],
  )

  const counts = useMemo(() => summarizeRequestCounts(founderRequests), [founderRequests])

  const nudges = useMemo(
    () => founderRequests.slice(0, 4).map((request) => buildFounderRequestNudge(request, request.mentorName)),
    [founderRequests],
  )

  const recentRequests = useMemo(
    () =>
      [...founderRequests]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3),
    [founderRequests],
  )

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 pb-10"
    >
      <SectionCard className="bg-slate-950 text-white sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Founder workspace</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.5rem]">
              Build the right mentor ask before CFE routes it.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-300">
              Describe the venture clearly, attach enough context, and track what CFE does next.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="In queue" value={counts.queued} detail="Open requests in review or routing." accent="amber" />
              <StatCard label="Scheduled" value={counts.scheduled} detail="Sessions with a meeting slot." accent="cyan" />
              <StatCard label="Needs work" value={counts.needsWork} detail="Returned for sharper context." accent="rose" />
              <StatCard label="Follow-up" value={counts.followUp} detail="Completed, need a recap." accent="emerald" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current venture</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{venture.name}</h2>
              </div>
              <ReadinessGauge trl={venture.trl} brl={venture.brl} size="sm" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{venture.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone="amber">{ventureStage}</Badge>
              <Badge tone="blue">{venture.domain}</Badge>
              <Badge tone="emerald">{venture.location}</Badge>
            </div>
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Next milestone</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{venture.nextMilestone}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <SectionHeading
            eyebrow="Activity"
            title="What needs your attention"
            description="Review, prep, and revision requests from CFE."
          />
          <NudgeFeed
            items={
              nudges.length
                ? nudges
                : [
                    {
                      id: 'no-nudges',
                      title: 'Nothing waiting on you right now',
                      time: 'All clear',
                      description: 'When CFE returns a request or schedules a session, it will show up here.',
                      status: 'calm',
                    },
                  ]
            }
          />
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Quick actions"
            title="Move work forward"
          />
          <div className="space-y-4">
            {PRIMARY_ACTIONS.map((action) => (
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
                    <p className="font-semibold text-slate-950">{action.cta}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{action.description}</p>
                  </div>
                </div>
                <ArrowRight size={18} className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Recent requests"
          title="Latest pipeline activity"
          description="Three most recent requests for this venture."
          action={
            <Link
              to="/founders/pipeline"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              View full pipeline
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        {recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            No requests yet. Compose your first mentor ask to start the pipeline.
            <Link
              to="/founders/new-request"
              className="ml-2 inline-flex items-center gap-1 font-semibold text-slate-900 underline"
            >
              Open request composer
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRequests.map((request) => (
              <article
                key={request.id}
                data-testid={`overview-request-${request.id.toLowerCase()}`}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-semibold text-slate-950">{request.ventureName}</h3>
                      <Badge tone={statusTone[request.status] || 'slate'}>
                        {statusLabels[request.status] || request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-2.5 max-w-3xl text-sm leading-6 text-slate-500">{request.challenge}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    <p className="font-medium text-slate-900">Requested {formatDate(request.createdAt, { year: 'numeric' })}</p>
                    {request.meetingAt ? <p className="mt-1">Meeting {formatDate(request.meetingAt, { year: 'numeric' })}</p> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </MotionDiv>
  )
}

export default FounderOverviewPage
