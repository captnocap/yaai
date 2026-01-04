// =============================================================================
// ENCRYPTION
// =============================================================================
// AES-256-GCM encryption for sensitive data (API keys, tokens, credentials).

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { paths } from './paths'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32  // 256 bits
const IV_LENGTH = 16   // 128 bits
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 16

// -----------------------------------------------------------------------------
// Encryption Key Management
// -----------------------------------------------------------------------------

let encryptionKey: Buffer | null = null

/**
 * Initialize or load the encryption key.
 * Called once at application startup.
 * Generates a new key if none exists.
 */
export function initializeEncryption(): void {
  const keyPath = paths.secrets.encryptionKey

  if (existsSync(keyPath)) {
    // Load existing key
    const keyData = readFileSync(keyPath)
    encryptionKey = keyData
  } else {
    // Generate new key
    encryptionKey = randomBytes(KEY_LENGTH)
    writeFileSync(keyPath, encryptionKey, { mode: 0o600 })  // Owner read/write only
  }
}

/**
 * Get the encryption key, initializing if needed.
 */
function getKey(): Buffer {
  if (!encryptionKey) {
    initializeEncryption()
  }
  return encryptionKey!
}

// -----------------------------------------------------------------------------
// Encrypted Data Structure
// -----------------------------------------------------------------------------

export interface EncryptedData {
  encrypted: string  // hex-encoded ciphertext
  iv: string         // hex-encoded initialization vector
  authTag: string    // hex-encoded authentication tag
}

// -----------------------------------------------------------------------------
// Encryption Functions
// -----------------------------------------------------------------------------

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt
 * @returns EncryptedData object with encrypted data, IV, and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  }
}

/**
 * Decrypt an EncryptedData object back to plaintext.
 *
 * @param data - EncryptedData object
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(data: EncryptedData): string {
  const key = getKey()
  const iv = Buffer.from(data.iv, 'hex')
  const authTag = Buffer.from(data.authTag, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// -----------------------------------------------------------------------------
// Convenience Functions for Database Storage
// -----------------------------------------------------------------------------

/**
 * Encrypt a value and return as JSON string for database storage.
 *
 * @param value - The value to encrypt (will be JSON stringified if not string)
 * @returns JSON string of EncryptedData, or null if value is null/undefined
 */
export function encryptForStorage(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const plaintext = typeof value === 'string' ? value : JSON.stringify(value)
  const encrypted = encrypt(plaintext)
  return JSON.stringify(encrypted)
}

/**
 * Decrypt a value from database storage.
 *
 * @param storedValue - JSON string of EncryptedData from database
 * @returns Decrypted string, or null if input is null/undefined
 */
export function decryptFromStorage(storedValue: string | null): string | null {
  if (!storedValue) {
    return null
  }

  try {
    const data = JSON.parse(storedValue) as EncryptedData
    return decrypt(data)
  } catch {
    // If parsing fails, it might be unencrypted legacy data
    // Return as-is for backwards compatibility
    return storedValue
  }
}

/**
 * Decrypt and parse JSON from database storage.
 *
 * @param storedValue - JSON string of EncryptedData from database
 * @returns Parsed JSON object, or null if input is null/undefined
 */
export function decryptJsonFromStorage<T>(storedValue: string | null): T | null {
  const decrypted = decryptFromStorage(storedValue)
  if (!decrypted) {
    return null
  }

  try {
    return JSON.parse(decrypted) as T
  } catch {
    // Not valid JSON, return null
    return null
  }
}

// -----------------------------------------------------------------------------
// Key Derivation (for password-based encryption if needed)
// -----------------------------------------------------------------------------

/**
 * Derive an encryption key from a password using scrypt.
 * Useful for encrypting exports or backups with user password.
 *
 * @param password - User password
 * @param salt - Salt (should be stored with encrypted data)
 * @returns Derived key buffer
 */
export function deriveKeyFromPassword(password: string, salt?: Buffer): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || randomBytes(SALT_LENGTH)
  const key = scryptSync(password, actualSalt, KEY_LENGTH, {
    N: 16384,  // CPU/memory cost parameter
    r: 8,      // Block size parameter
    p: 1       // Parallelization parameter
  })

  return { key, salt: actualSalt }
}

/**
 * Encrypt with a password-derived key.
 */
export function encryptWithPassword(plaintext: string, password: string): {
  encrypted: EncryptedData
  salt: string
} {
  const { key, salt } = deriveKeyFromPassword(password)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return {
    encrypted: {
      encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    },
    salt: salt.toString('hex')
  }
}

/**
 * Decrypt with a password-derived key.
 */
export function decryptWithPassword(
  data: EncryptedData,
  password: string,
  saltHex: string
): string {
  const salt = Buffer.from(saltHex, 'hex')
  const { key } = deriveKeyFromPassword(password, salt)
  const iv = Buffer.from(data.iv, 'hex')
  const authTag = Buffer.from(data.authTag, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  })

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
