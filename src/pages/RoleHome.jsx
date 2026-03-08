import { ArrowRight, LayoutDashboard, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionCard } from '../components/ui'

const roles = [
  {
    title: 'Founders',
    path: '/founders',
    icon: Sparkles,
    description: 'Request mentors, attach context, and track venture-level follow-through.',
  },
  {
    title: 'Students',
    path: '/students',
    icon: Users,
    description: 'Prepare meeting notes, upload material, and stay on top of nudges and follow-ups.',
  },
  {
    title: 'CFE Team',
    path: '/cfe',
    icon: LayoutDashboard,
    description: 'Approve requests, manage mentor visibility, and keep the pipeline moving cleanly.',
  },
]

function RoleHome() {
  return (
    <div className="space-y-6 pb-8">
      <SectionCard className="bg-slate-950 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Workspace Home</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Choose the role-specific workspace you actually need.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
          This should not feel like one crowded page pretending to serve everyone. Founders, students, and the CFE team each get their own clearer flow.
        </p>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        {roles.map((role) => (
          <SectionCard key={role.title}>
            <role.icon size={18} className="text-slate-500" />
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{role.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{role.description}</p>
            <Link
              to={role.path}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              Open workspace
              <ArrowRight size={16} />
            </Link>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}

export default RoleHome
