// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { runAiBenchmark } from './evals'

describe('runAiBenchmark', () => {
  it('aggregates benchmark results across all sample cases', async () => {
    const generator = {
      generateRequestBrief: vi.fn(async (input) => ({
        provider: 'heuristic' as const,
        briefSummary: `brief for ${input.ventureName}`,
        challenge: 'challenge',
        desiredOutcome: 'outcome',
        mentorFitTags: ['fundraising'],
        missingInformation: [],
        readinessSignals: ['TRL 4'],
        cfeRoutingNote: 'route it',
      })),
      generateMeetingSummary: vi.fn(async (input) => ({
        provider: 'heuristic' as const,
        executiveSummary: `summary for ${input.ventureName}`,
        keyTakeaways: ['takeaway'],
        founderActionItems: ['founder'],
        studentActionItems: ['student'],
        cfeActionItems: ['cfe'],
        followUpQuestions: ['question'],
        secondSessionRecommended: true,
      })),
    }

    const judge = {
      judgeCase: vi.fn(async ({ task }) => ({
        summary: `judged ${task}`,
        overallScore: 4.25,
        pass: true,
        criteria: [
          { name: 'relevance', score: 4, rationale: 'Relevant enough' },
          { name: 'structure', score: 4.5, rationale: 'Structured' },
          { name: 'actionability', score: 4.25, rationale: 'Actionable' },
        ],
      })),
    }

    const report = await runAiBenchmark(generator, judge, 'heuristic', 'heuristic')

    expect(report.total).toBe(4)
    expect(report.passed).toBe(4)
    expect(report.averageScore).toBe(4.25)
    expect(generator.generateRequestBrief).toHaveBeenCalledTimes(2)
    expect(generator.generateMeetingSummary).toHaveBeenCalledTimes(2)
    expect(judge.judgeCase).toHaveBeenCalledTimes(4)
  })
})
