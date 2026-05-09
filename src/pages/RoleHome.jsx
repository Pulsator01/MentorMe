import { ArrowRight, Briefcase, LayoutDashboard, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const MotionDiv = motion.div
import { SectionCard } from '../components/ui'
import WarpBackground from '../components/WarpBackground'

const roles = [
  {
    title: 'Founders',
    path: '/founders',
    icon: Sparkles,
    description: 'Request mentors, attach context, and track venture-level follow-through.',
    accent: 'border-l-amber-400',
  },
  {
    title: 'Mentors',
    path: '/mentors/desk',
    icon: Briefcase,
    description: 'Sign in to review assigned requests, or use a secure CFE link when one is shared.',
    accent: 'border-l-emerald-400',
  },
  {
    title: 'CFE Team',
    path: '/cfe',
    icon: LayoutDashboard,
    description: 'Approve requests, manage mentor visibility, and keep the pipeline moving cleanly.',
    accent: 'border-l-rose-400',
  },
]

function RoleHome() {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-6 pb-10"
    >
      <SectionCard className="relative overflow-hidden bg-slate-950 text-white sm:p-10">
        <WarpBackground speed={0.12} starCount={80} />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Workspace Home</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.5rem]">Choose the role-specific workspace you actually need.</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-300">
            Founders, mentors, and the CFE team each get their own focused flow.
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-3">
        {roles.map((role, i) => (
          <MotionDiv
            key={role.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease: 'easeOut' }}
            whileHover={{ y: -3 }}
          >
            <SectionCard className={`h-full border-l-4 ${role.accent}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <role.icon size={18} />
              </span>
              <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{role.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">{role.description}</p>
              <Link
                to={role.path}
                className="group mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                Open workspace
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </Link>
            </SectionCard>
          </MotionDiv>
        ))}
      </div>
    </MotionDiv>
  )
}

export default RoleHome
