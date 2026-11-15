import { serve } from '@hono/node-server'
import { createDb } from '@tatsujin/db'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'
import { createOidcService } from './oidc.ts'

const cfg = loadConfig()
const { db } = createDb(cfg.DATABASE_URL)
const app = createApp({ db, oidc: createOidcService(cfg), cfg })

serve({ fetch: app.fetch, port: cfg.PORT }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`)
})
