import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, BellOff, ClipboardList, Inbox } from 'lucide-react'
import { useAppState } from '../context/AppState'
import { Badge, SectionCard, SectionHeading, StatCard, cn } from '../components/ui'

const STATUS_LABELS = {
  cfe_review: 'CFE review',
  needs_work: 'Needs work',
  awaiting_mentor: 'Awaiting mentor',
  scheduled: 'Scheduled',
  follow_up: 'Follow-up',
  closed: 'Closed',
}

const STATUS_TONES = {
  cfe_review: 'amber',
  needs_work: 'rose',
  awaiting_mentor: 'blue',
  scheduled: 'emerald',
  follow_up: 'slate',
  closed: 'slate',
}

const linkForRole = (role) => {
  if (role === 'cfe' || role === 'admin') {
    return '/cfe/pipeline'
  }
  if (role === 'student') {
    return '/students'
  }
  return '/founders/pipeline'
}

const formatTimestamp = (iso) => {
  if (!iso) return ''
  try {
    const date = new Date(iso)
    return date.toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function NotificationsPage() {
  const {
    notifications,
    unreadNotificationCount,
    requests,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useAppState()

  const requestsById = useMemo(() => {
    const map = new Map()
    requests.forEach((request) => {
      map.set(request.id, request)
    })
    return map
  }, [requests])

  const total = notifications.length
  const lastActivity = notifications[0]?.receivedAt
  const role = currentUser?.role

  const hasNotifications = total > 0

  return (
    <div className="space-y-5 pb-8">
      <SectionCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Notifications</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Everything that moved while you were heads down.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              MentorMe surfaces every request status change so you do not have to refresh the pipeline. Open one to jump straight to it, or mark them all as read once you have caught up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={markAllNotificationsRead}
              disabled={unreadNotificationCount === 0}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                unreadNotificationCount === 0
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <BellOff size={14} aria-hidden="true" />
              Mark all read
            </button>
            <button
              type="button"
              onClick={clearNotifications}
              disabled={!hasNotifications}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                !hasNotifications
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <Inbox size={14} aria-hidden="true" />
              Clear log
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total events"
            value={total}
            detail="Recent request status changes captured in this session."
            accent="cyan"
          />
          <StatCard
            label="Unread"
            value={unreadNotificationCount}
            detail="Notifications you have not opened yet."
            accent={unreadNotificationCount > 0 ? 'amber' : 'emerald'}
          />
          <StatCard
            label="Last activity"
            value={lastActivity ? formatTimestamp(lastActivity) : '—'}
            detail="When the most recent update reached your workspace."
            accent="slate"
          />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading
          eyebrow="Activity feed"
          title={hasNotifications ? `${total} update${total === 1 ? '' : 's'}` : 'Quiet workspace'}
          description={
            hasNotifications
              ? 'Most recent first. Each row links into the relevant pipeline so you can act in one click.'
              : 'New activity will appear here as requests move through review, mentor outreach, scheduling, and follow-up.'
          }
          action={
            <Link
              to={linkForRole(role)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ClipboardList size={14} aria-hidden="true" />
              Open pipeline
            </Link>
          }
        />

        {!hasNotifications ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            <Bell size={20} className="mx-auto text-slate-400" aria-hidden="true" />
            <p className="mt-3 font-medium text-slate-700">No notifications yet</p>
            <p className="mt-1">When a request gets approved, returned, scheduled, or closed, you will see it here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => {
              const request = notification.requestId ? requestsById.get(notification.requestId) : null
              const tone = request ? STATUS_TONES[request.status] || 'slate' : 'slate'
              const statusLabel = request
                ? STATUS_LABELS[request.status] || request.status.replace('_', ' ')
                : 'Updated'

              return (
                <li
                  key={notification.id}
                  data-testid={`notification-${notification.id}`}
                  data-read={notification.read ? 'true' : 'false'}
                  className={cn(
                    'rounded-2xl border p-4 transition',
                    notification.read
                      ? 'border-slate-200 bg-white'
                      : 'border-amber-200 bg-amber-50/60',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {notification.requestId ? (
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            {notification.requestId}
                          </p>
                        ) : null}
                        <Badge tone={tone}>{statusLabel}</Badge>
                        {!notification.read ? <Badge tone="amber">New</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{notification.summary}</p>
                      {request ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {request.ventureName || 'Venture'} • TRL {request.trl} • BRL {request.brl}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatTimestamp(notification.receivedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read ? (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(notification.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                        >
                          Mark read
                        </button>
                      ) : null}
                      <Link
                        to={linkForRole(role)}
                        onClick={() => markNotificationRead(notification.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Open
                        <ArrowRight size={12} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

export default NotificationsPage
