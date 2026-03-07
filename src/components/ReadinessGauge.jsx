import { motion } from 'framer-motion'

const MotionCircle = motion.circle

const sizes = {
  sm: { width: 118, stroke: 7, inner: 31, outer: 45, text: 'text-sm' },
  md: { width: 162, stroke: 9, inner: 43, outer: 62, text: 'text-lg' },
  lg: { width: 220, stroke: 11, inner: 60, outer: 84, text: 'text-2xl' },
}

const getTone = (value) => {
  if (value <= 3) {
    return '#f97316'
  }

  if (value <= 6) {
    return '#0ea5e9'
  }

  return '#10b981'
}

function Ring({ radius, stroke, progress, color, delay, circumference, center }) {
  return (
    <>
      <circle cx={center} cy={center} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="transparent" />
      <MotionCircle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="transparent"
        strokeDasharray={circumference}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress * circumference }}
        transition={{ duration: 0.9, ease: 'easeOut', delay }}
      />
    </>
  )
}

function ReadinessGauge({ trl = 1, brl = 1, size = 'md' }) {
  const { width, stroke, inner, outer, text } = sizes[size]
  const center = width / 2
  const innerCircumference = 2 * Math.PI * inner
  const outerCircumference = 2 * Math.PI * outer

  return (
    <div className="relative flex items-center justify-center" style={{ width, height: width }}>
      <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_50%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(241,245,249,0.95))]" />
      <svg width={width} height={width} className="-rotate-90">
        <Ring
          radius={outer}
          stroke={stroke}
          progress={brl / 9}
          color={getTone(brl)}
          delay={0}
          circumference={outerCircumference}
          center={center}
        />
        <Ring
          radius={inner}
          stroke={stroke}
          progress={trl / 9}
          color={getTone(trl)}
          delay={0.18}
          circumference={innerCircumference}
          center={center}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Readiness</p>
        <p className={`mt-2 font-semibold tracking-tight text-slate-950 ${text}`}>TRL {trl}</p>
        <p className={`font-semibold tracking-tight text-slate-600 ${text}`}>BRL {brl}</p>
      </div>
    </div>
  )
}

export default ReadinessGauge
