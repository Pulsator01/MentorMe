import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Clock3, FileUp } from 'lucide-react'

const MotionDiv = motion.div

const statusStyles = {
  urgent: {
    line: 'bg-rose-400',
    card: 'border-rose-200 bg-rose-50/70',
    icon: AlertCircle,
    iconClass: 'text-rose-600',
  },
  warning: {
    line: 'bg-amber-400',
    card: 'border-amber-200 bg-amber-50/70',
    icon: Clock3,
    iconClass: 'text-amber-700',
  },
  calm: {
    line: 'bg-slate-300',
    card: 'border-slate-200 bg-white',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
}

function NudgeItem({ item, last }) {
  const style = statusStyles[item.status] || statusStyles.calm
  const Icon = style.icon

  return (
    <div className="relative pl-8">
      {!last ? <div className={`absolute left-[9px] top-7 bottom-[-18px] w-px ${style.line}`} /> : null}
      <MotionDiv
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.35 }}
        className={`rounded-[24px] border p-4 ${style.card}`}
      >
        <div className="absolute left-0 top-5 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-white bg-slate-950 text-white">
          <Icon size={12} className={style.iconClass} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.time}</p>
          {item.action ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
            >
              <FileUp size={12} />
              {item.action}
            </button>
          ) : null}
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-950">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
      </MotionDiv>
    </div>
  )
}

function NudgeFeed({ items }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <NudgeItem key={item.id} item={item} last={index === items.length - 1} />
      ))}
    </div>
  )
}

export default NudgeFeed
