import { useId } from 'react'
import { motion } from 'framer-motion'

const MotionCircle = motion.circle
const MAX_READINESS = 9
const ARC_ANIMATION_DURATION = 0.95

const sizes = {
  sm: { width: 118, stroke: 6, inner: 33, outer: 46, legendLabel: 'text-[10px]', legendValue: 'text-xs' },
  md: { width: 162, stroke: 8, inner: 45, outer: 63, legendLabel: 'text-[11px]', legendValue: 'text-sm' },
  lg: { width: 220, stroke: 10, inner: 62, outer: 86, legendLabel: 'text-xs', legendValue: 'text-base' },
}

const getTone = (value) => {
  if (value <= 3) {
    return {
      start: '#fdba74',
      end: '#fb923c',
      solid: '#fdba74',
    }
  }

  if (value <= 6) {
    return {
      start: '#7dd3fc',
      end: '#38bdf8',
      solid: '#7dd3fc',
    }
  }

  return {
    start: '#6ee7b7',
    end: '#34d399',
    solid: '#6ee7b7',
  }
}

const clampReadiness = (value) => Math.min(MAX_READINESS, Math.max(1, Number(value) || 1))

const toProgress = (value) => clampReadiness(value) / MAX_READINESS

function Ring({ radius, stroke, progress, gradientId, delay, circumference, center }) {
  return (
    <>
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={stroke}
        fill="transparent"
      />
      <MotionCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={`url(#${gradientId})`}
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={circumference}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress * circumference }}
        transition={{ duration: ARC_ANIMATION_DURATION, ease: 'easeOut', delay }}
      />
    </>
  )
}

function LegendPill({ label, value, color, labelClass, valueClass }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-center">
      <span className="mx-auto mb-1 block h-[2px] w-5 rounded-full" style={{ backgroundColor: color }} />
      <p className={`font-medium uppercase tracking-[0.14em] text-slate-400 ${labelClass}`}>{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums text-slate-100 ${valueClass}`}>
        {value}
        <span className="text-slate-500">/{MAX_READINESS}</span>
      </p>
    </div>
  )
}

function ReadinessGauge({ trl = 1, brl = 1, size = 'md' }) {
  const { width, stroke, inner, outer, legendLabel, legendValue } = sizes[size]
  const center = width / 2
  const trlValue = clampReadiness(trl)
  const brlValue = clampReadiness(brl)
  const trlTone = getTone(trlValue)
  const brlTone = getTone(brlValue)
  const idPrefix = useId().replace(/:/g, '')
  const innerCircumference = 2 * Math.PI * inner
  const outerCircumference = 2 * Math.PI * outer

  return (
    <div className="inline-flex flex-col items-center" aria-label={`Readiness: TRL ${trlValue}, BRL ${brlValue}`}>
      <div className="relative flex items-center justify-center rounded-full border border-white/12 bg-white/[0.02]" style={{ width, height: width }}>
        <svg width={width} height={width}>
          <defs>
            <linearGradient id={`${idPrefix}-outer-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={brlTone.start} />
              <stop offset="100%" stopColor={brlTone.end} />
            </linearGradient>
            <linearGradient id={`${idPrefix}-inner-gradient`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={trlTone.start} />
              <stop offset="100%" stopColor={trlTone.end} />
            </linearGradient>
          </defs>
          <Ring
            radius={outer}
            stroke={stroke}
            progress={toProgress(brlValue)}
            delay={0}
            gradientId={`${idPrefix}-outer-gradient`}
            circumference={outerCircumference}
            center={center}
          />
          <Ring
            radius={inner}
            stroke={stroke}
            progress={toProgress(trlValue)}
            delay={0.18}
            gradientId={`${idPrefix}-inner-gradient`}
            circumference={innerCircumference}
            center={center}
          />
        </svg>
        <div className="absolute h-2.5 w-2.5 rounded-full bg-white/70 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]" />
      </div>
      <div className="mt-2 grid w-full grid-cols-2 gap-2">
        <LegendPill
          label="TRL"
          value={trlValue}
          color={trlTone.solid}
          labelClass={legendLabel}
          valueClass={legendValue}
        />
        <LegendPill
          label="BRL"
          value={brlValue}
          color={brlTone.solid}
          labelClass={legendLabel}
          valueClass={legendValue}
        />
      </div>
    </div>
  )
}

export default ReadinessGauge
