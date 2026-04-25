import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '../components/ui'

function StepIndicator({ steps, currentStep }) {
  return (
    <ol className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em]">
      {steps.map((step, index) => {
        const isCurrent = index === currentStep
        const isComplete = index < currentStep

        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border text-[12px] transition',
                isComplete
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : isCurrent
                    ? 'border-slate-950 bg-slate-950 text-white'
                    : 'border-slate-300 bg-white text-slate-500',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isComplete ? <CheckCircle2 size={14} aria-hidden="true" /> : index + 1}
            </span>
            <span className={cn('hidden md:inline', isCurrent ? 'text-slate-950' : 'text-slate-500')}>
              {step}
            </span>
            {index < steps.length - 1 ? (
              <span className="hidden h-px w-8 bg-slate-200 md:inline-block" aria-hidden="true" />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function OnboardingLayout({
  eyebrow = 'Onboarding',
  title,
  description,
  steps,
  currentStep = 0,
  children,
  footer,
  rightSlot,
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10 md:px-10">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-700 transition hover:text-slate-950"
          >
            MentorMe
          </Link>
          {steps && steps.length > 0 ? (
            <StepIndicator steps={steps} currentStep={currentStep} />
          ) : null}
        </header>

        <main className="mt-12 flex flex-1 flex-col">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
            ) : null}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <section className="space-y-6">{children}</section>
            {rightSlot ? (
              <aside className="rounded-3xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                {rightSlot}
              </aside>
            ) : null}
          </div>

          {footer ? (
            <footer className="mt-auto pt-12 text-xs text-slate-500">{footer}</footer>
          ) : null}
        </main>
      </div>
    </div>
  )
}

export default OnboardingLayout
