import { type Db, schema } from '@tatsujin/db'
import { and, eq, gt } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { Config } from './config.ts'
import { sha256Hex } from './lib/crypto.ts'

export const SESSION_COOKIE = 'sid'

export type AuthUser = { id: string; companyCode: string; role: 'admin' | 'member' }
export type Env = { Variables: { user: AuthUser } }

/** 状態変更系(GET/HEAD/OPTIONS以外)は Origin が APP_ORIGIN と一致しなければ403 */
export const originGuard = (cfg: Config) =>
  createMiddleware(async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      if (c.req.header('origin') !== new URL(cfg.APP_ORIGIN).origin) {
        return c.json({ error: 'forbidden origin' }, 403)
      }
    }
    await next()
  })

export const requireAuth = (db: Db) =>
  createMiddleware<Env>(async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE)
    if (!token) return c.json({ error: 'unauthorized' }, 401)
    const [row] = await db
      .select({
        id: schema.users.id,
        companyCode: schema.users.companyCode,
        role: schema.users.role,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
      .where(
        and(eq(schema.sessions.id, sha256Hex(token)), gt(schema.sessions.expiresAt, new Date())),
      )
    if (!row) return c.json({ error: 'unauthorized' }, 401)
    c.set('user', row)
    await next()
  })
