import { schema } from '@tatsujin/db'
import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { decrypt, encrypt, sha256Hex } from '../src/lib/crypto.ts'
import {
  ALICE,
  BOB,
  buildApp,
  cfg,
  client,
  createFakeOidc,
  db,
  loginAs,
  ORIGIN,
} from './helpers.ts'

afterAll(() => client.end())

/** Set-Cookie 群から name=value を取り出す */
function cookieValue(res: Response, name: string) {
  const line = res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`))
  return line?.split(';')[0]?.slice(name.length + 1)
}

async function startLogin(fake = createFakeOidc()) {
  const app = buildApp(fake.oidc)
  const res = await app.request('/auth/login')
  const flowCookie = cookieValue(res, 'oidc_flow')
  const location = new URL(res.headers.get('location') ?? '')
  return { app, fake, res, flowCookie, location }
}

describe('GET /auth/login', () => {
  it('IdPへリダイレクトし、フロー情報を暗号化HttpOnly Cookieに保存する', async () => {
    const { res, flowCookie } = await startLogin()
    expect(res.status).toBe(302)
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith('oidc_flow='))
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    expect(setCookie).toMatch(/Max-Age=600/i)
    const plain = decrypt(flowCookie ?? '', cfg.COOKIE_SECRET)
    expect(JSON.parse(plain ?? '{}')).toHaveProperty('codeVerifier')
    // 平文のverifierがCookieに露出していない
    expect(flowCookie).not.toContain('verifier')
  })
})

describe('GET /auth/callback', () => {
  it('正常系: セッションを発行しDBにはハッシュのみ保存する', async () => {
    const { app, flowCookie, location } = await startLogin()
    const res = await app.request(
      `/auth/callback?code=${location.searchParams.get('code')}&state=${location.searchParams.get('state')}`,
      { headers: { cookie: `oidc_flow=${flowCookie}` } },
    )
    expect(res.status).toBe(302)
    const token = cookieValue(res, 'sid') ?? ''
    expect(token.length).toBeGreaterThanOrEqual(43) // 32バイト base64url
    const sidLine = res.headers.getSetCookie().find((c) => c.startsWith('sid='))
    expect(sidLine).toMatch(/HttpOnly/i)
    expect(sidLine).toMatch(/SameSite=Lax/i)
    expect(sidLine).not.toMatch(/Secure/i) // 開発時のみ非Secure
    const rows = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sha256Hex(token)))
    expect(rows).toHaveLength(1)
    const raw = await db.select().from(schema.sessions).where(eq(schema.sessions.id, token))
    expect(raw).toHaveLength(0)
  })

  it('state が一致しない場合は401でセッションを作らない', async () => {
    const { app, flowCookie, location } = await startLogin()
    const res = await app.request(
      `/auth/callback?code=${location.searchParams.get('code')}&state=tampered`,
      {
        headers: { cookie: `oidc_flow=${flowCookie}` },
      },
    )
    expect(res.status).toBe(401)
    expect(cookieValue(res, 'sid')).toBeUndefined()
  })

  it('PKCE検証失敗(別フローのcode)は401', async () => {
    const a = await startLogin()
    const b = await startLogin(a.fake)
    // フローAのCookie(verifier A)で、フローBのcode(challenge B)を交換しようとする
    const res = await a.app.request(
      `/auth/callback?code=${b.location.searchParams.get('code')}&state=${a.location.searchParams.get('state')}`,
      { headers: { cookie: `oidc_flow=${a.flowCookie}` } },
    )
    expect(res.status).toBe(401)
  })

  it('フローCookieなし/改ざんは400', async () => {
    const { app, flowCookie, location } = await startLogin()
    const q = `?code=${location.searchParams.get('code')}&state=${location.searchParams.get('state')}`
    expect((await app.request(`/auth/callback${q}`)).status).toBe(400)
    const tampered = `${flowCookie?.slice(0, -2)}AA`
    const res = await app.request(`/auth/callback${q}`, {
      headers: { cookie: `oidc_flow=${tampered}` },
    })
    expect(res.status).toBe(400)
  })

  it('users に未登録の (iss, sub) は403', async () => {
    const fake = createFakeOidc()
    fake.setSubject('99999999-9999-4999-8999-999999999999')
    const { app, flowCookie, location } = await startLogin(fake)
    const res = await app.request(
      `/auth/callback?code=${location.searchParams.get('code')}&state=${location.searchParams.get('state')}`,
      { headers: { cookie: `oidc_flow=${flowCookie}` } },
    )
    expect(res.status).toBe(403)
    expect(cookieValue(res, 'sid')).toBeUndefined()
  })
})

describe('POST /auth/logout', () => {
  it('Originが違えば403', async () => {
    const app = buildApp()
    const res = await app.request('/auth/logout', {
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    })
    expect(res.status).toBe(403)
  })

  it('セッションを削除し、id_token_hint付きでend_sessionへリダイレクト', async () => {
    const { cookie, token } = await loginAs(ALICE.sub)
    const idt = encrypt('my.id.token', cfg.COOKIE_SECRET)
    const res = await buildApp().request('/auth/logout', {
      method: 'POST',
      headers: { cookie: `${cookie}; oidc_idt=${idt}`, origin: ORIGIN },
    })
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toContain('id_token_hint=my.id.token')
    const rows = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sha256Hex(token)))
    expect(rows).toHaveLength(0)
  })
})

describe('認証ミドルウェア', () => {
  it('Cookieなし・不正トークン・期限切れは401', async () => {
    const app = buildApp()
    expect((await app.request('/api/me')).status).toBe(401)
    expect((await app.request('/api/me', { headers: { cookie: 'sid=bogus' } })).status).toBe(401)
    const expired = await loginAs(BOB.sub, new Date(Date.now() - 1000))
    expect((await app.request('/api/me', { headers: { cookie: expired.cookie } })).status).toBe(401)
  })
})
