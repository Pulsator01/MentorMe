import { type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { resetAndSeedDatabase } from '../backend/prisma/seedData'

export const resetDatabase = async () => {
  const prisma = new PrismaClient()

  try {
    await resetAndSeedDatabase(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

const isApiPath = (url: string, pathname: string) => {
  try {
    return new URL(url).pathname === pathname
  } catch {
    return false
  }
}

const isRequestListPath = (url: string) => {
  try {
    const pathname = new URL(url).pathname
    return pathname === '/requests' || /^\/ventures\/[^/]+\/requests$/.test(pathname)
  } catch {
    return false
  }
}

export const gotoAndHydrate = async (page: Page, pathname: string) => {
  const hydration = waitForRouteHydration(page)

  await page.goto(pathname)
  await hydration
}

export const reloadAndHydrate = async (page: Page) => {
  const hydration = waitForRouteHydration(page)

  await page.reload()
  await hydration
}

export const actAndHydrate = async (page: Page, action: () => Promise<void>) => {
  const hydration = waitForStateSync(page)

  await action()
  await hydration
}

const waitForRouteHydration = (page: Page) => {
  const verifyResponse = page.waitForResponse((response) => isApiPath(response.url(), '/auth/magic-link/verify') && response.status() === 200)
  const stateSync = waitForStateSync(page)

  return Promise.all([verifyResponse, stateSync])
}

const waitForStateSync = (page: Page) => {
  const venturesResponse = page.waitForResponse((response) => isApiPath(response.url(), '/ventures') && response.status() === 200)
  const requestsResponse = page.waitForResponse((response) => isRequestListPath(response.url()) && response.status() === 200)
  const mentorsResponse = page.waitForResponse((response) => isApiPath(response.url(), '/mentors') && response.status() === 200)

  return Promise.all([venturesResponse, requestsResponse, mentorsResponse])
}
