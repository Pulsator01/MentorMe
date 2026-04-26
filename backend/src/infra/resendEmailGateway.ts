import type { EmailGateway } from '../domain/interfaces'
import type { UserRole } from '../domain/types'

export type ResendEmailGatewayOptions = {
  apiKey: string
  appBaseUrl: string
  baseUrl?: string
  from: string
  fetchImpl?: typeof fetch
  replyTo?: string
  timeoutMs?: number
}

type ResendSendBody = {
  from: string
  to: string[]
  subject: string
  text: string
  html: string
  reply_to?: string
}

type ResendErrorPayload = {
  name?: string
  message?: string
  statusCode?: number
}

const DEFAULT_BASE_URL = 'https://api.resend.com'
const DEFAULT_TIMEOUT_MS = 15_000

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderButton = (href: string, label: string): string =>
  `<p style="margin: 24px 0;"><a href="${escapeHtml(href)}" style="background:#0f172a;color:#ffffff;padding:12px 20px;border-radius:9999px;text-decoration:none;font-weight:600;display:inline-block;">${escapeHtml(label)}</a></p>`

const renderShellHtml = (heading: string, body: string): string => `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;border:1px solid #e2e8f0;padding:32px;">
      <p style="margin:0 0 8px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.18em;color:#64748b;">MentorMe</p>
      <h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:#0f172a;">${escapeHtml(heading)}</h1>
      <div style="font-size:14px;line-height:1.6;color:#1f2937;">${body}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0 16px 0;" />
      <p style="margin:0;font-size:12px;color:#64748b;">If you did not expect this email, you can safely ignore it.</p>
    </div>
  </body>
</html>`

const formatRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'cfe':
      return 'CFE'
    case 'admin':
      return 'Administrator'
    case 'student':
      return 'Plaksha student'
    case 'mentor':
      return 'Mentor'
    case 'founder':
    default:
      return 'Founder'
  }
}

const buildLink = (appBaseUrl: string, path: string): string => {
  const base = appBaseUrl.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export class ResendEmailGateway implements EmailGateway {
  private readonly apiKey: string
  private readonly appBaseUrl: string
  private readonly baseUrl: string
  private readonly from: string
  private readonly fetchImpl: typeof fetch
  private readonly replyTo?: string
  private readonly timeoutMs: number

  constructor(options: ResendEmailGatewayOptions) {
    if (!options.apiKey) {
      throw new Error('Resend gateway requires apiKey')
    }
    if (!options.from) {
      throw new Error('Resend gateway requires from address')
    }
    if (!options.appBaseUrl) {
      throw new Error('Resend gateway requires appBaseUrl')
    }

    this.apiKey = options.apiKey
    this.appBaseUrl = options.appBaseUrl
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '')
    this.from = options.from
    this.fetchImpl = options.fetchImpl || globalThis.fetch
    this.replyTo = options.replyTo
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

    if (typeof this.fetchImpl !== 'function') {
      throw new Error('Resend gateway requires a fetch implementation in the runtime')
    }
  }

  async sendMagicLink(input: { email: string; token: string; name: string }): Promise<void> {
    const link = buildLink(this.appBaseUrl, `/auth/verify?token=${encodeURIComponent(input.token)}`)
    const heading = 'Sign in to MentorMe'
    const text = [
      `Hi ${input.name || 'there'},`,
      '',
      'Use the link below to sign in to your MentorMe workspace. The link is valid for one hour.',
      '',
      link,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n')

    const html = renderShellHtml(
      heading,
      `<p>Hi ${escapeHtml(input.name || 'there')},</p>` +
        `<p>Use the button below to sign in to your MentorMe workspace. The link is valid for one hour.</p>` +
        renderButton(link, 'Sign in to MentorMe') +
        `<p style="font-size:12px;color:#64748b;word-break:break-all;">${escapeHtml(link)}</p>`,
    )

    await this.send({ to: input.email, subject: heading, text, html })
  }

  async sendMentorOutreach(input: { email: string; mentorName: string; requestId: string; token: string }): Promise<void> {
    const link = buildLink(this.appBaseUrl, `/mentors/desk?token=${encodeURIComponent(input.token)}`)
    const heading = `New mentor request awaiting your response`
    const text = [
      `Hi ${input.mentorName},`,
      '',
      `The MentorMe CFE team has routed request ${input.requestId} to you. Open the secure mentor portal to review the brief, accept or decline, and pick a meeting time.`,
      '',
      link,
      '',
      'The link is valid for seven days.',
    ].join('\n')

    const html = renderShellHtml(
      heading,
      `<p>Hi ${escapeHtml(input.mentorName)},</p>` +
        `<p>The MentorMe CFE team has routed request <strong>${escapeHtml(input.requestId)}</strong> to you. Open the secure mentor portal to review the brief, accept or decline, and pick a meeting time.</p>` +
        renderButton(link, 'Open mentor portal') +
        `<p style="font-size:12px;color:#64748b;word-break:break-all;">${escapeHtml(link)}</p>` +
        `<p>The link is valid for seven days.</p>`,
    )

    await this.send({ to: input.email, subject: heading, text, html })
  }

  async sendPasswordReset(input: { email: string; name: string; token: string }): Promise<void> {
    const link = buildLink(this.appBaseUrl, `/reset-password?token=${encodeURIComponent(input.token)}`)
    const heading = 'Reset your MentorMe password'
    const text = [
      `Hi ${input.name || 'there'},`,
      '',
      'We received a request to reset the password for your MentorMe account. Use the link below to choose a new password. The link is valid for one hour.',
      '',
      link,
      '',
      'If you did not request a reset, you can safely ignore this email.',
    ].join('\n')

    const html = renderShellHtml(
      heading,
      `<p>Hi ${escapeHtml(input.name || 'there')},</p>` +
        `<p>We received a request to reset the password for your MentorMe account. Use the button below to choose a new password. The link is valid for one hour.</p>` +
        renderButton(link, 'Reset password') +
        `<p style="font-size:12px;color:#64748b;word-break:break-all;">${escapeHtml(link)}</p>`,
    )

    await this.send({ to: input.email, subject: heading, text, html })
  }

  async sendWelcome(input: { email: string; name: string }): Promise<void> {
    const link = buildLink(this.appBaseUrl, '/')
    const heading = 'Welcome to MentorMe'
    const text = [
      `Hi ${input.name || 'there'},`,
      '',
      'Your MentorMe account is ready. Sign in any time to submit mentor requests, track outreach, and capture meeting summaries.',
      '',
      link,
    ].join('\n')

    const html = renderShellHtml(
      heading,
      `<p>Hi ${escapeHtml(input.name || 'there')},</p>` +
        `<p>Your MentorMe account is ready. Sign in any time to submit mentor requests, track outreach, and capture meeting summaries.</p>` +
        renderButton(link, 'Open MentorMe'),
    )

    await this.send({ to: input.email, subject: heading, text, html })
  }

  async sendInvitation(input: {
    email: string
    inviterName: string
    organizationName: string
    role: UserRole
    token: string
    message?: string
  }): Promise<void> {
    const link = buildLink(this.appBaseUrl, `/invite/${encodeURIComponent(input.token)}`)
    const roleLabel = formatRoleLabel(input.role)
    const heading = `${input.inviterName} invited you to join ${input.organizationName} on MentorMe`

    const messageBlockText = input.message ? `\nA note from ${input.inviterName}:\n  ${input.message}\n` : ''
    const text = [
      `Hi,`,
      '',
      `${input.inviterName} invited you to join ${input.organizationName} on MentorMe as a ${roleLabel}. Open the link below to accept the invitation and finish setting up your account.`,
      messageBlockText,
      link,
      '',
      'The invitation link is valid for seven days.',
    ].join('\n')

    const messageBlockHtml = input.message
      ? `<blockquote style="border-left:4px solid #0f172a;margin:16px 0;padding:8px 16px;background:#f1f5f9;color:#0f172a;border-radius:0 8px 8px 0;">${escapeHtml(input.message)}</blockquote>`
      : ''

    const html = renderShellHtml(
      heading,
      `<p>Hi,</p>` +
        `<p><strong>${escapeHtml(input.inviterName)}</strong> invited you to join <strong>${escapeHtml(input.organizationName)}</strong> on MentorMe as a <strong>${escapeHtml(roleLabel)}</strong>. Click the button below to accept the invitation and finish setting up your account.</p>` +
        messageBlockHtml +
        renderButton(link, 'Accept invitation') +
        `<p style="font-size:12px;color:#64748b;word-break:break-all;">${escapeHtml(link)}</p>` +
        `<p>The invitation link is valid for seven days.</p>`,
    )

    await this.send({ to: input.email, subject: heading, text, html })
  }

  private async send(payload: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const body: ResendSendBody = {
      from: this.from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }

    if (this.replyTo) {
      body.reply_to = this.replyTo
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorPayload: ResendErrorPayload | undefined
        try {
          errorPayload = (await response.json()) as ResendErrorPayload
        } catch {
          errorPayload = undefined
        }

        const reason = errorPayload?.message || response.statusText || `HTTP ${response.status}`
        throw new Error(`Resend send failed: ${reason}`)
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Resend send timed out after ${this.timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const createResendEmailGateway = (options: ResendEmailGatewayOptions): ResendEmailGateway =>
  new ResendEmailGateway(options)
