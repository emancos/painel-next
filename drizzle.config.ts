import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://painel_next:painel_next_secret_pwd@localhost:5432/painel_next'
  },
  verbose: true,
  strict: true
})
