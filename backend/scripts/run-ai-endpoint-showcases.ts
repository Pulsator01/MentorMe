import { runAiEndpointShowcases } from '../src/ai/aiEndpointShowcase'

const requiredEndpoints = new Set([
  'POST /ai/request-brief',
  'POST /ai/meeting-summary',
  'POST /ai/mentor-recommendations',
])

const main = async () => {
  const report = await runAiEndpointShowcases()
  console.log(JSON.stringify(report, null, 2))

  const actualEndpoints = new Set<string>(report.reports.map((endpointReport) => endpointReport.endpoint))
  for (const endpoint of requiredEndpoints) {
    if (!actualEndpoints.has(endpoint)) {
      throw new Error(`Missing AI endpoint showcase report: ${endpoint}`)
    }
  }

  for (const endpointReport of report.reports) {
    const agentic = endpointReport.baselines.find((baseline) => baseline.baselineId === 'agentic_baseline')
    if (!agentic || agentic.passed < endpointReport.datasetSize) {
      throw new Error(`Agentic baseline must pass every showcase case for ${endpointReport.endpoint}`)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
