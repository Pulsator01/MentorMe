import {
  aiBenchmarkChecklist,
  aiBenchmarkSnapshot,
  dbEntities,
  deploymentChecklist,
  endpointChecklist,
  feedbackLearnings,
  honestNextSteps,
  journeyChecklist,
  productSnapshot,
} from '../data/midsemReadiness'
import { Badge, SectionCard, SectionHeading, StatCard, cn } from '../components/ui'

const statusConfig = {
  done: {
    label: 'Done',
    badge: 'emerald',
    row: 'bg-emerald-50',
  },
  in_progress: {
    label: 'In progress',
    badge: 'amber',
    row: 'bg-amber-50',
  },
  planned: {
    label: 'Planned',
    badge: 'slate',
    row: 'bg-white',
  },
  external: {
    label: 'External setup',
    badge: 'slate',
    row: 'bg-slate-50',
  },
}

function MidsemReadiness() {
  const implementedCount = endpointChecklist.filter((item) => item.status === 'done').length
  const nonAiEndpoints = endpointChecklist.filter((item) => item.category === 'Non-AI')
  const nonAiDone = nonAiEndpoints.filter((item) => item.status === 'done').length
  const plannedCount = endpointChecklist.filter((item) => item.status === 'planned').length
  const aiEndpoints = endpointChecklist.filter((item) => item.category === 'AI')
  const aiDone = aiEndpoints.filter((item) => item.status === 'done').length

  return (
    <div className="space-y-5 pb-8">
      <SectionCard className="bg-slate-950 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Mid-sem readiness</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Product scope, endpoint progress, and honest delivery status in one place.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
          This page is the presentation cheat-sheet for what MentorMe is, what has already been built, how the AI endpoints are benchmarked, and what still comes next after the mid-sem checkpoint.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Implemented endpoints"
            value={implementedCount}
            detail="Routes already working in the backend contract."
            accent="emerald"
          />
          <StatCard
            label="Non-AI completion"
            value={`${Math.round((nonAiDone / nonAiEndpoints.length) * 100)}%`}
            detail="The core non-AI workflow is implemented end to end."
            accent="amber"
          />
          <StatCard
            label="AI endpoints live"
            value={`${aiDone}/${aiEndpoints.length}`}
            detail={`${aiBenchmarkSnapshot.benchmarkCases} benchmark cases with a ${aiBenchmarkSnapshot.passThreshold} pass threshold are already wired in.`}
            accent="cyan"
          />
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Product snapshot"
            title={productSnapshot.name}
            description={productSnapshot.oneLiner}
          />
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Broader market</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{productSnapshot.market}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Business model wedge</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{productSnapshot.businessModel}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Journey coverage"
            title="What the current build already supports"
            description="These are the product journeys you can actually demonstrate right now."
          />
          <div className="space-y-3">
            {journeyChecklist.map((journey) => (
              <div key={journey.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">{journey.name}</h3>
                  <Badge tone={statusConfig[journey.status].badge}>{statusConfig[journey.status].label}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{journey.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Endpoint progress sheet"
          title="Color-coded API implementation status"
          description="Green means done, yellow means in progress, and white means planned. This mirrors the progress sheet your professor asked for."
          action={
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {implementedCount} done • {plannedCount} planned
            </div>
          }
        />
        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-[112px_1.2fr_0.8fr_1fr_120px] gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <span>Method</span>
            <span>Endpoint</span>
            <span>Type</span>
            <span>Frontend / use</span>
            <span>Status</span>
          </div>
          <div>
            {endpointChecklist.map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className={cn(
                  'grid grid-cols-[112px_1.2fr_0.8fr_1fr_120px] gap-3 border-b border-slate-200 px-4 py-4 text-sm last:border-b-0',
                  statusConfig[endpoint.status].row,
                )}
              >
                <span className="font-semibold text-slate-950">{endpoint.method}</span>
                <div>
                  <p className="font-mono text-xs text-slate-900">{endpoint.path}</p>
                  <p className="mt-1 text-xs text-slate-500">{endpoint.purpose}</p>
                </div>
                <span className="text-slate-700">{endpoint.category}</span>
                <span className="text-slate-700">{endpoint.screen}</span>
                <div>
                  <Badge tone={statusConfig[endpoint.status].badge}>{statusConfig[endpoint.status].label}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard>
          <SectionHeading
            eyebrow="AI review"
            title="AI endpoints and benchmark coverage"
            description="These are the three AI routes, the sample-case benchmark behind them, and the judge logic that protects quality when models change."
            action={
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {aiBenchmarkSnapshot.benchmarkCases} eval cases • {aiBenchmarkSnapshot.passThreshold} pass threshold
              </div>
            }
          />
          <div className="space-y-3">
            {aiBenchmarkChecklist.map((item) => (
              <div key={item.endpoint} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{item.name}</h3>
                    <p className="mt-1 font-mono text-xs text-slate-500">{item.endpoint}</p>
                  </div>
                  <Badge tone={statusConfig[item.status].badge}>{statusConfig[item.status].label}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">{item.samples}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.judge}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Generator path</p>
              <p className="mt-2">{aiBenchmarkSnapshot.defaultProvider}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Judge path</p>
              <p className="mt-2">{aiBenchmarkSnapshot.judgeMode}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Deployment readiness"
            title="What is coded versus what still needs credentials"
            description="The app is now shaped for deployment, and these cards show which parts are fully in-repo versus which still depend on platform access."
          />
          <div className="space-y-3">
            {deploymentChecklist.map((item) => (
              <div
                key={item.title}
                className={cn('rounded-3xl border border-slate-200 p-4', statusConfig[item.status].row)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                  <Badge tone={statusConfig[item.status].badge}>{statusConfig[item.status].label}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard>
          <SectionHeading
            eyebrow="DB design"
            title="What the schema already models"
            description="The Prisma schema and runtime now cover the production data model, while a memory fallback still exists for local demo mode."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {dbEntities.map((entity) => (
              <div key={entity.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-950">{entity.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{entity.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Feedback learnings"
            title="What user feedback changed in the product"
            description="These are the product decisions that came out of reading the feedback properly instead of building the first flashy thing."
          />
          <div className="space-y-3">
            {feedbackLearnings.map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Still next"
          title="The honest post-mid-sem list"
          description="These are the remaining engineering items after the current mid-sem submission scope."
        />
        <div className="grid gap-3 md:grid-cols-2">
          {honestNextSteps.map((item) => (
            <div key={item} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export default MidsemReadiness
