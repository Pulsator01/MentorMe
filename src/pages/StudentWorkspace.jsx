import { useState } from 'react'
import { BookOpenText, BrainCircuit, CalendarClock, CheckCircle2, FileText, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppState } from '../context/AppState'
import NudgeFeed from '../components/NudgeFeed'
import { Badge, SectionCard, SectionHeading, StatCard } from '../components/ui'

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

function StudentWorkspace() {
  const { venture, requests, generateAiMeetingSummary } = useAppState()
  const [meetingNotes, setMeetingNotes] = useState(
    'Mentor said the founder should narrow the wedge, define the traction metrics that matter, and share a tighter pre-read before another intro. Student should update the notes and CFE should decide whether another mentor is needed.',
  )
  const [aiSummary, setAiSummary] = useState(null)
  const [aiError, setAiError] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const founderRequests = requests.filter(
    (request) => request.ventureName === venture.name && request.founderName === venture.founder,
  )
  const upcoming = founderRequests.filter((request) => request.status === 'scheduled')
  const followUps = founderRequests.filter((request) => request.status === 'follow_up')
  const actions = founderRequests
    .filter((request) => ['scheduled', 'needs_work', 'follow_up'].includes(request.status))
    .map((request) => {
      if (request.status === 'scheduled') {
        return {
          id: request.id,
          title: `Prepare for ${request.ventureName}`,
          time: formatDate(request.meetingAt),
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
    })

  const handleGenerateMeetingSummary = async () => {
    setIsGeneratingSummary(true)
    setAiError('')

    try {
      const scheduledRequest = founderRequests.find((request) => request.status === 'scheduled') || founderRequests[0]
      const result = await generateAiMeetingSummary({
        ventureName: venture.name,
        mentorName: scheduledRequest?.mentorName || 'Assigned mentor',
        requestChallenge: scheduledRequest?.challenge,
        desiredOutcome: scheduledRequest?.desiredOutcome,
        meetingNotes,
      })
      setAiSummary(result.summary)
    } catch (error) {
      setAiError(error.message || 'The AI meeting-summary assistant is unavailable right now.')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard>
          <SectionHeading
            eyebrow="Student Workspace"
            title="Keep student-facing work simple: prepare, show up, and follow through."
            description="This workspace is for students supporting the startup journey. It focuses on readiness, meeting prep, materials, and follow-up instead of the full founder request flow."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Upcoming" value={upcoming.length} detail="Scheduled sessions that still need prep or attendance confirmation." accent="amber" />
            <StatCard label="Follow-ups" value={followUps.length} detail="Meetings that already happened and need clean documentation." accent="emerald" />
            <StatCard label="Playbook" value="TRL / BRL" detail="Use the readiness guide before uploading materials or asking for another mentor." accent="cyan" />
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
            {[
              { icon: FileText, title: 'Pre-read pack', text: 'Pitch deck, one-page brief, and any technical note that CFE asked for.' },
              { icon: CalendarClock, title: 'Meeting prep', text: 'Confirm timing, attendees, and the 2-3 questions that matter most.' },
              { icon: CheckCircle2, title: 'Follow-up note', text: 'Write down what changed immediately after the meeting while details are still fresh.' },
              { icon: Link2, title: 'Useful links', text: 'Keep the meeting link, shared docs, and playbook references together.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <item.icon size={16} className="text-slate-500" />
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
          <NudgeFeed items={actions.length > 0 ? actions : [{ id: 'clear', title: 'Nothing urgent right now', time: 'Clear', description: 'Your venture does not have any immediate student-side prep tasks.', status: 'calm' }]} />
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="AI follow-through"
          title="Turn raw meeting notes into clean next steps"
          description="This is the student-side AI endpoint in action. Paste rough notes or transcript snippets and turn them into founder, student, and CFE follow-through."
          action={
            <button
              type="button"
              onClick={() => void handleGenerateMeetingSummary()}
              disabled={isGeneratingSummary}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <BrainCircuit size={16} />
              {isGeneratingSummary ? 'Summarizing...' : 'Summarize with AI'}
            </button>
          }
        />
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
          value={meetingNotes}
          onChange={(event) => setMeetingNotes(event.target.value)}
        />
        {aiError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {aiError}
          </div>
        ) : null}
        {aiSummary ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Executive summary</p>
                <Badge tone={aiSummary.provider === 'openai' ? 'emerald' : 'amber'}>{aiSummary.provider}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{aiSummary.executiveSummary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {aiSummary.keyTakeaways.map((item) => (
                  <Badge key={item} tone="blue">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Founder actions</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {aiSummary.founderActionItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Student actions</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {aiSummary.studentActionItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">CFE actions</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {aiSummary.cfeActionItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Second session</p>
              <p className="mt-2 text-sm text-slate-700">{aiSummary.secondSessionRecommended ? 'Recommended' : 'Not recommended yet'}</p>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

export default StudentWorkspace
