import { test, expect } from '@playwright/test'
import { gotoAndHydrate, resetDatabase } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetDatabase()
})

test('founder request moves into the CFE approval queue through the UI', async ({ page }) => {
  const uniqueChallenge = 'Browser E2E founder request for pilot routing and mentor prep.'
  const uniqueOutcome = 'Confirm the request can move from founder intake into the CFE approval queue.'
  const uniqueArtifact = 'browser-e2e-proof.pdf'

  await gotoAndHydrate(page, '/founders')
  await expect(page.getByRole('heading', { name: 'Build the right mentor ask before CFE routes it.' })).toBeVisible()

  await gotoAndHydrate(page, '/founders/new-request', { skipMagicLinkVerify: true })
  await page.getByLabel('What do you need help with').fill(uniqueChallenge)
  await page.getByLabel('Desired outcome').fill(uniqueOutcome)
  await page.getByPlaceholder('Add asset').fill(uniqueArtifact)
  await page.getByRole('button', { name: 'Add' }).click()
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/ventures/v-ecodrone/requests') &&
      response.status() === 201,
  )
  await page.getByRole('button', { name: 'Send to CFE Review' }).click()
  const createResponse = await createResponsePromise
  const createBody = (await createResponse.json()) as { request: { id: string } }
  const requestId = createBody.request.id

  await expect(page.getByText('Request sent to CFE review')).toBeVisible()

  await gotoAndHydrate(page, '/founders', { skipMagicLinkVerify: true })

  const overviewCard = page.getByTestId(`overview-request-${requestId.toLowerCase()}`)
  await expect(overviewCard).toBeVisible()
  await expect(overviewCard).toContainText(uniqueChallenge)
  await expect(overviewCard).toContainText('CFE review')

  await gotoAndHydrate(page, '/founders/pipeline', { skipMagicLinkVerify: true })
  const founderCard = page.getByTestId(`founder-request-${requestId.toLowerCase()}`)
  await expect(founderCard).toBeVisible()
  await expect(founderCard).toContainText('CFE review')
  await expect(founderCard).toContainText('3 attached items')
  const presignResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith(`/requests/${requestId}/artifacts/presign`) &&
      response.status() === 201,
  )
  const completeResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith(`/requests/${requestId}/artifacts/complete`) &&
      response.status() === 200,
  )
  await page.getByLabel(`Upload artifact for ${requestId}`).setInputFiles({
    name: 'browser-followup-note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Founder uploaded another supporting note after submission.'),
  })
  await presignResponsePromise
  await completeResponsePromise
  await expect(founderCard).toContainText('4 attached items')
  await expect(founderCard).toContainText('browser-followup-note.txt')

  const browser = page.context().browser()
  if (!browser) {
    throw new Error('Playwright browser instance is unavailable')
  }
  const cfeContext = await browser.newContext()
  const cfePage = await cfeContext.newPage()
  await gotoAndHydrate(cfePage, '/cfe/pipeline')
  const queuedCard = cfePage.getByTestId(`request-card-${requestId.toLowerCase()}`)
  await expect(queuedCard).toBeVisible()
  await expect(queuedCard).toContainText(uniqueChallenge)
  await queuedCard.getByRole('button', { name: 'Approve' }).click()

  await expect(founderCard).toContainText('Awaiting mentor')
  await cfeContext.close()
})
