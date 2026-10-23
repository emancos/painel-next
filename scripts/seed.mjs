import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import bcrypt from 'bcryptjs'
import { pgTable, uuid, varchar, smallint, boolean, timestamp, jsonb, integer } from 'drizzle-orm/pg-core'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ ERRO: DATABASE_URL não definida nas variáveis de ambiente.')
  process.exit(1)
}

const sql = postgres(connectionString, { max: 1 })
const db = drizzle(sql)

// Schemas essenciais para o seed inicial
const units = pgTable('units', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  subtitle: varchar('subtitle', { length: 255 }),
  active: boolean('active').default(true).notNull(),
})

const priorities = pgTable('priorities', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 60 }).notNull(),
  description: varchar('description', { length: 150 }),
  weight: smallint('weight').default(1).notNull(),
  colorHex: varchar('color_hex', { length: 7 }).default('#06B6D4').notNull(),
  active: boolean('active').default(true).notNull(),
})

const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  unitId: uuid('unit_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  prefix: varchar('prefix', { length: 3 }).notNull(),
  weight: smallint('weight').default(1).notNull(),
  active: boolean('active').default(true).notNull(),
})

const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('ATTENDANT').notNull(),
  active: boolean('active').default(true).notNull(),
})

async function runSeed() {
  console.log('🌱 Iniciando carga de dados essenciais (Seed inicial)...')

  // 1. Unidade Central Padrão
  const [unit] = await db.insert(units).values({
    code: 'MATRIZ-01',
    name: 'Unidade Central de Atendimento',
    subtitle: 'Gestão Inteligente de Fila e Chamados',
    active: true,
  }).onConflictDoNothing().returning()

  const unitId = unit?.id

  // 2. Prioridades de Atendimento (Legislação Federal)
  const defaultPriorities = [
    { id: 1, name: 'Normal / Convencional', description: 'Atendimento por ordem de chegada geral', weight: 1, colorHex: '#06B6D4' },
    { id: 2, name: 'Prioritário (Lei 10.048)', description: 'Idosos 60+, gestantes, lactantes, PCD', weight: 2, colorHex: '#10B981' },
    { id: 3, name: 'Prioridade Especial (80+)', description: 'Superprioridade garantida pela Lei 13.466/17', weight: 3, colorHex: '#F59E0B' },
  ]

  for (const prio of defaultPriorities) {
    await db.insert(priorities).values({
      ...prio,
      active: true,
    }).onConflictDoNothing()
  }

  // 3. Serviço inicial se unidade criada
  if (unitId) {
    await db.insert(services).values({
      unitId,
      name: 'Atendimento Geral',
      prefix: 'G',
      weight: 1,
      active: true,
    }).onConflictDoNothing()
  }

  // 4. Usuário Administrador Inicial
  const adminEmail = process.env.EMAIL_ADDRESS || 'admin@integrasistemas.tec.br'
  const rawPassword = process.env.ADMIN_PASSWORD || 'MudeEstaSenha@2026'
  const adminPasswordHash = await bcrypt.hash(rawPassword, 10)

  await db.insert(users).values({
    name: 'Administrador do Sistema',
    email: adminEmail,
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    active: true,
  }).onConflictDoNothing()

  console.log('✅ Seed finalizado com sucesso!')
  console.log(`👤 Usuário Administrador: ${adminEmail}`)
  console.log('🔒 Senha configurada via ADMIN_PASSWORD no .env da VPS')
}

runSeed()
  .catch((err) => {
    console.error('❌ Erro no seed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await sql.end()
    process.exit(0)
  })
