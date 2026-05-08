// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { mentorRecommendationShowcaseDataset } from '../../evals/mentorRecommendationShowcaseDataset'
import {
  agenticMentorRecommendationBaselinePlan,
  evaluateMentorRecommendationOutput,
  runAgenticMentorRecommendationBaseline,
  runMentorRecommendationShowcase,
  runSinglePromptMentorRecommendationBaseline,
  singlePromptMentorRecommendationBaselinePrompt,
} from './mentorRecommendationShowcase'

describe('mentor recommendation AI endpoint showcase', () => {
  it('ships a dataset with input and ground truth for POST /ai/mentor-recommendations', () => {
    expect(mentorRecommendationShowcaseDataset.length).toBeGreaterThanOrEqual(3)

    for (const currentCase of mentorRecommendationShowcaseDataset) {
      expect(currentCase.input.ventureName).toBeTruthy()
      expect(currentCase.input.challenge.length).toBeGreaterThan(40)
      expect(currentCase.input.candidates.length).toBeGreaterThanOrEqual(3)
      expect(currentCase.groundTruth.expectedTopMentorIds.length).toBeGreaterThan(0)
      expect(currentCase.groundTruth.requiredSearchTags.length).toBeGreaterThan(0)
    }
  })

  it('documents both a single-prompt baseline and an agentic baseline', () => {
    expect(singlePromptMentorRecommendationBaselinePrompt).toContain('Rank mentor candidates')
    expect(agenticMentorRecommendationBaselinePlan).toContain(
      'Critique the shortlist for irrelevant mentors, missing tags, weak CFE routing context, and order mistakes.',
    )
  })

  it('scores baseline outputs with the local agentic evaluation loop', async () => {
    const currentCase = mentorRecommendationShowcaseDataset[0]
    const singlePromptOutput = await runSinglePromptMentorRecommendationBaseline(currentCase.input)
    const agenticOutput = await runAgenticMentorRecommendationBaseline(currentCase.input)

    const singlePromptResult = evaluateMentorRecommendationOutput(currentCase, singlePromptOutput)
    const agenticResult = evaluateMentorRecommendationOutput(currentCase, agenticOutput)

    expect(singlePromptResult.rubric.map((item) => item.name)).toEqual([
      'schema_contract',
      'search_tag_grounding',
      'shortlist_order',
      'reason_grounding',
      'irrelevant_mentor_exclusion',
      'routing_note_grounding',
    ])
    expect(agenticResult.overallScore).toBeGreaterThanOrEqual(singlePromptResult.overallScore)
  })

  it('runs the complete mentor-recommendation showcase across all baselines', async () => {
    const report = await runMentorRecommendationShowcase()

    expect(report.endpoint).toBe('POST /ai/mentor-recommendations')
    expect(report.datasetSize).toBe(mentorRecommendationShowcaseDataset.length)
    expect(report.results).toHaveLength(mentorRecommendationShowcaseDataset.length * 3)
    expect(report.baselines.map((baseline) => baseline.baselineId).sort()).toEqual([
      'agentic_baseline',
      'production_heuristic_current',
      'single_prompt_baseline',
    ])
    expect(report.baselines.every((baseline) => baseline.averageScore > 0)).toBe(true)
  })
})

