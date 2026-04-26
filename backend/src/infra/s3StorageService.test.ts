// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { S3Client } from '@aws-sdk/client-s3'
import { createS3StorageService, S3StorageService } from './s3StorageService'

const baseOptions = {
  accessKeyId: 'AKIATESTACCESS',
  secretAccessKey: 'test-secret-access-key',
  region: 'auto',
  endpoint: 'https://account.r2.cloudflarestorage.com',
  bucket: 'mentorme-uploads',
}

describe('S3StorageService', () => {
  it('throws if bucket is missing', () => {
    expect(() => new S3StorageService({ ...baseOptions, bucket: '' })).toThrow(/bucket/)
  })

  it('throws if credentials are missing', () => {
    expect(() => new S3StorageService({ ...baseOptions, accessKeyId: '' })).toThrow(/accessKeyId/)
    expect(() => new S3StorageService({ ...baseOptions, secretAccessKey: '' })).toThrow(/secretAccessKey/)
  })

  it('throws if region is missing', () => {
    expect(() => new S3StorageService({ ...baseOptions, region: '' })).toThrow(/region/)
  })

  it('produces an https presigned PUT URL that targets the configured bucket and key', async () => {
    const service = createS3StorageService(baseOptions)

    const { uploadUrl } = await service.createPresignedUpload({
      requestId: 'req-123',
      filename: 'pitch-deck.pdf',
      contentType: 'application/pdf',
      sizeBytes: 524_288,
      storageKey: 'requests/req-123/uploads/pitch-deck.pdf',
    })

    expect(uploadUrl).toMatch(/^https:\/\/account\.r2\.cloudflarestorage\.com\//)
    expect(uploadUrl).toContain('mentorme-uploads/requests/req-123/uploads/pitch-deck.pdf')
    expect(uploadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256')
    expect(uploadUrl).toContain('X-Amz-Expires=900')
    expect(uploadUrl).toContain('X-Amz-Signature=')
  })

  it('honors a custom presign TTL', async () => {
    const service = new S3StorageService({ ...baseOptions, presignTtlSeconds: 60 })

    const { uploadUrl } = await service.createPresignedUpload({
      requestId: 'req-1',
      filename: 'a.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
      storageKey: 'requests/req-1/a.pdf',
    })

    expect(uploadUrl).toContain('X-Amz-Expires=60')
  })

  it('respects an injected S3Client (used for sharing config in tests/runtime)', async () => {
    const client = new S3Client({
      region: 'us-east-1',
      credentials: { accessKeyId: 'AKIA1', secretAccessKey: 'secret1' },
    })
    const service = new S3StorageService({ ...baseOptions, region: 'us-east-1', endpoint: undefined, client })

    const { uploadUrl } = await service.createPresignedUpload({
      requestId: 'req-9',
      filename: 'doc.pdf',
      contentType: 'application/pdf',
      sizeBytes: 10,
      storageKey: 'requests/req-9/doc.pdf',
    })

    expect(uploadUrl).toMatch(/mentorme-uploads.*requests\/req-9\/doc\.pdf/)
    expect(uploadUrl).toContain('X-Amz-Signature=')
    service.destroy()
  })

  it('resolves a public URL when publicBaseUrl is configured', () => {
    const service = new S3StorageService({
      ...baseOptions,
      publicBaseUrl: 'https://uploads.mentorme.test/',
    })

    expect(service.resolvePublicUrl('requests/req-1/a.pdf')).toBe(
      'https://uploads.mentorme.test/requests/req-1/a.pdf',
    )
  })

  it('returns undefined for public URL when publicBaseUrl is not configured', () => {
    const service = new S3StorageService(baseOptions)
    expect(service.resolvePublicUrl('requests/req-1/a.pdf')).toBeUndefined()
  })
})
