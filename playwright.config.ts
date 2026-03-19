import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from '@playwright/test'

const loadEnvFile = (filename: string) => {
  if (!fs.existsSync(filename)) {
    return {}
  }

  return Object.fromEntries(
    fs
      .readFileSync(filename, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=')
        const key = line.slice(0, separatorIndex).trim()
        const rawValue = line.slice(separatorIndex + 1).trim()
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue

        return [key, value]
      }),
  )
}

const localEnv = loadEnvFile(path.resolve('.env'))
const sharedEnv = {
  ...localEnv,
  ...process.env,
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    viewport: { width: 1440, height: 960 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    channel: 'chrome',
  },
  webServer: [
    {
      command: 'tsx backend/src/server.ts',
      url: 'http://127.0.0.1:3001/docs/json',
      reuseExistingServer: true,
      env: {
        ...sharedEnv,
        API_PORT: '3001',
        EXPOSE_DEBUG_TOKENS: 'true',
      },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
    {
      command: 'vite --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      env: {
        ...sharedEnv,
        VITE_API_BASE_URL: 'http://127.0.0.1:3001',
      },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
  ],
})
