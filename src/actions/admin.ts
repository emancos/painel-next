'use server'

import { db } from '@/lib/db'
import { units, floors, rooms, locations, users, userUnits, services } from '@/lib/db/schema'
import { eq, asc, desc, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

/**
 * 1. UNIDADES: Listar, Criar e Atualizar
 */
export async function getUnitsList() {
  return db.select().from(units).orderBy(desc(units.createdAt))
}

export async function createUnit(data: {
  code: string
  name: string
  subtitle?: string
  logoUrl?: string
}) {
  const [newUnit] = await db
    .insert(units)
    .values({
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      subtitle: data.subtitle?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      active: true,
    })
    .returning()

  return newUnit
}

export async function updateUnit(unitId: string, data: {
  name: string
  subtitle?: string
  logoUrl?: string
}) {
  const [updated] = await db
    .update(units)
    .set({
      name: data.name.trim(),
      subtitle: data.subtitle?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(units.id, unitId))
    .returning()

  return updated
}

/**
 * 2. ANDARES: Listar, Criar, Atualizar e Remover
 */
export async function getFloorsByUnit(unitId: string) {
  return db
    .select()
    .from(floors)
    .where(eq(floors.unitId, unitId))
    .orderBy(asc(floors.number))
}

export async function createFloor(data: {
  unitId: string
  name: string
  number: number
}) {
  const [newFloor] = await db
    .insert(floors)
    .values({
      unitId: data.unitId,
      name: data.name.trim(),
      number: data.number,
      active: true,
    })
    .returning()

  return newFloor
}

export async function updateFloor(floorId: string, data: {
  name: string
  number: number
}) {
  const [updated] = await db
    .update(floors)
    .set({
      name: data.name.trim(),
      number: data.number,
    })
    .where(eq(floors.id, floorId))
    .returning()

  return updated
}

export async function deleteFloor(floorId: string) {
  // Desvincula salas pertencentes antes de deletar
  await db.update(rooms).set({ floorId: null }).where(eq(rooms.floorId, floorId))
  const [deleted] = await db.delete(floors).where(eq(floors.id, floorId)).returning()
  return deleted
}

/**
 * 3. SALAS: Listar, Criar, Atualizar e Remover
 */
export async function getRoomsByUnit(unitId: string) {
  return db
    .select({
      id: rooms.id,
      name: rooms.name,
      number: rooms.number,
      active: rooms.active,
      floorId: rooms.floorId,
      floorName: floors.name,
    })
    .from(rooms)
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .where(eq(rooms.unitId, unitId))
    .orderBy(asc(rooms.name))
}

export async function createRoom(data: {
  unitId: string
  floorId?: string
  name: string
  number?: string
}) {
  const [newRoom] = await db
    .insert(rooms)
    .values({
      unitId: data.unitId,
      floorId: data.floorId || null,
      name: data.name.trim(),
      number: data.number?.trim() || null,
      active: true,
    })
    .returning()

  return newRoom
}

export async function updateRoom(roomId: string, data: {
  name: string
  number?: string
  floorId?: string
}) {
  const [updated] = await db
    .update(rooms)
    .set({
      name: data.name.trim(),
      number: data.number?.trim() || null,
      floorId: data.floorId || null,
    })
    .where(eq(rooms.id, roomId))
    .returning()

  return updated
}

export async function deleteRoom(roomId: string) {
  // Desvincula mesas/guichês pertencentes antes de deletar
  await db.update(locations).set({ roomId: null }).where(eq(locations.roomId, roomId))
  const [deleted] = await db.delete(rooms).where(eq(rooms.id, roomId)).returning()
  return deleted
}

/**
 * 4. MESAS / GUICHÊS (Locais): Listar, Criar, Atualizar, Vincular e Remover
 */
export async function getLocationsWithDetails(unitId: string) {
  return db
    .select({
      id: locations.id,
      name: locations.name,
      number: locations.number,
      active: locations.active,
      roomId: locations.roomId,
      roomName: rooms.name,
      roomNumber: rooms.number,
      currentUserId: locations.currentUserId,
      currentUserName: users.name,
      currentUserEmail: users.email,
    })
    .from(locations)
    .leftJoin(rooms, eq(locations.roomId, rooms.id))
    .leftJoin(users, eq(locations.currentUserId, users.id))
    .where(eq(locations.unitId, unitId))
    .orderBy(asc(locations.number))
}

export async function createLocation(data: {
  unitId: string
  roomId?: string
  name: string // "Guichê" ou "Mesa"
  number: number
}) {
  const [newLoc] = await db
    .insert(locations)
    .values({
      unitId: data.unitId,
      roomId: data.roomId || null,
      name: data.name.trim(),
      number: data.number,
      active: true,
    })
    .returning()

  return newLoc
}

export async function updateLocation(locationId: string, data: {
  name: string
  number: number
  roomId?: string
}) {
  const [updated] = await db
    .update(locations)
    .set({
      name: data.name.trim(),
      number: data.number,
      roomId: data.roomId || null,
    })
    .where(eq(locations.id, locationId))
    .returning()

  return updated
}

export async function deleteLocation(locationId: string) {
  const [deleted] = await db.delete(locations).where(eq(locations.id, locationId)).returning()
  return deleted
}

export async function bindAttendantToLocation(locationId: string, userId: string | null) {
  if (userId) {
    // Desvincula o usuário de qualquer outro guichê
    await db
      .update(locations)
      .set({ currentUserId: null })
      .where(eq(locations.currentUserId, userId))
  }

  const [updated] = await db
    .update(locations)
    .set({ currentUserId: userId })
    .where(eq(locations.id, locationId))
    .returning()

  return updated
}

/**
 * 5. USUÁRIOS: Listar, Criar, Atualizar e Remover
 */
export async function getUsersList() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'ATTENDANT' | 'TRIAGE'
}) {
  const passwordHash = await bcrypt.hash(data.password, 10)

  const [newUser] = await db
    .insert(users)
    .values({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: data.role,
      active: true,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })

  return newUser
}

export async function updateUser(userId: string, data: {
  name: string
  email: string
  role: 'ADMIN' | 'ATTENDANT' | 'TRIAGE'
  password?: string
}) {
  const updateData: {
    name: string
    email: string
    role: 'ADMIN' | 'ATTENDANT' | 'TRIAGE'
    passwordHash?: string
  } = {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
  }

  if (data.password && data.password.trim()) {
    updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10)
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
    })

  return updated
}

export async function deleteUser(userId: string) {
  // Desvincula de guichês/mesas primeiro
  await db.update(locations).set({ currentUserId: null }).where(eq(locations.currentUserId, userId))
  const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id })
  return deleted
}

/**
 * 6. CONFIGURAÇÃO DE VOZ (SPEECH CONFIG) DA UNIDADE
 */
export async function getUnitSpeechConfig(unitId: string) {
  const [unit] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)

  const meta = (unit?.metadata as any) || {}
  return (
    meta.speechConfig || {
      voice: 'pt-BR-FranciscaNeural',
      rate: '+0%',
      pitch: '+0Hz',
      callPrefix: 'Senha',
      callSuffix: 'Favor comparecer',
      pauseDuration: '300ms',
      includeCustomerName: true,
      lgpdMode: false,
    }
  )
}

export async function saveUnitSpeechConfig(unitId: string, speechConfig: any) {
  const [unit] = await db.select().from(units).where(eq(units.id, unitId)).limit(1)
  if (!unit) throw new Error('Unidade não encontrada.')

  const existingMeta = (unit.metadata as any) || {}
  const updatedMeta = { ...existingMeta, speechConfig }

  const [updated] = await db
    .update(units)
    .set({
      metadata: updatedMeta,
      updatedAt: new Date(),
    })
    .where(eq(units.id, unitId))
    .returning()

  return updated
}

/**
 * 7. CONFIGURAÇÕES DE ORDEM DE ATENDIMENTO E REGRAS DE FILA DA UNIDADE
 */
export interface UnitAttendanceConfig {
  defaultOrderMode: 'PRIORITY' | 'INTERLEAVED' // 'PRIORITY' = Estrito por Prioridade; 'INTERLEAVED' = Intercalado (1 Urgência, 1 Prioritário, 1 Convencional)
  allowManualQueueSelection: boolean // Permite chamar qualquer ficha diretamente da Fila de Espera
}

export async function getUnitAttendanceConfig(unitId: string): Promise<UnitAttendanceConfig> {
  const [unit] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)

  const meta = (unit?.metadata as any) || {}
  return {
    defaultOrderMode: meta.attendanceConfig?.defaultOrderMode || 'PRIORITY',
    allowManualQueueSelection: meta.attendanceConfig?.allowManualQueueSelection ?? true,
  }
}

export async function saveUnitAttendanceConfig(unitId: string, attendanceConfig: UnitAttendanceConfig) {
  const [unit] = await db.select().from(units).where(eq(units.id, unitId)).limit(1)
  if (!unit) throw new Error('Unidade não encontrada.')

  const existingMeta = (unit.metadata as any) || {}
  const updatedMeta = { ...existingMeta, attendanceConfig }

  const [updated] = await db
    .update(units)
    .set({
      metadata: updatedMeta,
      updatedAt: new Date(),
    })
    .where(eq(units.id, unitId))
    .returning()

  return updated
}

/**
 * 8. SERVIÇOS: Listar, Criar, Atualizar e Remover com Vinculação a Sala ou Usuário
 */
export async function getServicesByUnit(unitId: string) {
  const serviceList = await db
    .select({
      id: services.id,
      unitId: services.unitId,
      name: services.name,
      prefix: services.prefix,
      weight: services.weight,
      active: services.active,
      roomId: services.roomId,
      userId: services.userId,
      roomName: rooms.name,
      roomNumber: rooms.number,
      userName: users.name,
      userRole: users.role,
      metadata: services.metadata,
      createdAt: services.createdAt,
    })
    .from(services)
    .leftJoin(rooms, eq(services.roomId, rooms.id))
    .leftJoin(users, eq(services.userId, users.id))
    .where(eq(services.unitId, unitId))
    .orderBy(asc(services.prefix))

  return serviceList
}

export async function createService(data: {
  unitId: string
  name: string
  prefix: string
  weight?: number
  roomId?: string | null
  userId?: string | null
}) {
  const [newService] = await db
    .insert(services)
    .values({
      unitId: data.unitId,
      name: data.name.trim(),
      prefix: data.prefix.toUpperCase().trim(),
      weight: data.weight || 1,
      roomId: data.roomId || null,
      userId: data.userId || null,
      active: true,
      metadata: {},
    })
    .returning()

  return newService
}

export async function updateService(serviceId: string, data: {
  name: string
  prefix: string
  weight?: number
  roomId?: string | null
  userId?: string | null
  active?: boolean
}) {
  const [updated] = await db
    .update(services)
    .set({
      name: data.name.trim(),
      prefix: data.prefix.toUpperCase().trim(),
      weight: data.weight !== undefined ? data.weight : 1,
      roomId: data.roomId !== undefined ? data.roomId : null,
      userId: data.userId !== undefined ? data.userId : null,
      active: data.active !== undefined ? data.active : true,
    })
    .where(eq(services.id, serviceId))
    .returning()

  return updated
}

export async function deleteService(serviceId: string) {
  await db.delete(services).where(eq(services.id, serviceId))
  return { success: true }
}


