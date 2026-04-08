import type {
  MeetingSummaryInput,
  MeetingSummaryOutput,
  RequestBriefInput,
  RequestBriefOutput,
} from '../domain/interfaces'
import type { JudgeCriterionResult, JudgeResult } from './openAiGateway'

const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim()

const splitSentences = (value: string) =>
  cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

const pickBullets = (value: string, fallback: string[]) => {
  const bullets = value
    .split(/\n|•|-/)
    .map((item) => cleanText(item))
    .filter((item) => item.length >= 12)

  return bullets.length > 0 ? bullets.slice(0, 4) : fallback.slice(0, 4)
}

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)))

const keywordTags = (input: string) => {
  const text = input.toLowerCase()
  const tags = [
    text.includes('fundrais') && 'fundraising',
    text.includes('pilot') && 'pilot design',
    text.includes('pricing') && 'pricing',
    text.includes('sales') && 'go-to-market',
    text.includes('regulat') && 'regulatory',
    text.includes('hardware') && 'hardware ops',
    text.includes('team') && 'team building',
    text.includes('manufactur') && 'manufacturing',
    text.includes('hospital') && 'healthcare buyer discovery',
    text.includes('drone') && 'drones',
  ].filter(Boolean) as string[]

  return unique(tags)
}

const extractActionItems = (notes: string, fallback: string[]) => {
  const candidates = splitSentences(notes).filter((sentence) =>
    /(need to|should|next|follow up|send|prepare|validate|test|talk to|share|revise|clarify)/i.test(sentence),
  )

  return candidates.length > 0 ? unique(candidates).slice(0, 4) : fallback
}

export class HeuristicAiGateway {
  async generateRequestBrief(input: RequestBriefInput): Promise<RequestBriefOutput> {
    const sentences = splitSentences(input.rawNotes)
    const summary = sentences.slice(0, 2).join(' ') || cleanText(input.rawNotes)
    const mentorFitTags = unique([
      ...(input.domain ? [input.domain.toLowerCase()] : []),
      ...(input.stage ? [input.stage.toLowerCase()] : []),
      ...keywordTags(input.rawNotes),
    ]).slice(0, 5)

    const readinessSignals = unique([
      input.trl ? `TRL ${input.trl}` : '',
      input.brl ? `BRL ${input.brl}` : '',
      input.stage ? `${input.stage} stage ask` : '',
      input.artifactRefs?.length ? `${input.artifactRefs.length} supporting artifact(s)` : '',
      input.desiredOutcomeHint ? 'Desired outcome supplied' : '',
    ]).slice(0, 4)

    const missingInformation = unique([
      !input.desiredOutcomeHint ? 'Clarify the concrete decision or outcome you want from the mentor session.' : '',
      !(input.artifactRefs && input.artifactRefs.length > 0)
        ? 'Attach a deck, memo, or note so CFE can judge context quality quickly.'
        : '',
      !input.domain ? 'Name the market or domain so mentor fit is easier to assess.' : '',
    ])

    return {
      provider: 'heuristic',
      briefSummary: summary,
      challenge: sentences[0] || summary,
      desiredOutcome:
        cleanText(input.desiredOutcomeHint || '') ||
        'Leave the session with a sharper mentor-ready brief, clearer next steps, and a better routing decision from CFE.',
      mentorFitTags: mentorFitTags.length > 0 ? mentorFitTags : ['general strategy'],
      readinessSignals: readinessSignals.length > 0 ? readinessSignals : ['Raw founder notes supplied'],
      missingInformation,
      cfeRoutingNote: missingInformation.length > 0
        ? 'The request is directionally clear, but CFE should check whether the missing context is resolved before outreach.'
        : 'The request is structured enough for CFE to review and route if mentor fit is strong.',
    }
  }

  async generateMeetingSummary(input: MeetingSummaryInput): Promise<MeetingSummaryOutput> {
    const sentences = splitSentences(input.meetingNotes)
    const executiveSummary = sentences.slice(0, 2).join(' ') || cleanText(input.meetingNotes)
    const founderActionItems = extractActionItems(input.meetingNotes, [
      'Refine the venture narrative using the mentor feedback from this session.',
      'Confirm the single next milestone that should happen before another mentor conversation.',
    ])
    const studentActionItems = extractActionItems(input.meetingNotes, [
      'Capture the clean meeting notes and share them with the founder and CFE.',
      'Update the prep pack so the next mentor sees the latest context.',
    ])
    const cfeActionItems = extractActionItems(input.meetingNotes, [
      'Review whether this request needs another mentor or a tighter follow-up plan.',
      'Track whether the founder completed the agreed next step after the session.',
    ])
    const keyTakeaways = pickBullets(input.meetingNotes, sentences.length > 0 ? sentences : [executiveSummary])
    const followUpQuestions = unique([
      !(input.requestChallenge || '').trim() ? 'What exact decision should the next mentor conversation help unlock?' : '',
      founderActionItems.length < 2 ? 'What single deliverable should the founder send before the next check-in?' : '',
      cfeActionItems.length < 1
        ? 'Does CFE need to route this to another mentor after the founder acts on the feedback?'
        : '',
    ])

    return {
      provider: 'heuristic',
      executiveSummary,
      keyTakeaways,
      founderActionItems,
      studentActionItems,
      cfeActionItems,
      followUpQuestions,
      secondSessionRecommended: /follow[- ]?up|second session|next call|come back/i.test(input.meetingNotes),
    }
  }

  async judgeCase(payload: {
    actualOutput: Record<string, unknown>
    referenceOutput: Record<string, unknown>
    task: string
  }): Promise<JudgeResult> {
    const actual = JSON.stringify(payload.actualOutput).toLowerCase()
    const reference = JSON.stringify(payload.referenceOutput).toLowerCase()

    const overlapWords = unique(reference.split(/[^a-z0-9]+/).filter((item) => item.length > 4))
    const matchedWords = overlapWords.filter((item) => actual.includes(item))
    const overlapScore = overlapWords.length === 0 ? 5 : Math.min(5, (matchedWords.length / overlapWords.length) * 5)
    const structureScore = Array.isArray((payload.actualOutput as any).mentorFitTags) || Array.isArray((payload.actualOutput as any).keyTakeaways) ? 5 : 3
    const actionScore =
      Array.isArray((payload.actualOutput as any).founderActionItems) ||
      Array.isArray((payload.actualOutput as any).mentorFitTags)
        ? 4
        : 2

    const criteria: JudgeCriterionResult[] = [
      {
        name: 'reference_overlap',
        score: Number(overlapScore.toFixed(2)),
        rationale: `Matched ${matchedWords.length} of ${overlapWords.length || 0} meaningful reference terms.`,
      },
      {
        name: 'structured_output',
        score: structureScore,
        rationale: 'The response includes the expected top-level structured fields.',
      },
      {
        name: 'actionability',
        score: actionScore,
        rationale: 'The response contains routeable action items or mentor-fit guidance.',
      },
    ]

    const overallScore = Number((criteria.reduce((sum, item) => sum + item.score, 0) / criteria.length).toFixed(2))

    return {
      summary: `Heuristic judge scored the ${payload.task} case at ${overallScore}/5.`,
      overallScore,
      pass: overallScore >= 3.5,
      criteria,
    }
  }
}
