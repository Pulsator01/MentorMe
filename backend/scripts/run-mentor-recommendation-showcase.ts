import {
  runMentorRecommendationShowcase,
  type MentorRecommendationBaselineId,
} from '../src/ai/mentorRecommendationShowcase'

const main = async () => {
  const report = await runMentorRecommendationShowcase()
  console.log(JSON.stringify(report, null, 2))

  const requiredBaselineIds = new Set<MentorRecommendationBaselineId>([
    'agentic_baseline',
    'production_heuristic_current',
    'single_prompt_baseline',
  ])
  const actualBaselineIds = new Set(report.baselines.map((baseline) => baseline.baselineId))

  for (const id of requiredBaselineIds) {
    if (!actualBaselineIds.has(id)) {
      throw new Error(`Missing mentor-recommendation showcase baseline: ${id}`)
    }
  }

  const agentic = report.baselines.find((baseline) => baseline.baselineId === 'agentic_baseline')
  if (!agentic || agentic.passed < report.datasetSize) {
    throw new Error('Agentic baseline must pass every mentor-recommendation showcase case')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

