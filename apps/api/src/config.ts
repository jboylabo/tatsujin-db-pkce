import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  OIDC_ISSUER: z.url(),
  OIDC_CLIENT_ID: z.string().min(1),
  OIDC_CLIENT_SECRET: z.string().min(1),
  OIDC_REDIRECT_URI: z.url(),
  OIDC_POST_LOGOUT_REDIRECT_URI: z.url(),
  APP_ORIGIN: z.url(),
  COOKIE_SECRET: z.string().regex(/^[0-9a-fA-F]{64}$/, '32バイトのhex(64文字)が必要'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default('development'),
})

export type Config = z.infer<typeof schema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return schema.parse(env)
}
