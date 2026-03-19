import { test, expect } from '@playwright/test'
import { actAndHydrate, gotoAndHydrate, resetDatabase } from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async () => {
  await resetDatabase()
})

test('cfe can add and pause a mentor from the mentor network UI', async ({ page }) => {
  await gotoAndHydrate(page, '/cfe/network')
  await expect(page.getByRole('heading', { name: 'Keep the mentor directory controlled and easy to operate.' })).toBeVisible()

  await page.getByLabel('Name').fill('Aditi Rao')
  await page.getByLabel('Title').fill('Pilot operations mentor')
  await page.getByLabel('Focus areas (comma separated)').fill('Pilot design, Operations')
  await page.getByLabel('Domains (comma separated)').fill('Climate, Deeptech')
  await page.getByLabel('Stages').fill('MVP, Pilot')
  await page.getByLabel('Monthly capacity').fill('4')
  await page.getByLabel('Bio').fill('Helps founders turn messy pilot goals into operating plans that CFE can actually route.')
  const createMentorResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/mentors') &&
      response.status() === 201,
  )
  await actAndHydrate(page, async () => {
    await page.getByRole('button', { name: 'Add mentor' }).click()
  })
  const createMentorResponse = await createMentorResponsePromise
  await createMentorResponse.json()
  const mentorCard = page
    .getByRole('heading', { name: 'Aditi Rao', exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-3xl") and contains(@class,"border")][1]')

  await expect(mentorCard).toBeVisible()
  await expect(mentorCard).toContainText('Aditi Rao')
  await expect(mentorCard).toContainText('Active')

  await actAndHydrate(page, async () => {
    await mentorCard.getByRole('button', { name: 'Pause visibility' }).click()
  })
  await expect(mentorCard).toContainText('Paused')

  await actAndHydrate(page, async () => {
    await mentorCard.getByRole('button', { name: 'Re-activate' }).click()
  })
  await expect(mentorCard).toContainText('Active')
})
