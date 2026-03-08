import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs) => twMerge(clsx(inputs))

export function SectionCard({ children, className }) {
  return (
    <section
      className={cn(
        'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, detail, accent = 'amber' }) {
  const accents = {
    amber: 'bg-amber-500',
    cyan: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', accents[accent])} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  )
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-100 text-amber-900',
    blue: 'bg-blue-100 text-blue-900',
    emerald: 'bg-emerald-100 text-emerald-900',
    rose: 'bg-rose-100 text-rose-900',
    slate: 'bg-slate-100 text-slate-700',
  }

  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function ProgressBar({ value, max = 100, tone = 'amber' }) {
  const tones = {
    amber: 'bg-gradient-to-r from-amber-400 to-orange-500',
    blue: 'bg-gradient-to-r from-sky-400 to-blue-500',
    emerald: 'bg-gradient-to-r from-emerald-400 to-green-500',
    rose: 'bg-gradient-to-r from-rose-400 to-pink-500',
  }
  const width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
      <div className={cn('h-full rounded-full', tones[tone])} style={{ width }} />
    </div>
  )
}
