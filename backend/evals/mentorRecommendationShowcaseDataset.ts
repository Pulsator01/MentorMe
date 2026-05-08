import type { MentorRecommendationCandidate, MentorRecommendationInput } from '../src/domain/interfaces'

export type MentorRecommendationGroundTruth = {
  expectedTopMentorIds: string[]
  forbiddenMentorIds: string[]
  reasonThemesByMentor: Record<string, string[]>
  requiredRoutingNoteThemes: string[]
  requiredSearchTags: string[]
}

export type MentorRecommendationShowcaseCase = {
  description: string
  groundTruth: MentorRecommendationGroundTruth
  id: string
  input: MentorRecommendationInput & { candidates: MentorRecommendationCandidate[] }
}

export const mentorRecommendationShowcaseDataset: MentorRecommendationShowcaseCase[] = [
  {
    id: 'mr-001-ecodrone-fundraising',
    description: 'Founder needs fundraising and pilot-structuring mentors for an industrial-drone MVP.',
    input: {
      ventureName: 'EcoDrone Systems',
      domain: 'Industrial drones',
      stage: 'MVP',
      trl: 4,
      brl: 3,
      challenge: 'Need help tightening fundraising framing and sequencing pilot conversations.',
      desiredOutcome: 'Leave with a sharper investor story and clearer pilot wedge.',
      maxResults: 2,
      candidates: [
        {
          id: 'm-naval',
          name: 'Naval Bhatia',
          title: 'Ex-founder and fundraising coach',
          location: 'Delhi',
          focus: ['Fundraising', 'Storytelling', 'Early GTM'],
          stages: ['MVP', 'Pilot', 'Scale'],
          domains: ['Industrial drones', 'Climate tech'],
          tolerance: 'High',
          monthlyLimit: 3,
          responseWindow: '48 hours',
          bio: 'Helps deep-tech founders tighten investor narratives and pilot sequencing.',
        },
        {
          id: 'm-arjun',
          name: 'Arjun Menon',
          title: 'Hardware and ops operator',
          location: 'Bengaluru',
          focus: ['Hardware ops', 'Pilot design', 'Manufacturing'],
          stages: ['TRL 3+', 'MVP', 'Pilot'],
          domains: ['Industrial drones', 'Robotics'],
          tolerance: 'Medium',
          monthlyLimit: 2,
          responseWindow: '72 hours',
          bio: 'Supports pilot design and operational sequencing for hardware startups.',
        },
        {
          id: 'm-radhika',
          name: 'Dr. Radhika Sen',
          title: 'Healthcare compliance mentor',
          location: 'Remote',
          focus: ['Regulatory', 'Procurement'],
          stages: ['Pilot', 'Scale'],
          domains: ['Digital health'],
          tolerance: 'High',
          monthlyLimit: 2,
          responseWindow: '48 hours',
          bio: 'Strong in healthcare compliance, but not this venture domain.',
        },
      ],
    },
    groundTruth: {
      expectedTopMentorIds: ['m-naval', 'm-arjun'],
      forbiddenMentorIds: ['m-radhika'],
      requiredSearchTags: ['industrial drones', 'mvp', 'fundraising', 'pilot design'],
      requiredRoutingNoteThemes: ['fundraising', 'pilot', 'CFE'],
      reasonThemesByMentor: {
        'm-naval': ['fundraising', 'investor story', 'industrial drones'],
        'm-arjun': ['pilot', 'hardware', 'industrial drones'],
      },
    },
  },
  {
    id: 'mr-002-healthsathi-regulatory',
    description: 'Founder needs hospital procurement and compliance mentors for a digital-health pilot.',
    input: {
      ventureName: 'HealthSathi',
      domain: 'Digital health',
      stage: 'Pilot',
      trl: 5,
      brl: 4,
      challenge: 'Need help with regulatory sequencing and hospital procurement readiness.',
      desiredOutcome: 'Leave with a compliance checklist and a cleaner buyer-discovery plan.',
      maxResults: 2,
      candidates: [
        {
          id: 'm-radhika',
          name: 'Dr. Radhika Sen',
          title: 'Healthcare compliance mentor',
          location: 'Remote',
          focus: ['Regulatory', 'Hospital procurement', 'Healthcare buyer discovery'],
          stages: ['Pilot', 'Scale'],
          domains: ['Digital health', 'Medtech'],
          tolerance: 'High',
          monthlyLimit: 2,
          responseWindow: '48 hours',
          bio: 'Guides founders through regulatory readiness and hospital buying workflows.',
        },
        {
          id: 'm-meera',
          name: 'Meera Kapoor',
          title: 'Hospital operations advisor',
          location: 'Chandigarh',
          focus: ['Procurement', 'Hospital operations'],
          stages: ['Pilot'],
          domains: ['Digital health'],
          tolerance: 'Medium',
          monthlyLimit: 1,
          responseWindow: '72 hours',
          bio: 'Supports hospital buying-process mapping and rollout discipline.',
        },
        {
          id: 'm-naval',
          name: 'Naval Bhatia',
          title: 'Ex-founder and fundraising coach',
          location: 'Delhi',
          focus: ['Fundraising', 'Storytelling', 'Early GTM'],
          stages: ['MVP', 'Pilot', 'Scale'],
          domains: ['SaaS', 'Climate tech'],
          tolerance: 'High',
          monthlyLimit: 3,
          responseWindow: '48 hours',
          bio: 'Great general startup coach, but not domain-specific here.',
        },
      ],
    },
    groundTruth: {
      expectedTopMentorIds: ['m-radhika', 'm-meera'],
      forbiddenMentorIds: ['m-naval'],
      requiredSearchTags: ['digital health', 'pilot', 'regulatory', 'healthcare buyer discovery'],
      requiredRoutingNoteThemes: ['healthcare', 'procurement', 'compliance'],
      reasonThemesByMentor: {
        'm-radhika': ['regulatory', 'hospital procurement', 'digital health'],
        'm-meera': ['hospital operations', 'procurement', 'buyer process'],
      },
    },
  },
  {
    id: 'mr-003-aqualoop-prototype',
    description: 'Founder needs hardware customer-discovery and pilot mentors for a greywater prototype.',
    input: {
      ventureName: 'AquaLoop',
      domain: 'Water treatment',
      stage: 'Prototype',
      trl: 3,
      brl: 2,
      challenge:
        'Need help learning whether maintenance cost or installation complexity is the blocker before spending on another hardware prototype.',
      desiredOutcome: 'Leave with customer-discovery questions and a prototype go or no-go gate.',
      maxResults: 2,
      candidates: [
        {
          id: 'm-kavya',
          name: 'Kavya Iyer',
          title: 'Water infrastructure pilot advisor',
          location: 'Remote',
          focus: ['Customer discovery', 'Pilot design', 'Hardware ops'],
          stages: ['Prototype', 'Pilot'],
          domains: ['Water treatment', 'Campus facilities'],
          tolerance: 'High',
          monthlyLimit: 2,
          responseWindow: '48 hours',
          bio: 'Helps hardware founders validate facility-buyer pain before scaling pilots.',
        },
        {
          id: 'm-arjun',
          name: 'Arjun Menon',
          title: 'Hardware and ops operator',
          location: 'Bengaluru',
          focus: ['Hardware ops', 'Pilot design', 'Manufacturing'],
          stages: ['TRL 3+', 'Prototype', 'MVP'],
          domains: ['Robotics', 'Industrial hardware'],
          tolerance: 'Medium',
          monthlyLimit: 2,
          responseWindow: '72 hours',
          bio: 'Supports prototype sequencing and operational tradeoffs for hardware startups.',
        },
        {
          id: 'm-naval',
          name: 'Naval Bhatia',
          title: 'Ex-founder and fundraising coach',
          location: 'Delhi',
          focus: ['Fundraising', 'Storytelling', 'Early GTM'],
          stages: ['MVP', 'Pilot', 'Scale'],
          domains: ['SaaS', 'Climate tech'],
          tolerance: 'High',
          monthlyLimit: 3,
          responseWindow: '48 hours',
          bio: 'Helpful once the fundraising story matters, but not the current prototype-blocker ask.',
        },
      ],
    },
    groundTruth: {
      expectedTopMentorIds: ['m-kavya', 'm-arjun'],
      forbiddenMentorIds: ['m-naval'],
      requiredSearchTags: ['water treatment', 'prototype', 'customer discovery', 'hardware ops'],
      requiredRoutingNoteThemes: ['customer discovery', 'prototype', 'CFE'],
      reasonThemesByMentor: {
        'm-kavya': ['water treatment', 'customer discovery', 'pilot design'],
        'm-arjun': ['hardware ops', 'prototype', 'operational tradeoffs'],
      },
    },
  },
]

