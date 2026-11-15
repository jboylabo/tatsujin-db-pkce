import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDb } from './index.ts'

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required')

const { db, client } = createDb(url)
await migrate(db, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) })
await client.end()
console.log('migrated')
