import { db } from './index'
import { units, locations, services, priorities, users, floors, rooms } from './schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

async function runSeed() {
  console.log('🌱 Iniciando carga de dados (seed)...')

  // 1. Cria ou Atualiza Unidade Padrão
  let [unit] = await db.select().from(units).where(eq(units.code, 'MATRIZ')).limit(1)

  if (!unit) {
    const [created] = await db.insert(units).values({
      code: 'MATRIZ',
      name: 'Unidade Central Matriz',
      subtitle: 'Centro Integrado de Atendimento ao Cidadão',
      logoUrl: '',
      active: true,
      timezone: 'America/Sao_Paulo'
    }).returning()
    unit = created
  } else {
    await db.update(units).set({
      subtitle: 'Centro Integrado de Atendimento ao Cidadão'
    }).where(eq(units.id, unit.id))
  }

  const unitId = unit.id

  // 2. Cria Andares da Unidade
  let [floorTerreo] = await db.select().from(floors).where(eq(floors.unitId, unitId)).limit(1)
  if (!floorTerreo) {
    const [f0] = await db.insert(floors).values({
      unitId,
      name: 'Térreo',
      number: 0,
      active: true
    }).returning()
    floorTerreo = f0

    await db.insert(floors).values({
      unitId,
      name: '1º Andar',
      number: 1,
      active: true
    })
  }

  // 3. Cria Salas da Unidade vinculadas ao Andar
  let [roomGeneral] = await db.select().from(rooms).where(eq(rooms.unitId, unitId)).limit(1)
  if (!roomGeneral) {
    const [r1] = await db.insert(rooms).values({
      unitId,
      floorId: floorTerreo.id,
      name: 'Salão de Atendimento Geral',
      number: '101',
      active: true
    }).returning()
    roomGeneral = r1

    await db.insert(rooms).values({
      unitId,
      floorId: floorTerreo.id,
      name: 'Sala de Triagem e Documentação',
      number: '102',
      active: true
    })
  }

  // 4. Cria Prioridades Padrão (Normal, Prioritário, Idoso 80+, PCD)
  const priorityList = [
    { name: 'Normal', description: 'Atendimento convencional por ordem de chegada', weight: 1, colorHex: '#06B6D4' },
    { name: 'Prioritário', description: 'Idosos 60+, gestantes, lactantes e pessoas com crianças de colo', weight: 2, colorHex: '#F59E0B' },
    { name: 'Prioridade Especial (80+ / PCD)', description: 'Idosos acima de 80 anos e pessoas com deficiência grave', weight: 3, colorHex: '#F43F5E' }
  ]

  for (const p of priorityList) {
    await db.insert(priorities).values(p).onConflictDoNothing({ target: priorities.name })
  }

  // 5. Cria Serviços Básicos
  const serviceList = [
    { unitId, name: 'Atendimento Geral', prefix: 'A', weight: 1 },
    { unitId, name: 'Caixa / Pagamentos', prefix: 'CX', weight: 1 },
    { unitId, name: 'Atendimento Prioritário', prefix: 'P', weight: 2 },
    { unitId, name: 'Triagem & Documentação', prefix: 'DOC', weight: 1 }
  ]

  for (const s of serviceList) {
    await db.insert(services).values(s).onConflictDoNothing()
  }

  // 6. Cria Locais de Chamada (Guichês e Mesas vinculados à Sala)
  for (let i = 1; i <= 6; i++) {
    await db.insert(locations).values({
      unitId,
      roomId: roomGeneral.id,
      name: i <= 3 ? 'Guichê' : 'Mesa',
      number: i,
      active: true
    }).onConflictDoNothing()
  }

  // 7. Cria Usuário Administrador Padrão e Atendente de Teste
  const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'rakell17', 10)
  const attendantPasswordHash = await bcrypt.hash('atendente123', 10)

  await db.insert(users).values({
    name: 'Administrador do Sistema',
    email: process.env.EMAIL_ADDRESS || 'emmanuelcdasilva@gmail.com',
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    active: true
  }).onConflictDoNothing()

  await db.insert(users).values({
    name: 'Atendente Operador',
    email: 'atendente@painelnext.com',
    passwordHash: attendantPasswordHash,
    role: 'ATTENDANT',
    active: true
  }).onConflictDoNothing()

  const triagePasswordHash = await bcrypt.hash('triagem123', 10)
  await db.insert(users).values({
    name: 'Operador de Triagem',
    email: 'triagem@painelnext.com',
    passwordHash: triagePasswordHash,
    role: 'TRIAGE',
    active: true
  }).onConflictDoNothing()

  console.log('✅ Seed executado com sucesso!')
  process.exit(0)
}

runSeed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
