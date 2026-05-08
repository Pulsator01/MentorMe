export type ShowcaseRubricResult = {
  name: string
  rationale: string
  score: number
  weight: number
}

export const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim()

export const splitSentences = (value: string) =>
  cleanText(value)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

export const tokenize = (value: string) =>
  cleanText(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2)

export const unique = (items: string[]) => Array.from(new Set(items.map((item) => cleanText(item)).filter(Boolean)))

export const includesAny = (value: string, needles: string[]) => {
  const text = value.toLowerCase()
  return needles.some((needle) => text.includes(needle.toLowerCase()))
}

export const themeMatches = (actual: string, expected: string) => {
  const actualText = actual.toLowerCase()
  const expectedText = expected.toLowerCase()

  if (actualText.includes(expectedText)) {
    return true
  }

  const actualTokens = new Set(tokenize(actualText))
  const expectedTokens = tokenize(expectedText)
  const matches = expectedTokens.filter((token) => actualTokens.has(token)).length
  return expectedTokens.length > 0 && matches / expectedTokens.length >= 0.5
}

export const scoreExpectedCoverage = (expected: string[], actual: string | string[]) => {
  if (expected.length === 0) {
    return 1
  }

  const actualText = Array.isArray(actual) ? actual.join(' ') : actual
  const matched = expected.filter((item) => themeMatches(actualText, item)).length
  return matched / expected.length
}

export const computeOverallScore = (rubric: ShowcaseRubricResult[]) => {
  const weightedScore = rubric.reduce((sum, item) => sum + item.score * item.weight, 0)
  const maxScore = rubric.reduce((sum, item) => sum + item.weight, 0)
  return Number(((weightedScore / maxScore) * 5).toFixed(2))
}

