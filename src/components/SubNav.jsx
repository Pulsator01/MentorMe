import { NavLink } from 'react-router-dom'
import { cn } from './ui'

function SubNav({ items, ariaLabel }) {
  if (!items?.length) {
    return null
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm"
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end ?? true}
          className={({ isActive }) =>
            cn(
              'inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
              isActive
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50',
            )
          }
        >
          {item.icon ? <item.icon size={16} aria-hidden="true" /> : null}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default SubNav
