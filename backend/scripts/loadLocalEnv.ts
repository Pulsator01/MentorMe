import fs from 'node:fs'
import path from 'node:path'

/**
 * Minimal KEY=value parser (same semantics as playwright.config.ts) so CLI
 * scripts can pick up DATABASE_URL and friends from repo-root `.env`.
 */
export const loadLocalEnvFile = (filename: string): Record<string, string> => {
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

        return [key, value] as const
      }),
  )
}

export const applyRepoRootEnv = () => {
  const root = path.resolve(process.cwd())
  const fromFile = loadLocalEnvFile(path.join(root, '.env'))
  for (const [key, value] of Object.entries(fromFile)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}
