import { Activity, CheckCircle2, ShieldCheck, Users } from 'lucide-react'
import KanbanBoard from '../components/KanbanBoard'
import { useAppState } from '../context/AppState'
import { SectionCard, SectionHeading, StatCard } from '../components/ui'

function AdminDashboard() {
  const { requests, mentors, approveRequest, rejectRequest } = useAppState()
  const active = requests.filter((request) => ['cfe_review', 'awaiting_mentor', 'scheduled', 'needs_work'].includes(request.status))
  const scheduled = requests.filter((request) => request.status === 'scheduled').length
  const followUps = requests.filter((request) => request.status === 'follow_up').length
  const reviewQueue = requests.filter((request) => request.status === 'cfe_review').length
  const needsWork = requests.filter((request) => request.status === 'needs_work').length
  const mentorCapacity = mentors.reduce((sum, mentor) => sum + mentor.monthlyLimit, 0)

  return (
    <div className="space-y-5 pb-8">
      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">CFE team workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Triage mentor access without turning the workflow into a mess.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              CFE is the conduit. This page should help the team decide what gets routed, what gets returned, and where mentor capacity is getting tight.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <StatCard label="Live pipeline" value={active.length} detail="Requests still moving through review, revision, routing, or scheduling." accent="amber" />
              <StatCard label="Review queue" value={reviewQueue} detail="Submissions waiting for a CFE go or no-go decision." accent="rose" />
              <StatCard label="Needs work" value={needsWork} detail="Requests that were returned for better context or better material." accent="rose" />
              <StatCard label="Scheduled" value={scheduled} detail="Approved sessions that already have a slot or meeting link." accent="cyan" />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <ShieldCheck size={18} className="text-slate-500" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">Keep the guardrails simple</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                No direct founder-to-mentor access. CFE approves the handoff after checking stage, artifacts, and patience fit.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Users size={18} className="text-slate-500" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{mentorCapacity} monthly mentor slots</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Total active bandwidth across the network. Use Mentor Network to pause visibility or lower monthly capacity when mentors get overloaded.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <Activity size={18} className="text-slate-500" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">TRL 3 is the serious mentoring threshold</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Lower-readiness ventures can still ask for help, but CFE should be selective about spending mentor time too early.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          eyebrow="Pipeline board"
          title="Review the pipeline in one place"
          description="The board is still the operational core, but the page around it is now quieter so the queue is easier to scan."
          action={
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{followUps}</span> follow-ups already logged
            </div>
          }
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
