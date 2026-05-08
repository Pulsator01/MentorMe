import type { MeetingSummaryInput } from '../src/domain/interfaces'

export type MeetingSummaryGroundTruth = {
  cfeActionThemes: string[]
  expectedSecondSessionRecommended: boolean
  executiveSummaryThemes: string[]
  followUpQuestionThemes: string[]
  founderActionThemes: string[]
  keyTakeawayThemes: string[]
  studentActionThemes: string[]
}

export type MeetingSummaryShowcaseCase = {
  description: string
  groundTruth: MeetingSummaryGroundTruth
  id: string
  input: MeetingSummaryInput
}

export const meetingSummaryShowcaseDataset: MeetingSummaryShowcaseCase[] = [
  {
    id: 'ms-001-ecodrone-deck-followup',
    description: 'Mentor pushes EcoDrone to narrow the pilot wedge and prepare a cleaner investor deck.',
    input: {
      ventureName: 'EcoDrone Systems',
      mentorName: 'Naval Bhatia',
      requestChallenge: 'Need help sequencing pilot conversations and improving fundraising framing.',
      desiredOutcome: 'Leave with a sharper investor story and pilot plan.',
      meetingNotes:
        'Mentor said the current pitch tries to do too much at once. Founder should choose one crop-surveying pilot wedge, define two investor-relevant traction metrics, and send a cleaner 8-slide deck before asking for another intro. Student should update the pre-read and shared meeting notes with the tighter wedge. CFE should review whether an operations mentor is needed after the deck rewrite. Mentor recommended a second session once the revised deck is ready.',
    },
    groundTruth: {
      executiveSummaryThemes: ['narrow the pilot wedge', 'traction metrics', 'cleaner deck'],
      keyTakeawayThemes: ['one pilot wedge', 'two investor-relevant traction metrics', 'cleaner 8-slide deck'],
      founderActionThemes: ['choose one crop-surveying pilot wedge', 'define two traction metrics', 'send a cleaner deck'],
      studentActionThemes: ['update the pre-read', 'shared meeting notes'],
      cfeActionThemes: ['review whether an operations mentor is needed'],
      followUpQuestionThemes: ['revised deck', 'pilot wedge'],
      expectedSecondSessionRecommended: true,
    },
  },
  {
    id: 'ms-002-healthsathi-procurement',
    description: 'Mentor asks HealthSathi to validate hospital procurement before scaling.',
    input: {
      ventureName: 'HealthSathi',
      mentorName: 'Dr. Radhika Sen',
      requestChallenge: 'Need help with regulatory sequencing and procurement readiness.',
      desiredOutcome: 'Leave with a regulatory checklist and procurement plan.',
      meetingNotes:
        'Mentor said HealthSathi should not expand to more hospitals until the founder maps one complete buying committee and documents a full procurement cycle. Founder should prepare a one-page regulatory checklist and speak with three hospital admins about approval blockers. Student should write down the approval workflow and keep the procurement notes current. CFE should decide after those interviews whether to route a compliance mentor. A follow-up call is useful after the admin interviews are complete.',
    },
    groundTruth: {
      executiveSummaryThemes: ['buying committee', 'procurement cycle', 'approval blockers'],
      keyTakeawayThemes: ['do not expand to more hospitals', 'one-page regulatory checklist', 'three hospital admins'],
      founderActionThemes: ['map one complete buying committee', 'document a full procurement cycle', 'speak with three hospital admins'],
      studentActionThemes: ['write down the approval workflow', 'procurement notes'],
      cfeActionThemes: ['decide whether to route a compliance mentor'],
      followUpQuestionThemes: ['approval blocker', 'admin interviews'],
      expectedSecondSessionRecommended: true,
    },
  },
  {
    id: 'ms-003-aqualoop-prototype-gate',
    description: 'Mentor gives AquaLoop a prototype gate but does not recommend another session yet.',
    input: {
      ventureName: 'AquaLoop',
      mentorName: 'Meera Kapoor',
      requestChallenge: 'Need help identifying whether maintenance cost or installation complexity is the blocker.',
      desiredOutcome: 'Leave with a customer-discovery plan before the next prototype spend.',
      meetingNotes:
        'Mentor said the founder should pause prototype spending until five campus facilities interviews are complete. Founder should compare maintenance-cost concerns against installation-complexity concerns and write a simple go or no-go gate for the next prototype. Student should log each interview quote in the request workspace. CFE should wait for the interview evidence before routing another mentor.',
    },
    groundTruth: {
      executiveSummaryThemes: ['pause prototype spending', 'five campus facilities interviews', 'go or no-go gate'],
      keyTakeawayThemes: ['maintenance-cost concerns', 'installation-complexity concerns', 'interview evidence'],
      founderActionThemes: ['complete five campus facilities interviews', 'compare maintenance-cost concerns', 'write a go or no-go gate'],
      studentActionThemes: ['log each interview quote'],
      cfeActionThemes: ['wait for the interview evidence before routing another mentor'],
      followUpQuestionThemes: ['maintenance cost', 'installation complexity'],
      expectedSecondSessionRecommended: false,
    },
  },
]

