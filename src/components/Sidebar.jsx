import { useState, useEffect, useCallback } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Bell,
  Settings,
  Sparkles,
  Send,
  GitPullRequestArrow,
  GraduationCap,
  BrainCircuit,
  BarChart3,
  Kanban,
  Users,
  Mail,
  Briefcase,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  X,
} from 'lucide-react'
import { useAppState } from '../context/AppState'
import { cn } from './ui'

const STORAGE_KEY = 'mentorme-sidebar-collapsed'

const ROLE_SECTIONS = {
  founder: {
    label: 'Workspace',
    multiLabel: 'Founders',
    to: '/founders',
    items: [
      { path: '/founders', icon: Sparkles, label: 'Overview', end: true },
      { path: '/founders/new-request', icon: Send, label: 'New Request' },
      { path: '/founders/pipeline', icon: GitPullRequestArrow, label: 'Pipeline' },
    ],
  },
  student: {
    label: 'Workspace',
    multiLabel: 'Students',
    to: '/students',
    items: [
      { path: '/students', icon: GraduationCap, label: 'Overview', end: true },
      { path: '/students/follow-up', icon: BrainCircuit, label: 'AI Follow-up' },
    ],
  },
  cfe: {
    label: 'CFE Team',
    multiLabel: 'CFE Team',
    to: '/cfe',
    items: [
      { path: '/cfe', icon: BarChart3, label: 'Overview', end: true },
      { path: '/cfe/pipeline', icon: Kanban, label: 'Pipeline' },
      { path: '/cfe/network', icon: Users, label: 'Mentor Network' },
      { path: '/cfe/invitations', icon: Mail, label: 'Invitations' },
    ],
  },
  mentor: {
    label: 'Mentor',
    multiLabel: 'Mentor',
    to: '/mentors/desk',
    items: [
      { path: '/mentors/desk', icon: Briefcase, label: 'Mentor Desk' },
    ],
  },
}

const GLOBAL_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Home', end: true },
]

const UTILITY_ITEMS = [
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getRoleSections(role, mode) {
  if (role === 'admin' || mode === 'local') {
    return Object.values(ROLE_SECTIONS)
  }
  const section = ROLE_SECTIONS[role]
  return section ? [section] : []
}

function getRoleLabel(role) {
  const labels = {
    founder: 'Founder Workspace',
    student: 'Student Workspace',
    cfe: 'CFE Command',
    mentor: 'Mentor Portal',
    admin: 'Admin Console',
  }
  return labels[role] || 'Workspace'
}

function SidebarNavItem({ item, collapsed, unreadCount }) {
  const isNotification = item.path === '/notifications'

  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
          collapsed ? 'justify-center' : '',
          isActive
            ? 'bg-white/[0.08] text-white'
            : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-amber-400"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative flex-shrink-0">
            <item.icon size={18} strokeWidth={isActive ? 2 : 1.75} />
            {isNotification && unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
                className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-slate-950"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="truncate"
            >
              {item.label}
            </motion.span>
          )}
        </>
      )}
    </NavLink>
  )
}

function SidebarContent({ collapsed, onToggle, onMobileClose }) {
  const { currentUser, unreadNotificationCount, logout, mode } = useAppState()
  const location = useLocation()
  const role = currentUser?.role || 'founder'
  const sections = getRoleSections(role, mode)
  const showMultiLabels = role === 'admin' || mode === 'local'

  useEffect(() => {
    if (onMobileClose) onMobileClose()
  }, [location.pathname])

  const handleLogout = useCallback(async () => {
    await logout()
  }, [logout])

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn('flex items-center border-b border-white/[0.06] px-4', collapsed ? 'h-16 justify-center' : 'h-16 gap-3')}>
        <Link to="/" className="flex items-center gap-2.5 outline-none" onClick={onMobileClose}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-slate-950">
            M
          </span>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[15px] font-semibold tracking-tight text-white"
            >
              MentorMe
            </motion.span>
          )}
        </Link>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="ml-auto rounded-md p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Workspace Indicator */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 pb-1 pt-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {getRoleLabel(role)}
          </p>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto px-3 scrollbar-thin', collapsed ? 'pt-4' : 'pt-2')}>
        <div className="space-y-1">
          {GLOBAL_ITEMS.map((item) => (
            <SidebarNavItem key={item.path} item={item} collapsed={collapsed} />
          ))}
        </div>

        {sections.map((section) => {
          const sectionLabel = showMultiLabels ? section.multiLabel : section.label
          return (
            <div key={sectionLabel} className="mt-5">
              {!collapsed && (
                showMultiLabels && section.to ? (
                  <Link to={section.to} className="mb-2 block px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition-colors hover:text-slate-400">
                    {sectionLabel}
                  </Link>
                ) : (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                    {sectionLabel}
                  </p>
                )
              )}
              {collapsed && <div className="mx-auto mb-2 h-px w-5 bg-white/[0.08]" />}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarNavItem key={item.path} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          )
        })}

        <div className="mt-5">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              General
            </p>
          )}
          {collapsed && <div className="mx-auto mb-2 h-px w-5 bg-white/[0.08]" />}
          <div className="space-y-0.5">
            {UTILITY_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                unreadCount={unreadNotificationCount}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-white/[0.06] p-3">
        {currentUser && (
          <div className={cn('mb-2 flex items-center rounded-lg p-2 transition-colors hover:bg-white/[0.04]', collapsed ? 'justify-center' : 'gap-3')}>
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
              {getInitials(currentUser.name)}
            </span>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-200">{currentUser.name || currentUser.email}</p>
                <p className="text-[11px] capitalize text-slate-500">{currentUser.role}</p>
              </motion.div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="flex-shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        )}
        {collapsed && currentUser && (
          <button
            onClick={handleLogout}
            className="mb-2 flex w-full items-center justify-center rounded-md p-2 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'hidden w-full items-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300 lg:flex',
            collapsed ? 'justify-center' : 'gap-2',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && (
            <span className="text-[12px] font-medium">Collapse</span>
          )}
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="fixed inset-y-0 left-0 z-40 hidden flex-shrink-0 border-r border-white/[0.06] bg-slate-950 lg:block"
        style={{ background: 'linear-gradient(195deg, #0f172a 0%, #0c1220 50%, #0a0f1a 100%)' }}
      >
        <SidebarContent collapsed={collapsed} onToggle={handleToggle} />
      </motion.aside>

      {/* Desktop spacer */}
      <motion.div
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        className="hidden flex-shrink-0 lg:block"
        aria-hidden="true"
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-white/[0.06] bg-slate-950 lg:hidden"
              style={{ background: 'linear-gradient(195deg, #0f172a 0%, #0c1220 50%, #0a0f1a 100%)' }}
            >
              <SidebarContent collapsed={false} onToggle={handleToggle} onMobileClose={onMobileClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
