import type {
  MeetingSummaryInput,
  MeetingSummaryOutput,
  RequestBriefInput,
  RequestBriefOutput,
} from '../src/domain/interfaces'

export type RequestBriefEvalCase = {
  description: string
  id: string
  input: RequestBriefInput
  reference: RequestBriefOutput
  task: 'request_brief'
}

export type MeetingSummaryEvalCase = {
  description: string
  id: string
  input: MeetingSummaryInput
  reference: MeetingSummaryOutput
  task: 'meeting_summary'
}

export const requestBriefCases: RequestBriefEvalCase[] = [
  {
    id: 'brief-ecodrone-fundraising',
    task: 'request_brief',
    description: 'Founder wants help with pilot sequencing and fundraising framing.',
    input: {
      ventureName: 'EcoDrone Systems',
      domain: 'Industrial drones',
      stage: 'MVP',
      trl: 4,
      brl: 3,
      rawNotes:
        'We built an MVP for drone-based crop surveying. Pilot conversations are happening, but our fundraising story is weak and we are not clear which traction proof matters most to early investors. Need a mentor who can help sequence pilot asks and tighten the investor narrative.',
      desiredOutcomeHint: 'Leave with a cleaner fundraising story and a better sequence for pilot conversations.',
      artifactRefs: ['Pitch deck v4', 'Pilot learning memo'],
    },
    reference: {
      provider: 'heuristic',
      briefSummary:
        'EcoDrone needs help tightening its fundraising narrative and sequencing pilot conversations so the next mentor session drives a clearer investor-ready story.',
      challenge:
        'The venture has an MVP and early pilot conversations, but the founder is not yet clear on which traction proof to emphasize or how to frame the fundraising story.',
      desiredOutcome:
        'Leave the session with a sharper investor narrative, clearer pilot priorities, and a mentor-ready next-step plan.',
      mentorFitTags: ['fundraising', 'pilot design', 'industrial drones'],
      readinessSignals: ['TRL 4', 'BRL 3', 'MVP stage ask', '2 supporting artifact(s)'],
      missingInformation: [],
      cfeRoutingNote: 'The ask is focused enough to route to a fundraising or pilot-design mentor.',
    },
  },
  {
    id: 'brief-healthsathi-regulatory',
    task: 'request_brief',
    description: 'Founder needs regulatory and hospital procurement help.',
    input: {
      ventureName: 'HealthSathi',
      domain: 'Digital health',
      stage: 'Pilot',
      trl: 5,
      brl: 4,
      rawNotes:
        'We have hospital interest for our patient monitoring product but we are unsure about regulatory sequencing and how to handle procurement conversations. Need help understanding what must be validated before scaling and what evidence a hospital buyer will ask for.',
      desiredOutcomeHint: 'Leave with a regulatory validation checklist and a procurement-ready next-step plan.',
      artifactRefs: ['Hospital pilot summary'],
    },
    reference: {
      provider: 'heuristic',
      briefSummary:
        'HealthSathi needs mentor support on regulatory sequencing and hospital procurement readiness before scaling beyond the pilot.',
      challenge:
        'The founder has early hospital interest but lacks clarity on the order of regulatory validation work and the proof required in procurement conversations.',
      desiredOutcome:
        'Leave the session with a validation checklist, stronger hospital-buyer framing, and a clearer scaling gate.',
      mentorFitTags: ['regulatory', 'healthcare buyer discovery', 'pilot design'],
      readinessSignals: ['TRL 5', 'BRL 4', 'Pilot stage ask', '1 supporting artifact(s)'],
      missingInformation: [],
      cfeRoutingNote: 'Prioritize mentors with healthcare regulation or hospital procurement experience.',
    },
  },
]

export const meetingSummaryCases: MeetingSummaryEvalCase[] = [
  {
    id: 'meeting-ecodrone-followup',
    task: 'meeting_summary',
    description: 'Mentor advised the founder to tighten metrics and pick one pilot wedge.',
    input: {
      ventureName: 'EcoDrone Systems',
      mentorName: 'Naval Bhatia',
      requestChallenge: 'Need help sequencing pilot conversations and improving fundraising framing.',
      desiredOutcome: 'Leave with a sharper investor story and pilot plan.',
      meetingNotes:
        'Mentor said the current pitch tries to do too much at once. He asked the founder to pick one pilot wedge, define 2 metrics that matter to investors, and send a cleaner 8-slide deck before asking for another intro. Student should update the pre-read. CFE should review whether an operations mentor is needed after the founder tightens the deck.',
    },
    reference: {
      provider: 'heuristic',
      executiveSummary:
        'The mentor asked EcoDrone to narrow the pilot wedge, define the traction metrics that matter, and tighten the deck before the next intro.',
      keyTakeaways: [
        'Pick one pilot wedge instead of pitching multiple directions at once.',
        'Define two investor-relevant metrics before the next outreach.',
        'Send a cleaner 8-slide deck before asking for another intro.',
      ],
      founderActionItems: [
        'Choose one pilot wedge and rewrite the story around it.',
        'Define the two traction metrics that matter most to investors.',
        'Revise and send the 8-slide deck before another intro request.',
      ],
      studentActionItems: [
        'Update the pre-read and shared notes with the tighter wedge and deck changes.',
      ],
      cfeActionItems: [
        'Review whether a second mentor with operations depth is needed after the deck is revised.',
      ],
      followUpQuestions: [
        'What single pilot wedge will the founder commit to for the next month?',
      ],
      secondSessionRecommended: true,
    },
  },
  {
    id: 'meeting-healthsathi-regulatory',
    task: 'meeting_summary',
    description: 'Mentor pushed the founder to validate hospital buying process before scaling.',
    input: {
      ventureName: 'HealthSathi',
      mentorName: 'Dr. Radhika Sen',
      requestChallenge: 'Need help with regulatory sequencing and procurement readiness.',
      desiredOutcome: 'Leave with a regulatory checklist and procurement plan.',
      meetingNotes:
        'Mentor said do not expand to more hospitals until the founder maps the buying committee and documents one full procurement cycle. She also said prepare a one-page regulatory checklist and talk to three hospital admins about approval blockers. Student should write down the approval workflow. CFE may want to route this to a compliance mentor later.',
    },
    reference: {
      provider: 'heuristic',
      executiveSummary:
        'The mentor advised HealthSathi to map one full hospital buying cycle, prepare a regulatory checklist, and validate approval blockers before expanding.',
      keyTakeaways: [
        'Do not scale to more hospitals before understanding one complete procurement cycle.',
        'Prepare a one-page regulatory checklist.',
        'Talk to three hospital admins to validate approval blockers.',
      ],
      founderActionItems: [
        'Map one full hospital procurement cycle before expanding.',
        'Prepare a one-page regulatory checklist.',
        'Interview three hospital admins about approval blockers.',
      ],
      studentActionItems: [
        'Document the approval workflow and keep the procurement notes current.',
      ],
      cfeActionItems: [
        'Review whether a compliance mentor should be added after the founder completes the first round of discovery.',
      ],
      followUpQuestions: [
        'Which approval blocker appears most often across the hospital admin interviews?',
      ],
      secondSessionRecommended: true,
    },
  },
]
