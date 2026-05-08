// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { meetingSummaryShowcaseDataset } from '../../evals/meetingSummaryShowcaseDataset'
import {
  agenticMeetingSummaryBaselinePlan,
  evaluateMeetingSummaryOutput,
  runAgenticMeetingSummaryBaseline,
  runMeetingSummaryShowcase,
  runSinglePromptMeetingSummaryBaseline,
  singlePromptMeetingSummaryBaselinePrompt,
} from './meetingSummaryShowcase'

describe('meeting summary AI endpoint showcase', () => {
  it('ships a dataset with input and ground truth for POST /ai/meeting-summary', () => {
    expect(meetingSummaryShowcaseDataset.length).toBeGreaterThanOrEqual(3)

    for (const currentCase of meetingSummaryShowcaseDataset) {
      expect(currentCase.input.ventureName).toBeTruthy()
      expect(currentCase.input.meetingNotes.length).toBeGreaterThan(80)
      expect(currentCase.groundTruth.executiveSummaryThemes.length).toBeGreaterThan(0)
      expect(currentCase.groundTruth.founderActionThemes.length).toBeGreaterThan(0)
      expect(typeof currentCase.groundTruth.expectedSecondSessionRecommended).toBe('boolean')
    }
  })

  it('documents both a single-prompt baseline and an agentic baseline', () => {
    expect(singlePromptMeetingSummaryBaselinePrompt).toContain('Convert meeting notes into JSON')
    expect(agenticMeetingSummaryBaselinePlan).toContain(
      'Critique the draft for actor confusion and missing next-step evidence before returning JSON.',
    )
  })

  it('scores baseline outputs with the local agentic evaluation loop', async () => {
    const currentCase = meetingSummaryShowcaseDataset[0]
    const singlePromptOutput = await runSinglePromptMeetingSummaryBaseline(currentCase.input)
    const agenticOutput = await runAgenticMeetingSummaryBaseline(currentCase.input)

    const singlePromptResult = evaluateMeetingSummaryOutput(currentCase, singlePromptOutput)
    const agenticResult = evaluateMeetingSummaryOutput(currentCase, agenticOutput)

    expect(singlePromptResult.rubric.map((item) => item.name)).toEqual([
      'schema_contract',
      'executive_summary_grounding',
      'key_takeaways_grounding',
      'founder_actions',
      'student_actions',
      'cfe_actions',
      'follow_up_questions',
      'second_session_decision',
    ])
    expect(agenticResult.overallScore).toBeGreaterThanOrEqual(singlePromptResult.overallScore)
  })

  it('runs the complete meeting-summary showcase across all baselines', async () => {
    const report = await runMeetingSummaryShowcase()

    expect(report.endpoint).toBe('POST /ai/meeting-summary')
    expect(report.datasetSize).toBe(meetingSummaryShowcaseDataset.length)
    expect(report.results).toHaveLength(meetingSummaryShowcaseDataset.length * 3)
    expect(report.baselines.map((baseline) => baseline.baselineId).sort()).toEqual([
      'agentic_baseline',
      'production_heuristic_current',
      'single_prompt_baseline',
    ])
    expect(report.baselines.every((baseline) => baseline.averageScore > 0)).toBe(true)
  })
})

