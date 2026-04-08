import { buildAiBenchmark, runAiBenchmark } from '../src/ai/evals'

const main = async () => {
  const benchmark = buildAiBenchmark()
  const report = await runAiBenchmark(
    benchmark.generator,
    benchmark.judge,
    benchmark.mode,
    benchmark.judgeMode,
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
