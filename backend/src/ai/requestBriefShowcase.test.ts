// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { requestBriefShowcaseDataset } from '../../evals/requestBriefShowcaseDataset'
import {
  agenticRequestBriefBaselinePlan,
  evaluateRequestBriefOutput,
  runAgenticRequestBriefBaseline,
  runRequestBriefShowcase,
  runSinglePromptRequestBriefBaseline,
  singlePromptRequestBriefBaselinePrompt,
} from './requestBriefShowcase'

describe('request brief AI endpoint showcase', () => {
  it('ships a dataset with input and ground truth for POST /ai/request-brief', () => {
    expect(requestBriefShowcaseDataset.length).toBeGreaterThanOrEqual(3)

    for (const currentCase of requestBriefShowcaseDataset) {
      expect(currentCase.input.ventureName).toBeTruthy()
      expect(currentCase.input.rawNotes.length).toBeGreaterThan(30)
      expect(currentCase.groundTruth.challengeThemes.length).toBeGreaterThan(0)
      expect(currentCase.groundTruth.desiredOutcomeThemes.length).toBeGreaterThan(0)
      expect(currentCase.groundTruth.mentorFitTags.length).toBeGreaterThan(0)
    }
  })

  it('documents both a single-prompt baseline and an agentic baseline', () => {
    expect(singlePromptRequestBriefBaselinePrompt).toContain('Convert the founder notes into JSON')
    expect(agenticRequestBriefBaselinePlan).toContain(
      'Critique the draft against CFE routing needs and revise the routing note before returning JSON.',
    )
  })

  it('scores baseline outputs with the local agentic evaluation loop', async () => {
    const currentCase = requestBriefShowcaseDataset[0]
    const singlePromptOutput = await runSinglePromptRequestBriefBaseline(currentCase.input)
    const agenticOutput = await runAgenticRequestBriefBaseline(currentCase.input)

    const singlePromptResult = evaluateRequestBriefOutput(currentCase, singlePromptOutput)
    const agenticResult = evaluateRequestBriefOutput(currentCase, agenticOutput)

    expect(singlePromptResult.rubric.map((item) => item.name)).toEqual([
      'schema_contract',
      'challenge_grounding',
      'outcome_grounding',
      'mentor_fit_tags',
      'readiness_signals',
      'missing_information',
      'cfe_routing_note',
    ])
    expect(agenticResult.overallScore).toBeGreaterThanOrEqual(singlePromptResult.overallScore)
  })

  it('runs the complete request-brief showcase across all baselines', async () => {
    const report = await runRequestBriefShowcase()

    expect(report.endpoint).toBe('POST /ai/request-brief')
    expect(report.datasetSize).toBe(requestBriefShowcaseDataset.length)
    expect(report.results).toHaveLength(requestBriefShowcaseDataset.length * 3)
    expect(report.baselines.map((baseline) => baseline.baselineId).sort()).toEqual([
      'agentic_baseline',
      'production_heuristic_current',
      'single_prompt_baseline',
    ])
    expect(report.baselines.every((baseline) => baseline.averageScore > 0)).toBe(true)
  })
})
