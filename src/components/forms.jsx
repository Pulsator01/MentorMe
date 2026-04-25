import { forwardRef } from 'react'
import { cn } from './ui'

export const Field = forwardRef(function Field(
  { id, label, hint, error, className, type = 'text', autoComplete, required, ...rest },
  ref,
) {
  const describedBy = hint || error ? `${id}-help` : undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      <input
        id={id}
        ref={ref}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-900',
          error ? 'border-rose-400' : 'border-slate-200 hover:border-slate-300',
        )}
        {...rest}
      />
      {hint || error ? (
        <p
          id={describedBy}
          className={cn('text-xs leading-5', error ? 'text-rose-600' : 'text-slate-500')}
        >
          {error || hint}
        </p>
      ) : null}
    </div>
  )
})

export function FieldGroup({ children, className }) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

export const Select = forwardRef(function Select(
  { id, label, hint, error, className, options, required, ...rest },
  ref,
) {
  const describedBy = hint || error ? `${id}-help` : undefined

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>
      <select
        id={id}
        ref={ref}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-950 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-900',
          error ? 'border-rose-400' : 'border-slate-200 hover:border-slate-300',
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint || error ? (
        <p
          id={describedBy}
          className={cn('text-xs leading-5', error ? 'text-rose-600' : 'text-slate-500')}
        >
          {error || hint}
        </p>
      ) : null}
    </div>
  )
})

export function PrimaryButton({ children, className, disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-800',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className, disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50 hover:border-slate-300',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function FormError({ children }) {
  if (!children) {
    return null
  }

  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
    >
      {children}
    </div>
  )
}

export function FormNotice({ children, tone = 'info' }) {
  if (!children) {
    return null
  }
  const tones = {
    info: 'border-slate-200 bg-slate-50 text-slate-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }

  return (
    <div role="status" className={cn('rounded-2xl border px-4 py-3 text-sm', tones[tone])}>
      {children}
    </div>
  )
}

export function GoogleIcon({ className }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={cn('h-4 w-4', className)}
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.7 5.5 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.7 5.5 29.1 4 24 4 16.3 4 9.6 8.5 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5 0 9.5-1.9 12.9-5l-6-4.9C28.9 35.5 26.5 36 24 36c-5.3 0-9.7-3.4-11.3-8L6 32.7C9.3 39.5 16.1 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6 4.9C40.9 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
