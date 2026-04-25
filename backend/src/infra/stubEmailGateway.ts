import type { EmailGateway } from '../domain/interfaces'

export const createStubEmailGateway = (): EmailGateway & { sent: Array<Record<string, unknown>> } => {
  const sent: Array<Record<string, unknown>> = []

  return {
    sent,
    async sendMagicLink(input) {
      sent.push({ type: 'magic_link', ...input })
    },
    async sendMentorOutreach(input) {
      sent.push({ type: 'mentor_outreach', ...input })
    },
    async sendPasswordReset(input) {
      sent.push({ type: 'password_reset', ...input })
    },
    async sendWelcome(input) {
      sent.push({ type: 'welcome', ...input })
    },
  }
}
