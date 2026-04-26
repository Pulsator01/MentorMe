import { useMemo, useState } from 'react'
import { useAppState } from '../../context/AppState'
import KanbanBoard from '../../components/KanbanBoard'
import { SectionCard, SectionHeading } from '../../components/ui'
import CfeSubNav from './CfeSubNav'

function CfePipelinePage() {
  const { requests, mentors, approveRequest, rejectRequest, createMentorOutreach, closeRequest } = useAppState()
  const [mentorLinkPreview, setMentorLinkPreview] = useState(null)
  const [actionMessage, setActionMessage] = useState('')

  const followUpsCount = useMemo(
    () => requests.filter((request) => request.status === 'follow_up').length,
    [requests],
  )

  const handleCreateMentorOutreach = async (requestId) => {
    try {
      const body = await createMentorOutreach(requestId)
      const request = requests.find((item) => item.id === requestId)
      const url = `/mentors/desk?token=${body.mentorActionToken}`

      setMentorLinkPreview({
        requestId,
        url,
        ventureName: request?.ventureName || 'Selected request',
      })
      setActionMessage(`Secure mentor link created for ${request?.ventureName || requestId}`)
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : `Unable to create a mentor link for ${requestId}`)
    }
  }

  const handleCloseRequest = async (requestId) => {
    await closeRequest(requestId)
    setActionMessage(`${requestId} closed and removed from the live pipeline`)
  }

  return (
    <div className="space-y-5 pb-8">
      <CfeSubNav />

      {mentorLinkPreview ? (
        <SectionCard>
          <SectionHeading
            eyebrow="Mentor outreach"
            title="Secure mentor link is ready"
            description="This is the token-backed link you can open in a separate tab to simulate the mentor email journey."
          />
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-950">{mentorLinkPreview.ventureName}</p>
            <p className="mt-2 break-all text-sm text-amber-900">{mentorLinkPreview.url}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={mentorLinkPreview.url}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open secure mentor desk
              </a>
              <button
                type="button"
                onClick={() => setMentorLinkPreview(null)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Clear preview
              </button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {actionMessage ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {actionMessage}
        </div>
      ) : null}

      <SectionCard>
        <SectionHeading
          eyebrow="Pipeline board"
          title="Review the pipeline in one place"
          description="The board is still the operational core, but the page around it is now quieter so the queue is easier to scan."
          action={
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{followUpsCount}</span> follow-ups already logged
            </div>
          }
        />
        <KanbanBoard
          requests={requests}
          mentors={mentors}
          onApprove={(requestId) => approveRequest(requestId, 'CFE Ops')}
          onReject={(requestId) => rejectRequest(requestId, 'Please add sharper context or better supporting material before re-routing.')}
          onCreateOutreach={handleCreateMentorOutreach}
          onClose={handleCloseRequest}
        />
      </SectionCard>
    </div>
  )
}

export default CfePipelinePage
