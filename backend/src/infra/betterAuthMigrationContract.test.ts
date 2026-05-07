// @vitest-environment node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = join(
  process.cwd(),
  'backend/prisma/migrations/20260508020000_better_auth_schema_contract/migration.sql',
)

const normalizeSql = (sql: string) => sql.replace(/\s+/g, ' ').trim()

describe('Better Auth Prisma migration contract', () => {
  it('reconciles production auth tables with the current Prisma schema without resetting data', () => {
    const sql = normalizeSql(readFileSync(migrationPath, 'utf8'))

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "image" TEXT')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "token" TEXT')
    expect(sql).toContain('UPDATE "Session" SET "token" = "refreshTokenHash"')
    expect(sql).toContain('DELETE FROM "Session" WHERE "token" IS NULL')
    expect(sql).toContain('ALTER COLUMN "token" SET NOT NULL')
    expect(sql).toContain('ALTER COLUMN "refreshTokenHash" DROP NOT NULL')
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key"')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "Account"')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "Verification"')
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key"')
  })
})
