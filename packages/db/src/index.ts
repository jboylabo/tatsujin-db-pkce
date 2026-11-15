import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.ts'

export * from './schema.ts'
export { schema }

export function createDb(url: string) {
  const client = postgres(url)
  const db = drizzle(client, { schema })
  return { db, client }
}

export type Db = ReturnType<typeof createDb>['db']
