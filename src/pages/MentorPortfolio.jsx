import { useMemo, useState } from 'react'
import { Plus, Search, SlidersHorizontal, UserPlus2 } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { Badge, ProgressBar, SectionCard, SectionHeading } from '../components/ui'

const emptyForm = {
  name: '',
  title: '',
  focus: '',
  stages: '',
  domains: '',
  tolerance: 'Medium',
  monthlyLimit: 3,
  location: 'Remote',
  responseWindow: '72h',
  bio: '',
}

function MentorPortfolio() {
  const { mentors, requests, addMentor, updateMentor } = useAppState()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)

  const filteredMentors = useMemo(() => {
    const query = search.toLowerCase().trim()

    if (!query) {
      return mentors
    }

    return mentors.filter((mentor) =>
      `${mentor.name} ${mentor.title} ${mentor.focus.join(' ')} ${mentor.domains.join(' ')}`.toLowerCase().includes(query),
    )
  }, [mentors, search])

  const getMentorLoad = (mentorId) =>
    requests.filter((request) => request.mentorId === mentorId && ['awaiting_mentor', 'scheduled', 'follow_up'].includes(request.status)).length

  const handleAddMentor = (event) => {
    event.preventDefault()

    addMentor({
      ...form,
      focus: form.focus.split(',').map((item) => item.trim()).filter(Boolean),
      stages: form.stages.split(',').map((item) => item.trim()).filter(Boolean),
      domains: form.domains.split(',').map((item) => item.trim()).filter(Boolean),
      monthlyLimit: Number(form.monthlyLimit),
      calendly: '',
    })
    setForm(emptyForm)
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard className="bg-slate-950 text-white">
          <SectionHeading
            eyebrow="Mentor Network"
            title="Create profiles that reflect real mentor boundaries"
            description="CFE owns the mentor directory, the visibility rules, and the capacity model. Students should never be the source of truth here."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Active mentors</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">{mentors.length}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Visible mentors</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {mentors.filter((mentor) => mentor.visibility === 'Active').length}
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">High tolerance</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {mentors.filter((mentor) => mentor.tolerance === 'High').length}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Create mentor profile"
            title="Add a mentor before exposing them to matching"
            description="Capture domain, stages, tolerance, and monthly capacity up front so the system can respect their availability."
          />
          <form className="space-y-4" onSubmit={handleAddMentor}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Title</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Focus areas (comma separated)</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.focus}
                  onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Domains (comma separated)</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.domains}
                  onChange={(event) => setForm((current) => ({ ...current, domains: event.target.value }))}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Stages</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.stages}
                  onChange={(event) => setForm((current) => ({ ...current, stages: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Tolerance</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.tolerance}
                  onChange={(event) => setForm((current) => ({ ...current, tolerance: event.target.value }))}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Monthly capacity</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                  value={form.monthlyLimit}
                  onChange={(event) => setForm((current) => ({ ...current, monthlyLimit: event.target.value }))}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Bio</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <UserPlus2 size={16} />
                Add mentor
              </button>
            </div>
          </form>
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Mentor roster"
          title="Search and tune the active network"
          description="Capacity sliders and visibility toggles let CFE react quickly when a mentor gets overloaded or loses patience for low-context asks."
          action={
            <label className="relative block min-w-[260px]">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mentor, domain, or stage"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 outline-none transition focus:border-amber-300 focus:bg-white"
              />
            </label>
          }
        />

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredMentors.map((mentor) => {
            const load = getMentorLoad(mentor.id)

            return (
              <div key={mentor.id} className="rounded-[26px] border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-950">{mentor.name}</h3>
                      <Badge tone={mentor.visibility === 'Active' ? 'emerald' : 'rose'}>{mentor.visibility}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{mentor.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateMentor(mentor.id, {
                        visibility: mentor.visibility === 'Active' ? 'Paused' : 'Active',
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-white"
                  >
                    <SlidersHorizontal size={16} />
                    {mentor.visibility === 'Active' ? 'Pause visibility' : 'Re-activate'}
                  </button>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{mentor.bio}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mentor.focus.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Monthly capacity</p>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={mentor.monthlyLimit}
                      className="mt-4 w-full accent-amber-500"
                      onChange={(event) => updateMentor(mentor.id, { monthlyLimit: Number(event.target.value) })}
                    />
                    <p className="mt-2 text-sm text-slate-700">{mentor.monthlyLimit} sessions per month</p>
                  </div>
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Utilization</p>
                    <div className="mt-4">
                      <ProgressBar value={load} max={mentor.monthlyLimit} tone={load >= mentor.monthlyLimit ? 'rose' : 'emerald'} />
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      {load} live requests • tolerance {mentor.tolerance.toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filteredMentors.length === 0 ? (
          <div className="mt-4 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
            No mentor matched that search. Try a different keyword or add a new profile.
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

export default MentorPortfolio
