import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageService } from '../domain/interfaces'

export type S3StorageServiceOptions = {
  accessKeyId: string
  bucket: string
  endpoint?: string
  forcePathStyle?: boolean
  presignTtlSeconds?: number
  publicBaseUrl?: string
  region: string
  secretAccessKey: string
  client?: S3Client
}

const DEFAULT_PRESIGN_TTL_SECONDS = 15 * 60

const buildPublicUrl = (publicBaseUrl: string, key: string): string => {
  const trimmedBase = publicBaseUrl.replace(/\/$/, '')
  const trimmedKey = key.replace(/^\//, '')
  return `${trimmedBase}/${trimmedKey}`
}

export class S3StorageService implements StorageService {
  private readonly bucket: string
  private readonly client: S3Client
  private readonly presignTtlSeconds: number
  private readonly publicBaseUrl?: string

  constructor(options: S3StorageServiceOptions) {
    if (!options.bucket) {
      throw new Error('S3 storage service requires bucket')
    }
    if (!options.accessKeyId || !options.secretAccessKey) {
      throw new Error('S3 storage service requires accessKeyId and secretAccessKey')
    }
    if (!options.region) {
      throw new Error('S3 storage service requires region')
    }

    this.bucket = options.bucket
    this.presignTtlSeconds = options.presignTtlSeconds ?? DEFAULT_PRESIGN_TTL_SECONDS
    this.publicBaseUrl = options.publicBaseUrl

    this.client =
      options.client ||
      new S3Client({
        region: options.region,
        endpoint: options.endpoint,
        forcePathStyle: options.forcePathStyle ?? Boolean(options.endpoint),
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
      })
  }

  async createPresignedUpload(input: {
    requestId: string
    filename: string
    contentType: string
    sizeBytes: number
    storageKey: string
  }): Promise<{ uploadUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.storageKey,
      ContentType: input.contentType,
      ContentLength: input.sizeBytes,
      Metadata: {
        'mentorme-request-id': input.requestId,
        'mentorme-filename': encodeURIComponent(input.filename),
      },
    })

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: this.presignTtlSeconds })
    return { uploadUrl }
  }

  resolvePublicUrl(storageKey: string): string | undefined {
    if (!this.publicBaseUrl) {
      return undefined
    }
    return buildPublicUrl(this.publicBaseUrl, storageKey)
  }

  destroy(): void {
    this.client.destroy()
  }
}

export const createS3StorageService = (options: S3StorageServiceOptions): S3StorageService =>
  new S3StorageService(options)
