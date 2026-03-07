import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs) => twMerge(clsx(inputs))

export function SectionCard({ children, className }) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_18px_80px_rgba(15,23,42,0.08)] backdrop-blur',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, detail, accent = 'amber' }) {
  const accents = {
    amber: 'from-amber-200/70 via-orange-200/50 to-transparent',
    cyan: 'from-cyan-200/70 via-sky-200/50 to-transparent',
    emerald: 'from-emerald-200/80 via-green-200/40 to-transparent',
    rose: 'from-rose-200/80 via-pink-200/40 to-transparent',
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/70 bg-slate-950 px-5 py-5 text-white">
      <div className={cn('absolute inset-x-0 top-0 h-20 bg-gradient-to-br blur-2xl', accents[accent])} />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">{label}</p>
        <p className="mt-4 text-4xl font-semibold tracking-tight">{value}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
      </div>
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
