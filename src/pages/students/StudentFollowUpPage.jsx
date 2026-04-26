import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BrainCircuit } from 'lucide-react'
import { useAppState } from '../../context/AppState'
import { Badge, SectionCard, SectionHeading } from '../../components/ui'
import StudentSubNav from './StudentSubNav'
import { filterFounderRequests } from '../founders/founderHelpers'

const DEFAULT_NOTES =
  'Mentor said the founder should narrow the wedge, define the traction metrics that matter, and share a tighter pre-read before another intro. Student should update the notes and CFE should decide whether another mentor is needed.'

function StudentFollowUpPage() {
  const { venture, requests, generateAiMeetingSummary } = useAppState()
  const [meetingNotes, setMeetingNotes] = useState(DEFAULT_NOTES)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiError, setAiError] = useState('')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  const founderRequests = useMemo(
    () => filterFounderRequests(requests, venture),
    [requests, venture],
  )

  const targetRequest = useMemo(
    () => founderRequests.find((request) => request.status === 'scheduled') || founderRequests[0] || null,
    [founderRequests],
  )

  const handleGenerateMeetingSummary = async () => {
    setIsGeneratingSummary(true)
    setAiError('')

    try {
      const result = await generateAiMeetingSummary({
        ventureName: venture.name,
        mentorName: targetRequest?.mentorName || 'Assigned mentor',
        requestChallenge: targetRequest?.challenge,
        desiredOutcome: targetRequest?.desiredOutcome,
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
      <StudentSubNav />

      <SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">AI follow-up</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Turn raw meeting notes into clean next steps.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Paste rough notes or transcript snippets, generate the summary, then copy the action items into the founder, student, and CFE channels.
            </p>
            <Link
              to="/students"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 underline-offset-4 hover:underline"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to student workspace
            </Link>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Linked context</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">{venture.name}</h2>
            {targetRequest ? (
              <>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Most recent active request: <span className="font-semibold text-slate-900">{targetRequest.id}</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Mentor: {targetRequest.mentorName || 'Not yet assigned'}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                No active requests linked to this venture yet. The summary will still generate, but linking a request keeps everyone aligned.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          eyebrow="AI follow-through"
          title="Generate clean action items from rough notes"
          description="The student-side AI endpoint produces a summary, key takeaways, and action items split by founder, student, and CFE."
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
        <label htmlFor="student-meeting-notes" className="sr-only">
          Meeting notes
        </label>
        <textarea
          id="student-meeting-notes"
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
              <p className="mt-2 text-sm text-slate-700">
                {aiSummary.secondSessionRecommended ? 'Recommended' : 'Not recommended yet'}
              </p>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

export default StudentFollowUpPage
