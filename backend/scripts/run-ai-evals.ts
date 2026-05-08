import { buildAiBenchmark, runAiBenchmark } from '../src/ai/evals'

const numericEnv = (name: string) => {
  const value = Number(process.env[name] || 0)
  return Number.isFinite(value) ? value : 0
}

const main = async () => {
  const benchmark = buildAiBenchmark()
  const report = await runAiBenchmark(
    benchmark.generator,
    benchmark.judge,
    benchmark.mode,
    benchmark.judgeMode,
    {
      delayBetweenCasesMs: numericEnv('AI_EVAL_CASE_DELAY_MS'),
      startDelayMs: numericEnv('AI_EVAL_START_DELAY_MS'),
    },
  )

  console.log(JSON.stringify(report, null, 2))

  const passThreshold = Number(process.env.AI_EVAL_MIN_PASS_RATE || '0.75')
  const passRate = report.passed / report.total

  if (passRate < passThreshold) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
