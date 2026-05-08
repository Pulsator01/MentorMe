import { runRequestBriefShowcase, type RequestBriefBaselineId } from '../src/ai/requestBriefShowcase'

const main = async () => {
  const report = await runRequestBriefShowcase()
  console.log(JSON.stringify(report, null, 2))

  const requiredBaselineIds = new Set<RequestBriefBaselineId>([
    'agentic_baseline',
    'production_heuristic_current',
    'single_prompt_baseline',
  ])
  const actualBaselineIds = new Set(report.baselines.map((baseline) => baseline.baselineId))

  for (const id of requiredBaselineIds) {
    if (!actualBaselineIds.has(id)) {
      throw new Error(`Missing request-brief showcase baseline: ${id}`)
    }
  }

  const agentic = report.baselines.find((baseline) => baseline.baselineId === 'agentic_baseline')
  if (!agentic || agentic.passed < report.datasetSize) {
    throw new Error('Agentic baseline must pass every request-brief showcase case')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
