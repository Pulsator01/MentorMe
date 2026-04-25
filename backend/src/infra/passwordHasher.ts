import argon2 from 'argon2'

export interface PasswordHasher {
  hash(plain: string): Promise<string>
  verify(hash: string, plain: string): Promise<boolean>
}

const argonOptions: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
}

export const createArgon2PasswordHasher = (): PasswordHasher => ({
  async hash(plain: string) {
    return await argon2.hash(plain, argonOptions)
  },
  async verify(hash: string, plain: string) {
    if (!hash) {
      return false
    }
    try {
      return await argon2.verify(hash, plain)
    } catch {
      return false
    }
  },
})
