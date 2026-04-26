import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, Send } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import NudgeFeed from '../../components/NudgeFeed'
import ReadinessGauge from '../../components/ReadinessGauge'
import { Badge, SectionCard, SectionHeading, StatCard } from '../../components/ui'
import FounderSubNav from './FounderSubNav'
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
    <div className="space-y-5 pb-8">
      <FounderSubNav />

      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Founder workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Build the right mentor ask before CFE routes it.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Founders should only do three things here: describe the venture clearly, attach enough context, and track what CFE does next.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="In queue" value={counts.queued} detail="Draft, review, or mentor routing work that is still open." accent="amber" />
              <StatCard label="Scheduled" value={counts.scheduled} detail="Sessions that already have a meeting slot attached." accent="cyan" />
              <StatCard label="Needs work" value={counts.needsWork} detail="Requests that need a sharper brief before CFE sends them on." accent="rose" />
              <StatCard label="Follow-up" value={counts.followUp} detail="Sessions that already happened and need a clean recap." accent="emerald" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current venture</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{venture.name}</h2>
              </div>
              <ReadinessGauge trl={venture.trl} brl={venture.brl} size="sm" />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{venture.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{venture.stage}</Badge>
              <Badge tone="blue">{venture.domain}</Badge>
              <Badge tone="emerald">{venture.location}</Badge>
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Next milestone</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{venture.nextMilestone}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="What needs you"
            title="Only show follow-through that matters"
            description="This is the founder-side timeline: review, prep, and revision requests from CFE."
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
                      description: 'When CFE returns a request, schedules a session, or asks for new context, it will show up here.',
                      status: 'calm',
                    },
                  ]
            }
          />
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Quick actions"
            title="Move work forward without scrolling"
            description="Each role-specific page lives behind one click so the workspace stays focused."
          />
          <div className="space-y-3">
            {PRIMARY_ACTIONS.map((action) => (
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
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Recent requests"
          title="A quick read on the live pipeline"
          description="Three most recent requests for this venture. Open the pipeline page for the full list."
          action={
            <Link
              to="/founders/pipeline"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              View full pipeline
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        {recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
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
          <div className="space-y-3">
            {recentRequests.map((request) => (
              <article
                key={request.id}
                data-testid={`overview-request-${request.id.toLowerCase()}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{request.ventureName}</h3>
                      <Badge tone={statusTone[request.status] || 'slate'}>
                        {statusLabels[request.status] || request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{request.challenge}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">Requested {formatDate(request.createdAt, { year: 'numeric' })}</p>
                    {request.meetingAt ? <p className="mt-1">Meeting {formatDate(request.meetingAt, { year: 'numeric' })}</p> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export default FounderOverviewPage
