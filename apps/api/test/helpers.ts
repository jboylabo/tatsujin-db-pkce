import { createHash } from 'node:crypto'
import { createDb, schema } from '@tatsujin/db'
import { eq } from 'drizzle-orm'
import { createApp } from '../src/app.ts'
import { loadConfig } from '../src/config.ts'
import { newSessionToken, sha256Hex } from '../src/lib/crypto.ts'
import type { FlowChecks, OidcService } from '../src/oidc.ts'

export const cfg = loadConfig()
export const { db, client } = createDb(cfg.DATABASE_URL)
export const ORIGIN = new URL(cfg.APP_ORIGIN).origin

// seed.ts と realm.json のテストユーザー
export const ALICE = { sub: '11111111-1111-4111-8111-111111111111', company: 'ACME' }
export const BOB = { sub: '22222222-2222-4222-8222-222222222222', company: 'GLOBEX' }

/**
 * IdP の代役。実IdPと同様に PKCE(S256)・state・nonce を検証する。
 * codeVerifier から計算した challenge が、認可リクエスト時の challenge と一致しなければ失敗。
 */
export function createFakeOidc() {
  const challenges = new Map<string, string>() // code -> code_challenge
  let nextSubject = ALICE.sub
  const s256 = (v: string) => createHash('sha256').update(v).digest('base64url')

  const oidc: OidcService = {
    async createFlow() {
      const flow = {
        codeVerifier: `verifier-${Math.random()}`.padEnd(43, 'x'),
        state: crypto.randomUUID(),
        nonce: crypto.randomUUID(),
      }
      const code = crypto.randomUUID()
      challenges.set(code, s256(flow.codeVerifier))
      return { ...flow, url: `${cfg.OIDC_ISSUER}/auth?code=${code}&state=${flow.state}` }
    },
    async exchange(callbackUrl: URL, checks: FlowChecks) {
      if (callbackUrl.searchParams.get('state') !== checks.state) throw new Error('state mismatch')
      const challenge = challenges.get(callbackUrl.searchParams.get('code') ?? '')
      if (!challenge || challenge !== s256(checks.codeVerifier)) throw new Error('pkce mismatch')
      return {
        issuer: cfg.OIDC_ISSUER,
        subject: nextSubject,
        email: 'x@example.com',
        idToken: 'fake.id.token',
      }
    },
    async endSessionUrl(idToken) {
      return `${cfg.OIDC_ISSUER}/logout?id_token_hint=${idToken ?? ''}`
    },
  }
  return {
    oidc,
    challenges,
    setSubject: (s: string) => {
      nextSubject = s
    },
  }
}

export function buildApp(oidc: OidcService = createFakeOidc().oidc) {
  return createApp({ db, oidc, cfg })
}

/** 指定 sub のユーザーとして DB にセッションを直接作り、Cookie ヘッダを返す */
export async function loginAs(sub: string, expiresAt = new Date(Date.now() + 3600_000)) {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.oidcSubject, sub))
  if (!user) throw new Error('seed を先に実行してください')
  const token = newSessionToken()
  await db.insert(schema.sessions).values({ id: sha256Hex(token), userId: user.id, expiresAt })
  return { cookie: `sid=${token}`, token }
}

export const jsonHeaders = (cookie: string) => ({
  cookie,
  origin: ORIGIN,
  'content-type': 'application/json',
})
