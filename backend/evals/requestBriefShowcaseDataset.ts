import type { RequestBriefInput } from '../src/domain/interfaces'

export type RequestBriefGroundTruth = {
  cfeRoutingMustMention: string[]
  challengeThemes: string[]
  desiredOutcomeThemes: string[]
  expectedRoutingDecision: 'clarify_before_route' | 'route'
  mentorFitTags: string[]
  missingInformation: string[]
  readinessSignals: string[]
}

export type RequestBriefShowcaseCase = {
  description: string
  groundTruth: RequestBriefGroundTruth
  id: string
  input: RequestBriefInput
}

export const requestBriefShowcaseDataset: RequestBriefShowcaseCase[] = [
  {
    id: 'rb-001-ecodrone-fundraising',
    description: 'Industrial-drone founder needs pilot sequencing and investor narrative help.',
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
    groundTruth: {
      challengeThemes: ['fundraising story', 'pilot conversations', 'traction proof'],
      desiredOutcomeThemes: ['fundraising story', 'pilot sequence', 'mentor-ready next step'],
      mentorFitTags: ['fundraising', 'pilot design', 'industrial drones'],
      readinessSignals: ['TRL 4', 'BRL 3', 'MVP', 'supporting artifact'],
      missingInformation: [],
      expectedRoutingDecision: 'route',
      cfeRoutingMustMention: ['route', 'fundraising', 'pilot'],
    },
  },
  {
    id: 'rb-002-healthsathi-procurement',
    description: 'Digital-health founder needs regulatory and hospital procurement guidance.',
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
    groundTruth: {
      challengeThemes: ['regulatory sequencing', 'procurement conversations', 'hospital buyer evidence'],
      desiredOutcomeThemes: ['validation checklist', 'procurement plan', 'scaling gate'],
      mentorFitTags: ['regulatory', 'hospital procurement', 'healthcare buyer discovery'],
      readinessSignals: ['TRL 5', 'BRL 4', 'Pilot', 'supporting artifact'],
      missingInformation: [],
      expectedRoutingDecision: 'route',
      cfeRoutingMustMention: ['healthcare', 'regulatory', 'procurement'],
    },
  },
  {
    id: 'rb-003-aqualoop-unclear',
    description: 'Water-treatment hardware founder has messy notes and missing routing context.',
    input: {
      ventureName: 'AquaLoop',
      stage: 'Prototype',
      trl: 3,
      brl: 2,
      rawNotes:
        'We made a lab prototype for low-cost greywater recycling. A few campus facilities people said the idea is interesting, but we do not know if maintenance cost or installation complexity is the real blocker. We need help before we spend money on the next prototype.',
      artifactRefs: [],
    },
    groundTruth: {
      challengeThemes: ['maintenance cost', 'installation complexity', 'next prototype'],
      desiredOutcomeThemes: ['identify blocker', 'prototype decision', 'customer discovery'],
      mentorFitTags: ['customer discovery', 'hardware ops', 'pilot design'],
      readinessSignals: ['TRL 3', 'BRL 2', 'Prototype'],
      missingInformation: [
        'Clarify the concrete desired outcome.',
        'Attach a deck, memo, or test note.',
        'Name the market or domain.',
      ],
      expectedRoutingDecision: 'clarify_before_route',
      cfeRoutingMustMention: ['missing', 'clarify', 'before outreach'],
    },
  },
]
