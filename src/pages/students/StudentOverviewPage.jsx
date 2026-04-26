import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenText, BrainCircuit, CalendarClock, CheckCircle2, FileText, Link2 } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import NudgeFeed from '../../components/NudgeFeed'
import { Badge, SectionCard, SectionHeading, StatCard } from '../../components/ui'
import StudentSubNav from './StudentSubNav'
import { filterFounderRequests, formatDate } from '../founders/founderHelpers'

const PREP_ITEMS = [
  { icon: FileText, title: 'Pre-read pack', text: 'Pitch deck, one-page brief, and any technical note that CFE asked for.' },
  { icon: CalendarClock, title: 'Meeting prep', text: 'Confirm timing, attendees, and the 2-3 questions that matter most.' },
  { icon: CheckCircle2, title: 'Follow-up note', text: 'Write down what changed immediately after the meeting while details are still fresh.' },
  { icon: Link2, title: 'Useful links', text: 'Keep the meeting link, shared docs, and playbook references together.' },
]

const buildStudentAction = (request) => {
  if (request.status === 'scheduled') {
    return {
      id: request.id,
      title: `Prepare for ${request.ventureName}`,
      time: formatDate(request.meetingAt, { year: 'numeric' }),
      description: 'Review the brief, confirm attendance, and upload any missing pre-read before the session.',
      status: 'urgent',
      action: 'Prep meeting',
    }
  }

  if (request.status === 'needs_work') {
    return {
      id: request.id,
      title: 'Tighten the request before it goes back to CFE',
      time: 'Needs revision',
      description: request.mentorNotes || 'CFE needs sharper context before routing this request again.',
      status: 'warning',
      action: 'Revise brief',
    }
  }

  return {
    id: request.id,
    title: 'Close the loop after the meeting',
    time: 'Within 24h',
    description: 'Capture what changed, what the mentor suggested, and what should happen next.',
    status: 'calm',
    action: 'Write follow-up',
  }
}

function StudentOverviewPage() {
  const { venture, requests } = useAppState()

  const founderRequests = useMemo(
    () => filterFounderRequests(requests, venture),
    [requests, venture],
  )

  const upcoming = useMemo(
    () => founderRequests.filter((request) => request.status === 'scheduled'),
    [founderRequests],
  )

  const followUps = useMemo(
    () => founderRequests.filter((request) => request.status === 'follow_up'),
    [founderRequests],
  )

  const actions = useMemo(
    () =>
      founderRequests
        .filter((request) => ['scheduled', 'needs_work', 'follow_up'].includes(request.status))
        .map(buildStudentAction),
    [founderRequests],
  )

  return (
    <div className="space-y-6 pb-8">
      <StudentSubNav />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Student Workspace"
            title="Keep student-facing work simple: prepare, show up, and follow through."
            description="This workspace is for students supporting the startup journey. It focuses on readiness, meeting prep, materials, and follow-up instead of the full founder request flow."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Upcoming"
              value={upcoming.length}
              detail="Scheduled sessions that still need prep or attendance confirmation."
              accent="amber"
            />
            <StatCard
              label="Follow-ups"
              value={followUps.length}
              detail="Meetings that already happened and need clean documentation."
              accent="emerald"
            />
            <StatCard
              label="Playbook"
              value="TRL / BRL"
              detail="Use the readiness guide before uploading materials or asking for another mentor."
              accent="cyan"
            />
          </div>
        </SectionCard>

        <SectionCard>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Current venture</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{venture.name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{venture.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{venture.stage}</Badge>
            <Badge tone="blue">TRL {venture.trl}</Badge>
            <Badge tone="emerald">BRL {venture.brl}</Badge>
          </div>
          <Link
            to="/playbook"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            <BookOpenText size={16} />
            Open readiness playbook
          </Link>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Prep checklist"
            title="Keep materials and meeting hygiene in one place"
            description="Students should always know what to upload, what to read, and what to capture after the call."
          />
          <div className="space-y-3">
            {PREP_ITEMS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <item.icon size={16} className="text-slate-500" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Student actions"
            title="What needs attention right now"
            description="Only surface action-worthy work here so the page stays useful."
          />
          <NudgeFeed
            items={
              actions.length > 0
                ? actions
                : [
                    {
                      id: 'clear',
                      title: 'Nothing urgent right now',
                      time: 'Clear',
                      description: 'Your venture does not have any immediate student-side prep tasks.',
                      status: 'calm',
                    },
                  ]
            }
          />
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="AI follow-through"
          title="Turn raw meeting notes into clean next steps"
          description="The AI follow-up assistant takes rough meeting notes and produces founder, student, and CFE action items. It lives on its own page so students can paste a full transcript without losing the prep checklist."
          action={
            <Link
              to="/students/follow-up"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
            >
              <BrainCircuit size={16} aria-hidden="true" />
              Open AI follow-up
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
        <p className="text-sm leading-6 text-slate-600">
          Use it after every mentor session: paste the rough notes, generate the summary, and copy the action items into the founder, student, and CFE channels.
        </p>
      </SectionCard>
    </div>
  )
}

export default StudentOverviewPage
