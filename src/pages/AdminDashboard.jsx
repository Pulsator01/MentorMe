import { Activity, ArrowRightLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import KanbanBoard from '../components/KanbanBoard'
import { useAppState } from '../context/AppState'
import { SectionCard, SectionHeading, StatCard } from '../components/ui'

function AdminDashboard() {
  const { requests, mentors, approveRequest, rejectRequest } = useAppState()
  const active = requests.filter((request) => ['cfe_review', 'awaiting_mentor', 'scheduled'].includes(request.status))
  const scheduled = requests.filter((request) => request.status === 'scheduled').length
  const followUps = requests.filter((request) => request.status === 'follow_up').length
  const reviewQueue = requests.filter((request) => request.status === 'cfe_review').length
  const mentorCapacity = mentors.reduce((sum, mentor) => sum + mentor.monthlyLimit, 0)

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard className="bg-slate-950 text-white">
          <SectionHeading
            eyebrow="CFE Control"
            title="Run the conduit, not just the introduction"
            description="Review student asks, respect mentor tolerance, approve only the strongest matches, and make sure every meeting returns a usable note."
          />
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Live pipeline" value={active.length} detail="Requests still moving through review, routing, or scheduling." accent="amber" />
            <StatCard label="Review queue" value={reviewQueue} detail="Submissions waiting for CFE judgment before mentors see them." accent="rose" />
            <StatCard label="Scheduled" value={scheduled} detail="Sessions already placed on calendars with a shareable link." accent="cyan" />
            <StatCard label="Follow-ups" value={followUps} detail="Meetings that have a note but may still need another action." accent="emerald" />
          </div>
        </SectionCard>

        <SectionCard>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <ShieldCheck size={18} className="text-slate-500" />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Guardrail</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">No direct mentor access</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Every request is filtered by stage, artifacts, and mentor patience threshold before it moves.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <ArrowRightLeft size={18} className="text-slate-500" />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Capacity</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{mentorCapacity} monthly slots</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Total mentor bandwidth across the current network. Adjust this in Mentor Network.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <Activity size={18} className="text-slate-500" />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">TRL threshold</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">TRL 3 triggers serious mentoring</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Early ideas can still ask for help, but CFE should treat deep mentor time as scarce below that level.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <CheckCircle2 size={18} className="text-slate-500" />
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Compliance</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Feedback after every meeting</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">The platform should always capture what changed, not just whether a call happened.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Pipeline board"
          title="Track how many requests are in each stage"
          description="Use the board to spot overload, push back weak asks, and keep the request moving from student brief to mentor feedback."
        />
        <KanbanBoard
          requests={requests}
          mentors={mentors}
          onApprove={(requestId) => approveRequest(requestId, 'CFE Ops')}
          onReject={(requestId) => rejectRequest(requestId, 'Please add sharper context or better supporting material before re-routing.')}
        />
      </SectionCard>
    </div>
  )
}

export default AdminDashboard
