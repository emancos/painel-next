import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ ERRO: DATABASE_URL não definida nas variáveis de ambiente.')
  process.exit(1)
}

console.log('🔄 Conectando ao PostgreSQL para executar migrações Drizzle...')
const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql)

try {
  console.log('📦 Aplicando migrações da pasta ./drizzle/migrations...')
  await migrate(db, { migrationsFolder: './drizzle/migrations' })
  console.log('✅ Todas as migrações foram aplicadas com sucesso!')
} catch (err) {
  console.error('❌ Erro ao aplicar migrações:', err)
  process.exit(1)
} finally {
  await sql.end()
}

process.exit(0)
