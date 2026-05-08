// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { runAiEndpointShowcases } from './aiEndpointShowcase'

describe('AI endpoint showcase aggregator', () => {
  it('runs showcases for all three AI endpoints', async () => {
    const report = await runAiEndpointShowcases()

    expect(report.endpointCount).toBe(3)
    expect(report.totalDatasetSize).toBe(9)
    expect(report.totalEvaluatedOutputs).toBe(27)
    expect(report.reports.map((endpointReport) => endpointReport.endpoint)).toEqual([
      'POST /ai/request-brief',
      'POST /ai/meeting-summary',
      'POST /ai/mentor-recommendations',
    ])
    expect(
      report.reports.every((endpointReport) =>
        endpointReport.baselines.some(
          (baseline) => baseline.baselineId === 'agentic_baseline' && baseline.passed === endpointReport.datasetSize,
        ),
      ),
    ).toBe(true)
  })
})

