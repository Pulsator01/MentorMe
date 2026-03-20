import { test, expect } from '@playwright/test'
import { gotoAndHydrate, resetDatabase } from './helpers'

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
  await page.getByRole('button', { name: 'Add mentor' }).click()
  const createMentorResponse = await createMentorResponsePromise
  await createMentorResponse.json()
  const mentorCard = page
    .getByRole('heading', { name: 'Aditi Rao', exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-3xl") and contains(@class,"border")][1]')

  await expect(mentorCard).toBeVisible()
  await expect(mentorCard).toContainText('Aditi Rao')
  await expect(mentorCard).toContainText('Active')

  await mentorCard.getByRole('button', { name: 'Pause visibility' }).click()
  await expect(mentorCard).toContainText('Paused')

  await mentorCard.getByRole('button', { name: 'Re-activate' }).click()
  await expect(mentorCard).toContainText('Active')
})

test('mentor can complete a secure outreach flow and CFE sees the updates live', async ({ browser, page }) => {
  await gotoAndHydrate(page, '/cfe')

  const awaitingCard = page.getByTestId('request-card-req-003')
  await expect(awaitingCard).toBeVisible()

  await awaitingCard.getByRole('button', { name: 'Create mentor link' }).click()
  await expect(page.getByText(/secure mentor link created for medimesh labs/i)).toBeVisible()
  const mentorLink = await page.getByRole('link', { name: 'Open secure mentor desk' }).getAttribute('href')
  if (!mentorLink) {
    throw new Error('Secure mentor desk link was not created')
  }

  const mentorPage = await browser.newPage()
  await mentorPage.goto(mentorLink)
  await expect(mentorPage.getByRole('heading', { name: 'Review one vetted request without the admin clutter.' })).toBeVisible()
  await expect(mentorPage.getByRole('heading', { name: 'MediMesh Labs' }).first()).toBeVisible()

  await mentorPage.getByRole('button', { name: 'Accept request' }).click()
  await expect(mentorPage.getByText(/request accepted\. you can share a slot now\./i)).toBeVisible()

  await mentorPage.getByLabel('Meeting link').fill('https://calendly.com/radhika/demo-session')
  await mentorPage.getByLabel('Meeting slot').fill('2026-03-25T15:30')
  await mentorPage.getByRole('button', { name: 'Share slot' }).click()

  await expect(page.getByTestId('kanban-column-scheduled')).toContainText('REQ-003')

  await mentorPage
    .getByLabel('Mentor notes')
    .fill('Tighten the hospital pilot risk checklist and define one success metric before the next pilot.')
  await mentorPage.getByRole('button', { name: 'Save feedback' }).click()

  await expect(page.getByTestId('kanban-column-follow_up')).toContainText('REQ-003')

  const followUpCard = page.getByTestId('request-card-req-003')
  await followUpCard.getByRole('button', { name: 'Close request' }).click()
  await expect(page.getByTestId('request-card-req-003')).toHaveCount(0)

  await mentorPage.close()
})
