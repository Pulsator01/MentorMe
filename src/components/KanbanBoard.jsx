import { AlertTriangle, CheckCircle2, Link2, RotateCcw, ShieldCheck } from 'lucide-react'
import { Badge } from './ui'

const columns = [
  { key: 'cfe_review', title: 'CFE review', tone: 'amber' },
  { key: 'needs_work', title: 'Needs work', tone: 'rose' },
  { key: 'awaiting_mentor', title: 'Awaiting mentor', tone: 'blue' },
  { key: 'scheduled', title: 'Scheduled', tone: 'emerald' },
  { key: 'follow_up', title: 'Follow-up', tone: 'slate' },
]

function KanbanBoard({ requests, mentors, onApprove, onReject, onCreateOutreach, onClose }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3 xl:grid-cols-5">
      {columns.map((column) => {
        const items = requests.filter((request) => request.status === column.key)

        return (
          <div
            key={column.key}
            data-testid={`kanban-column-${column.key}`}
            className="min-h-[360px] rounded-2xl border border-slate-200 bg-slate-50/80 p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-950">{column.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{items.length} requests</p>
              </div>
              <Badge tone={column.tone}>{items.length}</Badge>
            </div>

            <div className="space-y-4">
              {items.map((request) => {
                const mentor = mentors.find((item) => item.id === request.mentorId)

                return (
                  <div
                    key={request.id}
                    data-testid={`request-card-${request.id.toLowerCase()}`}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{request.id}</p>
                        <h3 className="mt-1.5 font-semibold text-slate-950">{request.ventureName}</h3>
                      </div>
                      <Badge tone={request.trl >= 3 ? 'emerald' : 'rose'}>TRL {request.trl}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{request.challenge}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="blue">{mentor?.name || 'Unassigned mentor'}</Badge>
                      <Badge>{request.stage}</Badge>
                    </div>

                    {column.key === 'cfe_review' ? (
                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onApprove(request.id)}
                          data-testid={`approve-request-${request.id.toLowerCase()}`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(request.id)}
                          data-testid={`return-request-${request.id.toLowerCase()}`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                        >
                          <RotateCcw size={16} />
                          Return
                        </button>
                      </div>
                    ) : null}

                    {column.key !== 'cfe_review' ? (
                      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        {column.key === 'needs_work'
                          ? 'Returned for sharper brief or better artifacts.'
                          : column.key === 'awaiting_mentor'
                          ? 'Waiting for the mentor to accept and share a slot.'
                          : column.key === 'scheduled'
                            ? 'Meeting scheduled. Confirm the pre-read.'
                          : 'Feedback logged. Decide on follow-up or close.'}
                      </div>
                    ) : null}

                    {column.key === 'awaiting_mentor' && onCreateOutreach ? (
                      <button
                        type="button"
                        onClick={() => onCreateOutreach(request.id)}
                        data-testid={`create-outreach-${request.id.toLowerCase()}`}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      >
                        <Link2 size={16} />
                        Create mentor link
                      </button>
                    ) : null}

                    {column.key === 'follow_up' && onClose ? (
                      <button
                        type="button"
                        onClick={() => onClose(request.id)}
                        data-testid={`close-request-${request.id.toLowerCase()}`}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      >
                        <ShieldCheck size={16} />
                        Close request
                      </button>
                    ) : null}

                    {request.trl < 3 ? (
                      <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-rose-700">
                        <AlertTriangle size={14} />
                        Below TRL 3. Consider lighter support first.
                      </div>
                    ) : null}
                  </div>
                )
              })}

              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-10 text-center text-sm text-slate-400">
                  No requests in this column.
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default KanbanBoard
