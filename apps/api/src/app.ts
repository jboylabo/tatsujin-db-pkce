import type { Db } from '@tatsujin/db'
import { Hono } from 'hono'
import type { Config } from './config.ts'
import type { OidcService } from './oidc.ts'
import { apiRoutes } from './routes/api.ts'
import { authRoutes } from './routes/auth.ts'

export function createApp(deps: { db: Db; oidc: OidcService; cfg: Config }) {
  const app = new Hono()
  app.route('/auth', authRoutes(deps))
  app.route('/api', apiRoutes(deps))

  app.onError((err, c) => {
    // postgres.js のエラーコード: 23503=FK違反, 23505=一意制約違反
    const code =
      (err as { code?: string; cause?: { code?: string } }).code ??
      (err as { cause?: { code?: string } }).cause?.code
    if (code === '23503' || code === '23505') return c.json({ error: 'conflict' }, 409)
    console.error(err)
    return c.json({ error: 'internal error' }, 500)
  })
  return app
}
