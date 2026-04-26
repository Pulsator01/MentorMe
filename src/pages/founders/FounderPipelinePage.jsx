import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FileUp, Send } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import {
  Badge,
  SectionCard,
  SectionHeading,
  StatCard,
  cn,
} from '../../components/ui'
import FounderSubNav from './FounderSubNav'
import {
  filterFounderRequests,
  formatDate,
  statusLabels,
  statusTone,
  summarizeRequestCounts,
} from './founderHelpers'

const STATUS_FILTERS = [
  { id: 'all', label: 'All requests' },
  { id: 'queued', label: 'In queue', match: ['draft', 'cfe_review', 'awaiting_mentor'] },
  { id: 'scheduled', label: 'Scheduled', match: ['scheduled'] },
  { id: 'needs_work', label: 'Needs work', match: ['needs_work'] },
  { id: 'follow_up', label: 'Follow-up', match: ['follow_up'] },
  { id: 'closed', label: 'Closed', match: ['closed'] },
]

function FounderPipelinePage() {
  const { venture, requests, resubmitRequest, uploadArtifact } = useAppState()
  const [activeFilter, setActiveFilter] = useState('all')
  const [resubmittingId, setResubmittingId] = useState('')
  const [uploadingRequestId, setUploadingRequestId] = useState('')
  const [flashMessage, setFlashMessage] = useState('')

  const founderRequests = useMemo(
    () => filterFounderRequests(requests, venture),
    [requests, venture],
  )

  const counts = useMemo(() => summarizeRequestCounts(founderRequests), [founderRequests])

  const visibleRequests = useMemo(() => {
    if (activeFilter === 'all') {
      return founderRequests
    }
    const filter = STATUS_FILTERS.find((entry) => entry.id === activeFilter)
    if (!filter?.match) {
      return founderRequests
    }
    return founderRequests.filter((request) => filter.match.includes(request.status))
  }, [activeFilter, founderRequests])

  const handleResubmit = async (requestId) => {
    setResubmittingId(requestId)
    try {
      await resubmitRequest(requestId)
      setFlashMessage(`Request ${requestId} re-submitted to CFE review`)
    } finally {
      setResubmittingId('')
    }
  }

  const handleArtifactUpload = async (requestId, event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setUploadingRequestId(requestId)

    try {
      await uploadArtifact(requestId, file)
      setFlashMessage(`${file.name} attached to ${requestId}`)
    } finally {
      setUploadingRequestId('')
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <FounderSubNav />

      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Pipeline</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              See the venture pipeline without the clutter.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Every request stays visible after submission so the founder can tell whether it is waiting, scheduled, or needs revision.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="In queue" value={counts.queued} detail="Draft, review, or mentor routing work that is still open." accent="amber" />
              <StatCard label="Scheduled" value={counts.scheduled} detail="Sessions that already have a meeting slot attached." accent="cyan" />
              <StatCard label="Needs work" value={counts.needsWork} detail="Requests that need a sharper brief before CFE sends them on." accent="rose" />
              <StatCard label="Closed" value={counts.closed} detail="Requests CFE marked complete." accent="emerald" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Need a new request?</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The composer page has the AI brief assistant and mentor matcher in one focused flow.
            </p>
            <Link
              to="/founders/new-request"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Compose a new request
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          eyebrow="Request tracker"
          title={`${visibleRequests.length} ${activeFilter === 'all' ? 'total' : 'matching'} requests`}
          description="Switch the filter to focus on what needs you. Uploads and re-submissions stay scoped to the relevant request."
          action={
            flashMessage ? (
              <div
                data-testid="founder-pipeline-flash"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800"
              >
                {flashMessage}
              </div>
            ) : null
          }
        />

        <div
          role="tablist"
          aria-label="Filter founder requests by status"
          className="mb-5 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2"
        >
          {STATUS_FILTERS.map((filter) => {
            const filterCount =
              filter.id === 'all'
                ? founderRequests.length
                : founderRequests.filter((request) => filter.match.includes(request.status)).length
            const isActive = filter.id === activeFilter
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-white',
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700',
                  )}
                >
                  {filterCount}
                </span>
              </button>
            )
          })}
        </div>

        {visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No requests match this filter yet.
            <Link
              to="/founders/new-request"
              className="ml-2 inline-flex items-center gap-1 font-semibold text-slate-900 underline"
            >
              Compose a new request
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((request) => (
              <article
                key={request.id}
                data-testid={`founder-request-${request.id.toLowerCase()}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-950">{request.ventureName}</h3>
                      <Badge tone={statusTone[request.status] || 'slate'}>
                        {statusLabels[request.status] || request.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{request.challenge}</p>
                  </div>
                  <div className="min-w-[170px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">{request.stage}</p>
                    <p className="mt-1">TRL {request.trl} / BRL {request.brl}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                  <span>Requested {formatDate(request.createdAt, { year: 'numeric' })}</span>
                  <span>{request.artifactList.length} attached items</span>
                  {request.meetingAt ? <span>Meeting {formatDate(request.meetingAt, { year: 'numeric' })}</span> : null}
                </div>
                {request.artifactList.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {request.artifactList.map((artifact) => (
                      <Badge key={`${request.id}-${artifact}`} tone="blue">
                        {artifact}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {request.status !== 'closed' ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Attach another artifact</p>
                        <p className="mt-1 text-sm text-slate-500">
                          This uses the presign and complete API flow for the selected request.
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">
                        <FileUp size={16} />
                        {uploadingRequestId === request.id ? 'Uploading...' : 'Upload file'}
                        <input
                          type="file"
                          className="sr-only"
                          data-testid={`upload-artifact-${request.id.toLowerCase()}`}
                          aria-label={`Upload artifact for ${request.id}`}
                          disabled={uploadingRequestId === request.id}
                          onChange={(event) => void handleArtifactUpload(request.id, event)}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
                {request.status === 'needs_work' ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => handleResubmit(request.id)}
                      disabled={resubmittingId === request.id}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Send size={16} />
                      {resubmittingId === request.id ? 'Re-submitting...' : 'Re-submit to CFE'}
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

export default FounderPipelinePage
