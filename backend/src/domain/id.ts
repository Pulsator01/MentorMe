import { createHash, randomBytes } from 'node:crypto'

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export const randomToken = () => randomBytes(24).toString('hex')

export const nowIso = () => new Date().toISOString()

export const futureIso = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

export const nextPrefixedId = (prefix: string, existingIds: string[]) => {
  const numbers = existingIds
    .map((id) => id.replace(`${prefix}-`, ''))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

export const artifactStorageKey = (requestId: string, filename: string) =>
  `${requestId}/${Date.now()}-${filename.replace(/\s+/g, '-').toLowerCase()}`
