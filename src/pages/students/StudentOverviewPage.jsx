import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const MotionDiv = motion.div
import { ArrowRight, BookOpenText, BrainCircuit, CalendarClock, CheckCircle2, FileText, Link2 } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import NudgeFeed from '../../components/NudgeFeed'
import { Badge, SectionCard, SectionHeading, StatCard } from '../../components/ui'
import { filterFounderRequests, formatDate } from '../founders/founderHelpers'

const PREP_ITEMS = [
  { icon: FileText, title: 'Pre-read pack', text: 'Pitch deck, one-page brief, and any technical note that CFE asked for.' },
  { icon: CalendarClock, title: 'Meeting prep', text: 'Confirm timing, attendees, and the 2-3 questions that matter most.' },
  { icon: CheckCircle2, title: 'Follow-up note', text: 'Write down what changed immediately after the meeting while details are fresh.' },
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
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 pb-10"
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard className="bg-slate-950 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Student Workspace</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Keep student-facing work simple: prepare, show up, and follow through.</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-slate-300">Meeting prep, materials, and follow-up — not the full request flow.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Upcoming"
              value={upcoming.length}
              detail="Sessions that still need prep."
              accent="amber"
            />
            <StatCard
              label="Follow-ups"
              value={followUps.length}
              detail="Need clean documentation."
              accent="emerald"
            />
            <StatCard
              label="Playbook"
              value="TRL / BRL"
              detail="Readiness guide for uploads."
              accent="cyan"
            />
          </div>
        </SectionCard>

        <SectionCard>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Current venture</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{venture.name}</h2>
          <p className="mt-3 text-[15px] leading-7 text-slate-500">{venture.summary}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{venture.stage}</Badge>
            <Badge tone="blue">TRL {venture.trl}</Badge>
            <Badge tone="emerald">BRL {venture.brl}</Badge>
          </div>
          <Link
            to="/playbook"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          >
            <BookOpenText size={16} />
            Open readiness playbook
          </Link>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <SectionHeading
            eyebrow="Prep checklist"
            title="Meeting hygiene in one place"
          />
          <div className="space-y-4">
            {PREP_ITEMS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <item.icon size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Student actions"
            title="What needs attention right now"
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
          description="Paste a full transcript and get founder, student, and CFE action items."
          action={
            <Link
              to="/students/follow-up"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
            >
              <BrainCircuit size={16} aria-hidden="true" />
              Open AI follow-up
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        />
      </SectionCard>
    </MotionDiv>
  )
}

export default StudentOverviewPage
