import type { MeetingSummaryShowcaseReport } from './meetingSummaryShowcase'
import { runMeetingSummaryShowcase } from './meetingSummaryShowcase'
import type { MentorRecommendationShowcaseReport } from './mentorRecommendationShowcase'
import { runMentorRecommendationShowcase } from './mentorRecommendationShowcase'
import type { RequestBriefShowcaseReport } from './requestBriefShowcase'
import { runRequestBriefShowcase } from './requestBriefShowcase'

export type AiEndpointShowcaseReport = {
  endpointCount: number
  reports: [RequestBriefShowcaseReport, MeetingSummaryShowcaseReport, MentorRecommendationShowcaseReport]
  totalDatasetSize: number
  totalEvaluatedOutputs: number
}

export const runAiEndpointShowcases = async (): Promise<AiEndpointShowcaseReport> => {
  const reports: AiEndpointShowcaseReport['reports'] = [
    await runRequestBriefShowcase(),
    await runMeetingSummaryShowcase(),
    await runMentorRecommendationShowcase(),
  ]

  return {
    endpointCount: reports.length,
    reports,
    totalDatasetSize: reports.reduce((sum, report) => sum + report.datasetSize, 0),
    totalEvaluatedOutputs: reports.reduce((sum, report) => sum + report.results.length, 0),
  }
}

