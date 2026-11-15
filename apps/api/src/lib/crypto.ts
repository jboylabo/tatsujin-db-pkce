import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/** AES-256-GCM。出力は base64url(iv(12) | tag(16) | ciphertext) */
export function encrypt(plain: string, hexKey: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(hexKey, 'hex'), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64url')
}

/** 改ざん・鍵違い・形式不正は null を返す */
export function decrypt(token: string, hexKey: string): string | null {
  try {
    const buf = Buffer.from(token, 'base64url')
    if (buf.length < 29) return null
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(hexKey, 'hex'),
      buf.subarray(0, 12),
    )
    decipher.setAuthTag(buf.subarray(12, 28))
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/** ランダム32バイトのセッショントークン */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url')
}
