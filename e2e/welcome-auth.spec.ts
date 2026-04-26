import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

test('welcome marketing page renders', async ({ page }) => {
  await page.goto('/welcome')
  await expect(
    page.getByRole('heading', { name: /The operating system for mentor access inside incubators/i }),
  ).toBeVisible()
})

test('sign-in navigation from welcome reaches the login screen', async ({ page }) => {
  await page.goto('/welcome')
  await page.getByRole('link', { name: 'Sign in' }).first().click()
  await expect(page.getByRole('heading', { name: 'Sign in to MentorMe' })).toBeVisible()
  await expect(page.getByLabel('Work email')).toBeVisible()
})
