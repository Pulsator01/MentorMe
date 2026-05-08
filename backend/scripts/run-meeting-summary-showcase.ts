import { runMeetingSummaryShowcase, type MeetingSummaryBaselineId } from '../src/ai/meetingSummaryShowcase'

const main = async () => {
  const report = await runMeetingSummaryShowcase()
  console.log(JSON.stringify(report, null, 2))

  const requiredBaselineIds = new Set<MeetingSummaryBaselineId>([
    'agentic_baseline',
    'production_heuristic_current',
    'single_prompt_baseline',
  ])
  const actualBaselineIds = new Set(report.baselines.map((baseline) => baseline.baselineId))

  for (const id of requiredBaselineIds) {
    if (!actualBaselineIds.has(id)) {
      throw new Error(`Missing meeting-summary showcase baseline: ${id}`)
    }
  }

  const agentic = report.baselines.find((baseline) => baseline.baselineId === 'agentic_baseline')
  if (!agentic || agentic.passed < report.datasetSize) {
    throw new Error('Agentic baseline must pass every meeting-summary showcase case')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

