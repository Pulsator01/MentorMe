import type { StorageService } from '../domain/interfaces'

export const createStubStorageService = (): StorageService & { presignedUploads: string[] } => {
  const presignedUploads: string[] = []

  return {
    presignedUploads,
    async createPresignedUpload(input) {
      const uploadUrl = `https://storage.mentorme.test/upload/${input.storageKey}?filename=${encodeURIComponent(input.filename)}`
      presignedUploads.push(uploadUrl)
      return { uploadUrl }
    },
  }
}
