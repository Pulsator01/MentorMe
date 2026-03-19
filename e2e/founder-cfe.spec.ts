import { test, expect } from '@playwright/test'
import { actAndHydrate, gotoAndHydrate, reloadAndHydrate, resetDatabase } from './helpers'

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
  await actAndHydrate(page, async () => {
    await page.getByRole('button', { name: 'Send to CFE Review' }).click()
  })
  const createResponse = await createResponsePromise
  const createBody = (await createResponse.json()) as { request: { id: string } }
  const requestId = createBody.request.id

  await expect(page.getByText('Request sent to CFE review')).toBeVisible()

  const founderCard = page
    .getByText(uniqueChallenge, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-3xl") and contains(@class,"border")][1]')
  await expect(founderCard).toBeVisible()
  await expect(founderCard).toContainText('cfe review')
  await expect(founderCard).toContainText('3 attached items')

  await gotoAndHydrate(page, '/cfe')
  const queuedCard = page
    .getByText(uniqueChallenge, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-3xl") and contains(@class,"border")][1]')
  await expect(queuedCard).toBeVisible()
  await expect(queuedCard).toContainText(requestId)
  await actAndHydrate(page, async () => {
    await queuedCard.getByRole('button', { name: 'Approve' }).click()
  })

  await gotoAndHydrate(page, '/founders')
  await reloadAndHydrate(page)

  const approvedFounderCard = page
    .getByText(uniqueChallenge, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-3xl") and contains(@class,"border")][1]')
  await expect(approvedFounderCard).toContainText('awaiting mentor')
})
