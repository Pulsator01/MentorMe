import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers,
  X,
  Globe,
  Sparkles,
  GraduationCap,
  LayoutDashboard,
  Briefcase,
} from 'lucide-react'
import { cn } from './ui'

const MotionDiv = motion.div

const links = [
  { label: 'Landing', path: '/welcome', icon: Globe },
  { label: 'Founders', path: '/founders', icon: Sparkles },
  { label: 'Students', path: '/students', icon: GraduationCap },
  { label: 'CFE Team', path: '/cfe', icon: LayoutDashboard },
  { label: 'Mentor Desk', path: '/mentors/desk', icon: Briefcase },
]

function DemoToggle() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {open && (
          <MotionDiv
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-3 w-52 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur"
          >
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              Demo navigator
            </p>
            <nav className="space-y-1">
              {links.map((link) => {
                const active = pathname === link.path || (link.path !== '/welcome' && pathname.startsWith(link.path + '/'))
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition',
                      active
                        ? 'bg-amber-400/15 text-amber-300'
                        : 'text-slate-300 hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <link.icon size={15} />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </MotionDiv>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all',
          open
            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            : 'bg-amber-400 text-slate-950 hover:bg-amber-300 hover:shadow-amber-400/30',
        )}
        aria-label={open ? 'Close demo navigator' : 'Open demo navigator'}
      >
        {open ? <X size={18} /> : <Layers size={18} />}
      </button>
    </div>
  )
}

export default DemoToggle
