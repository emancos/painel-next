import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL || 'postgresql://painel_next:painel_next_secret_pwd@localhost:5432/painel_next'

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const client = globalForDb.conn ?? postgres(connectionString, { max: 20 })
if (process.env.NODE_ENV !== 'production') globalForDb.conn = client

export const db = drizzle(client, { schema })
