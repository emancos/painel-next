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
  // Garante a tabela de migrações do Drizzle
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle;`
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
  `

  // Verifica se o banco já possuía tabelas legadas antes do migrator
  const [dailyCountersCheck] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'daily_counters'
    );
  `

  if (dailyCountersCheck?.exists) {
    // 0000_lame_swordsman (1792596949071)
    await sql`
      INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
      SELECT '4aea18cd38ee44bf5f2d387e2f0cdaa2c8ce5ba5c5dfe2f27c4574e13e615dcd', 1792596949071
      WHERE NOT EXISTS (
        SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1792596949071
      );
    `

    // Verifica se floors (0001_dashing_changeling - 1792600571095) já existia
    const [floorsCheck] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'floors'
      );
    `

    if (floorsCheck?.exists) {
      await sql`
        INSERT INTO drizzle.__drizzle_migrations ("hash", "created_at")
        SELECT '1fb691c57411bad36ed129ebb1d784b680e3f8ba6d93c8a0788845782a17fdb0', 1792600571095
        WHERE NOT EXISTS (
          SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1792600571095
        );
      `
    }
  }

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

