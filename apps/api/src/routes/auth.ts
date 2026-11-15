import { type Db, schema } from '@tatsujin/db'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Config } from '../config.ts'
import { decrypt, encrypt, newSessionToken, sha256Hex } from '../lib/crypto.ts'
import { originGuard, SESSION_COOKIE } from '../middleware.ts'
import type { OidcService } from '../oidc.ts'

const FLOW_COOKIE = 'oidc_flow'
const IDTOKEN_COOKIE = 'oidc_idt'
const FLOW_TTL_SEC = 10 * 60
const SESSION_TTL_SEC = 8 * 60 * 60

export function authRoutes(deps: { db: Db; oidc: OidcService; cfg: Config }) {
  const { db, oidc, cfg } = deps
  const secure = cfg.NODE_ENV === 'production'
  const base = { httpOnly: true, sameSite: 'Lax' as const, secure }
  const app = new Hono()

  app.get('/login', async (c) => {
    const flow = await oidc.createFlow()
    const payload = JSON.stringify({
      codeVerifier: flow.codeVerifier,
      state: flow.state,
      nonce: flow.nonce,
    })
    setCookie(c, FLOW_COOKIE, encrypt(payload, cfg.COOKIE_SECRET), {
      ...base,
      path: '/auth',
      maxAge: FLOW_TTL_SEC,
    })
    return c.redirect(flow.url)
  })

  app.get('/callback', async (c) => {
    const raw = getCookie(c, FLOW_COOKIE)
    // フロー用Cookieは一度きり
    deleteCookie(c, FLOW_COOKIE, { path: '/auth' })
    const plain = raw ? decrypt(raw, cfg.COOKIE_SECRET) : null
    if (!plain) return c.json({ error: 'invalid login flow' }, 400)
    const checks = JSON.parse(plain) as { codeVerifier: string; state: string; nonce: string }

    // redirect_uri を正とし、IdPから受け取ったクエリのみ引き継ぐ
    const callbackUrl = new URL(cfg.OIDC_REDIRECT_URI)
    callbackUrl.search = new URL(c.req.url).search

    let identity: Awaited<ReturnType<OidcService['exchange']>>
    try {
      identity = await oidc.exchange(callbackUrl, checks)
    } catch {
      // state / PKCE / nonce / ID Token 検証の失敗
      return c.json({ error: 'authentication failed' }, 401)
    }

    const [user] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(
        and(
          eq(schema.users.oidcIssuer, identity.issuer),
          eq(schema.users.oidcSubject, identity.subject),
        ),
      )
    if (!user) return c.json({ error: 'user not registered' }, 403)

    const token = newSessionToken()
    await db.insert(schema.sessions).values({
      id: sha256Hex(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_SEC * 1000),
    })
    setCookie(c, SESSION_COOKIE, token, { ...base, path: '/', maxAge: SESSION_TTL_SEC })
    setCookie(c, IDTOKEN_COOKIE, encrypt(identity.idToken, cfg.COOKIE_SECRET), {
      ...base,
      path: '/auth',
      maxAge: SESSION_TTL_SEC,
    })
    return c.redirect(cfg.APP_ORIGIN)
  })

  app.post('/logout', originGuard(cfg), async (c) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256Hex(token)))
    const rawIdt = getCookie(c, IDTOKEN_COOKIE)
    const idToken = rawIdt ? (decrypt(rawIdt, cfg.COOKIE_SECRET) ?? undefined) : undefined
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    deleteCookie(c, IDTOKEN_COOKIE, { path: '/auth' })
    return c.redirect(await oidc.endSessionUrl(idToken), 303)
  })

  return app
}
