import { useState } from 'react'
import { ArrowRight, BookOpenCheck, Layers3, ShieldAlert } from 'lucide-react'
import { brlFramework, trlDefinitions } from '../data/platformData'
import { Badge, SectionCard, SectionHeading } from '../components/ui'

function TRLDefinitions() {
  const [tab, setTab] = useState('trl')
  const items = tab === 'trl' ? trlDefinitions : brlFramework

  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard className="bg-slate-950 text-white">
          <Badge tone="amber">Readiness Playbook</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Use TRL and BRL as routing signals, not decorative numbers.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Your notes point to a real product need: stage and readiness determine whether a student should reach a mentor now, later, or after more evidence.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <BookOpenCheck size={18} className="text-amber-300" />
              <h2 className="mt-4 text-lg font-semibold">TRL 3 is the inflection point</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Below that, founders likely need lighter guidance and sharper evidence before serious mentor bandwidth is justified.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <Layers3 size={18} className="text-amber-300" />
              <h2 className="mt-4 text-lg font-semibold">BRL prevents GTM theatre</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">A strong prototype with weak business readiness still needs the right kind of mentor, not just the flashiest one.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <ShieldAlert size={18} className="text-amber-300" />
              <h2 className="mt-4 text-lg font-semibold">CFE remains the gatekeeper</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Use readiness scores to justify approvals, say no with evidence, and keep mentor access equitable.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="How to apply it"
            title="A simple operational rubric for the platform"
            description="These are the rules the interface should make obvious for founders, mentors, and CFE operators."
          />
          <div className="space-y-4">
            {[
              'Idea / TRL 1-2: encourage lighter review, problem framing, and document uploads before consuming scarce mentor time.',
              'TRL 3-5: this is the serious mentoring zone; attach a spec, memo, or deck and route through CFE approval.',
              'TRL 6+ with BRL lagging: prioritize GTM, pilot design, policy access, and fundraising narrative over pure technical review.',
              'After every scheduled meeting: log feedback, next steps, and whether a second mentor is warranted.',
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <ArrowRight size={16} className="mt-1 shrink-0 text-slate-500" />
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          eyebrow="Definitions"
          title={tab === 'trl' ? 'Technology readiness ladder' : 'Business readiness ladder'}
          description="Switch between TRL and BRL to see the language that should appear in the product."
          action={
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setTab('trl')}
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${tab === 'trl' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
              >
                TRL
              </button>
              <button
                type="button"
                onClick={() => setTab('brl')}
                className={`rounded-2xl px-4 py-2 text-sm font-medium ${tab === 'brl' ? 'bg-slate-950 text-white' : 'text-slate-600'}`}
              >
                BRL
              </button>
            </div>
          }
        />
        <div className="grid gap-4">
          {items.map((item) => (
            <div key={`${tab}-${item.level}`} className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-lg font-semibold text-white">
                  {item.level}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    {tab.toUpperCase()} {item.level} · {item.label}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export default TRLDefinitions
