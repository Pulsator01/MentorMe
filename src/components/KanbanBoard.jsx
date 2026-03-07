import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react'
import { Badge } from './ui'

const columns = [
  { key: 'cfe_review', title: 'CFE review', tone: 'amber' },
  { key: 'needs_work', title: 'Needs work', tone: 'rose' },
  { key: 'awaiting_mentor', title: 'Awaiting mentor', tone: 'blue' },
  { key: 'scheduled', title: 'Scheduled', tone: 'emerald' },
  { key: 'follow_up', title: 'Follow-up', tone: 'slate' },
]

function KanbanBoard({ requests, mentors, onApprove, onReject }) {
  return (
    <div className="grid gap-4 2xl:grid-cols-5">
      {columns.map((column) => {
        const items = requests.filter((request) => request.status === column.key)

        return (
          <div key={column.key} className="min-h-[440px] rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">{column.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{items.length} requests</p>
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
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{request.id}</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">{request.ventureName}</h3>
                      </div>
                      <Badge tone={request.trl >= 3 ? 'emerald' : 'rose'}>TRL {request.trl}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{request.challenge}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge tone="blue">{mentor?.name || 'Unassigned mentor'}</Badge>
                      <Badge>{request.stage}</Badge>
                    </div>

                    {column.key === 'cfe_review' ? (
                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onApprove(request.id)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(request.id)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
                        >
                          <RotateCcw size={16} />
                          Return
                        </button>
                      </div>
                    ) : null}

                    {column.key !== 'cfe_review' ? (
                      <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        {column.key === 'needs_work'
                          ? 'CFE requested a sharper brief or better artifacts before this can be routed again.'
                          : column.key === 'awaiting_mentor'
                          ? 'Waiting for the mentor to accept and share a slot.'
                          : column.key === 'scheduled'
                            ? 'Meeting is scheduled. CFE should nudge attendance and confirm the pre-read.'
                            : 'Feedback has been logged. Decide whether the founder needs another mentor or a second session.'}
                      </div>
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
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                  No requests in this column right now.
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
