'use server'

import { db } from '@/lib/db'
import { units, floors, rooms, locations, users, userUnits, services, dailyCounters, tickets, ticketsHistory, priorities } from '@/lib/db/schema'
import { eq, asc, desc, and, gte, lte, or, inArray, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { publishPanelEvent } from '@/lib/redis'

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
  timezone?: string
}) {
  const [newUnit] = await db
    .insert(units)
    .values({
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      subtitle: data.subtitle?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      timezone: data.timezone?.trim() || 'America/Sao_Paulo',
      active: true,
    })
    .returning()

  return newUnit
}

export async function updateUnit(unitId: string, data: {
  name: string
  subtitle?: string
  logoUrl?: string
  timezone?: string
}) {
  const [updated] = await db
    .update(units)
    .set({
      name: data.name.trim(),
      subtitle: data.subtitle?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      ...(data.timezone ? { timezone: data.timezone.trim() } : {}),
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
  try {
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
  } catch (err: any) {
    if (err?.code === '23505') {
      throw new Error(`Já existe um(a) "${data.name} ${data.number}" cadastrado(a) nesta mesma sala ou unidade.`)
    }
    throw err
  }
}

export async function updateLocation(locationId: string, data: {
  name: string
  number: number
  roomId?: string
}) {
  try {
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
  } catch (err: any) {
    if (err?.code === '23505') {
      throw new Error(`Já existe um(a) "${data.name} ${data.number}" cadastrado(a) nesta mesma sala ou unidade.`)
    }
    throw err
  }
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

  // Se o usuário foi vinculado a um guichê que possui sala, sincroniza os serviços exclusivos desse atendente
  if (userId && updated && updated.roomId) {
    await db
      .update(services)
      .set({ roomId: updated.roomId })
      .where(eq(services.userId, userId))
  }

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
      avatarUrl: users.avatarUrl,
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
      avatarUrl: users.avatarUrl,
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
      avatarUrl: users.avatarUrl,
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
 * 7. CONFIGURAÇÕES DE ORDEM DE ATENDIMENTO, REGRAS DE FILA E RESET DE SENHAS DA UNIDADE
 */
export interface UnitAttendanceConfig {
  defaultOrderMode: 'PRIORITY' | 'INTERLEAVED' // 'PRIORITY' = Estrito por Prioridade; 'INTERLEAVED' = Intercalado (1 Urgência, 1 Prioritário, 1 Convencional)
  allowManualQueueSelection: boolean // Permite chamar qualquer ficha diretamente da Fila de Espera
  autoResetEnabled?: boolean // Habilita reset automático diário da numeração das senhas
  autoResetTime?: string // Horário diário para reset automático (ex: "00:00", "07:00")
  autoResetClearQueue?: boolean // Ao virar o horário de reset, também arquiva/cancela senhas não atendidas da fila anterior
  lastManualResetAt?: string | null // Data/hora do último reset manual executado pelo administrador
}

export async function getUnitAttendanceConfig(unitId: string): Promise<UnitAttendanceConfig> {
  const [unit] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)

  const meta = (unit?.metadata as any) || {}
  const cfg = meta.attendanceConfig || {}
  return {
    defaultOrderMode: cfg.defaultOrderMode || 'PRIORITY',
    allowManualQueueSelection: cfg.allowManualQueueSelection ?? true,
    autoResetEnabled: cfg.autoResetEnabled ?? true,
    autoResetTime: cfg.autoResetTime || '00:00',
    autoResetClearQueue: cfg.autoResetClearQueue ?? false,
    lastManualResetAt: cfg.lastManualResetAt || null,
  }
}

export async function saveUnitAttendanceConfig(unitId: string, attendanceConfig: UnitAttendanceConfig) {
  const [unit] = await db.select().from(units).where(eq(units.id, unitId)).limit(1)
  if (!unit) throw new Error('Unidade não encontrada.')

  const existingMeta = (unit.metadata as any) || {}
  const updatedMeta = {
    ...existingMeta,
    attendanceConfig: {
      ...(existingMeta.attendanceConfig || {}),
      ...attendanceConfig,
    },
  }

  const [updated] = await db
    .update(units)
    .set({
      metadata: updatedMeta,
      updatedAt: new Date(),
    })
    .where(eq(units.id, unitId))
    .returning()

  await publishPanelEvent(unitId, {
    type: 'CONFIG_CHANGED',
    timestamp: new Date().toISOString(),
    payload: {
      action: 'UPDATE_ATTENDANCE_CONFIG',
      attendanceConfig: {
        defaultOrderMode: attendanceConfig.defaultOrderMode || 'PRIORITY',
        allowManualQueueSelection: attendanceConfig.allowManualQueueSelection ?? true,
        autoResetEnabled: attendanceConfig.autoResetEnabled ?? true,
        autoResetTime: attendanceConfig.autoResetTime || '00:00',
        autoResetClearQueue: attendanceConfig.autoResetClearQueue ?? false,
        lastManualResetAt: attendanceConfig.lastManualResetAt || null,
      },
    },
  })

  return updated
}

/**
 * Zera a numeração de senhas da unidade para iniciar do número 1 (001).
 * Opcionalmente arquiva as senhas atualmente em espera na fila.
 */
export async function resetUnitTicketCounter(params: {
  unitId: string
  clearWaitingQueue?: boolean
}) {
  const [unit] = await db.select().from(units).where(eq(units.id, params.unitId)).limit(1)
  if (!unit) throw new Error('Unidade não encontrada.')

  // 1. Zera todos os contadores de números de senhas da unidade
  await db.delete(dailyCounters).where(eq(dailyCounters.unitId, params.unitId))

  // 2. Se solicitado, arquiva senhas ativas que estão aguardando na fila
  let clearedCount = 0
  if (params.clearWaitingQueue) {
    const waitingTickets = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.unitId, params.unitId), eq(tickets.status, 'ISSUED')))

    clearedCount = waitingTickets.length

    if (waitingTickets.length > 0) {
      const now = new Date()
      const historyRows = waitingTickets.map((t) => ({
        id: t.id,
        unitId: t.unitId,
        serviceId: t.serviceId,
        priorityId: t.priorityId,
        locationId: t.locationId,
        userId: t.userId,
        ticketNumber: t.ticketNumber,
        ticketPrefix: t.ticketPrefix,
        formattedTicket: t.formattedTicket,
        status: 'CANCELLED',
        resolution: 'UNSOLVED',
        customerName: t.customerName,
        customerDoc: t.customerDoc,
        createdAt: t.createdAt,
        finishedAt: now,
        metadata: {
          ...(t.metadata as any),
          cancelledReason: 'Numeração e fila resetadas pelo administrador',
          cancelledAt: now.toISOString(),
        },
      }))

      await db.insert(ticketsHistory).values(historyRows)
      await db.delete(tickets).where(and(eq(tickets.unitId, params.unitId), eq(tickets.status, 'ISSUED')))
    }
  }

  // 3. Salva timestamp do último reset manual nos metadados da unidade
  const nowStr = new Date().toISOString()
  const existingMeta = (unit.metadata as any) || {}
  const attendanceConfig = {
    ...(existingMeta.attendanceConfig || {}),
    lastManualResetAt: nowStr,
  }

  await db
    .update(units)
    .set({
      metadata: { ...existingMeta, attendanceConfig },
      updatedAt: new Date(),
    })
    .where(eq(units.id, params.unitId))

  // 4. Notifica via Redis para atualização instantânea dos painéis e atendentes
  await publishPanelEvent(params.unitId, {
    type: 'PANEL_RESET',
    timestamp: nowStr,
    payload: { action: 'RESET_COUNTERS', clearedCount },
  }).catch(() => {})
  await publishPanelEvent(params.unitId, {
    type: 'CONFIG_CHANGED',
    timestamp: nowStr,
    payload: { action: 'RESET_COUNTERS', clearedCount },
  }).catch(() => {})

  return {
    success: true,
    resetAt: nowStr,
    clearedCount,
  }
}

/**
 * 8. SERVIÇOS: Listar, Criar, Atualizar e Remover com Vinculação a Sala ou Usuário
 */
export async function getServicesByUnit(unitId: string) {
  const [serviceList, unitLocations] = await Promise.all([
    db
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
      .orderBy(asc(services.prefix)),
    db
      .select({
        id: locations.id,
        name: locations.name,
        number: locations.number,
        roomId: locations.roomId,
        currentUserId: locations.currentUserId,
        roomName: rooms.name,
      })
      .from(locations)
      .leftJoin(rooms, eq(locations.roomId, rooms.id))
      .where(and(eq(locations.unitId, unitId), eq(locations.active, true))),
  ])

  // Enriquece serviços com atendente exclusivo indicando onde o atendente está lotado
  return serviceList.map((s) => {
    let attendantLocationText: string | null = null
    let effectiveRoomName = s.roomName || null

    if (s.userId) {
      const loc = unitLocations.find((l) => l.currentUserId === s.userId)
      if (loc) {
        attendantLocationText = `${loc.name} ${loc.number.toString().padStart(2, '0')}`
        if (!effectiveRoomName && loc.roomName) {
          effectiveRoomName = loc.roomName
        }
      }
    }

    return {
      ...s,
      roomName: effectiveRoomName,
      attendantLocationText,
    }
  })
}

export async function createService(data: {
  unitId: string
  name: string
  prefix: string
  weight?: number
  roomId?: string | null
  userId?: string | null
}) {
  let resolvedRoomId = data.roomId || null

  // Se o serviço for restrito a um atendente e não informou sala, descobre a sala da lotação do atendente
  if (data.userId && !resolvedRoomId) {
    const [userLoc] = await db
      .select({ roomId: locations.roomId })
      .from(locations)
      .where(and(eq(locations.currentUserId, data.userId), eq(locations.active, true)))
      .limit(1)

    if (userLoc?.roomId) {
      resolvedRoomId = userLoc.roomId
    }
  }

  const [newService] = await db
    .insert(services)
    .values({
      unitId: data.unitId,
      name: data.name.trim(),
      prefix: data.prefix.toUpperCase().trim(),
      weight: data.weight || 1,
      roomId: resolvedRoomId,
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
  let resolvedRoomId = data.roomId !== undefined ? data.roomId : null

  // Se o serviço for restrito a um atendente e não informou sala, descobre a sala da lotação do atendente
  if (data.userId && !resolvedRoomId) {
    const [userLoc] = await db
      .select({ roomId: locations.roomId })
      .from(locations)
      .where(and(eq(locations.currentUserId, data.userId), eq(locations.active, true)))
      .limit(1)

    if (userLoc?.roomId) {
      resolvedRoomId = userLoc.roomId
    }
  }

  const [updated] = await db
    .update(services)
    .set({
      name: data.name.trim(),
      prefix: data.prefix.toUpperCase().trim(),
      weight: data.weight !== undefined ? data.weight : 1,
      roomId: resolvedRoomId,
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

/**
 * 8. CONSULTA DE SENHAS & RELATÓRIOS ANALÍTICOS E SINTÉTICOS
 */
export interface TicketReportFilters {
  unitId?: string
  startDate?: string
  endDate?: string
  serviceId?: string
  roomId?: string
  status?: string
  priorityId?: number
  userId?: string
  searchQuery?: string
}

export interface TicketReportItem {
  id: string
  formattedTicket: string
  ticketNumber: number
  ticketPrefix: string
  status: string
  resolution: string | null
  customerName: string | null
  customerDoc: string | null
  createdAt: string
  calledAt: string | null
  startedAt: string | null
  finishedAt: string | null
  waitTimeSeconds: number | null
  serviceTimeSeconds: number | null
  totalTimeSeconds: number | null
  serviceId: string
  serviceName: string
  roomId: string | null
  roomName: string | null
  locationId: string | null
  locationName: string | null
  locationNumber: number | null
  priorityId: number
  priorityName: string
  priorityColor: string
  userId: string | null
  attendantName: string | null
  unitId: string
  unitName: string
  observation?: string | null
}

export interface TicketReportSummary {
  total: number
  finished: number
  noShow: number
  cancelled: number
  inProgress: number
  waiting: number
  avgWaitSeconds: number
  avgServiceSeconds: number
  byPriority: Record<string, number>
  byService: Record<string, number>
  byRoom: Record<string, number>
}

export async function getAdminTicketsReport(filters: TicketReportFilters = {}): Promise<{
  items: TicketReportItem[]
  summary: TicketReportSummary
}> {
  // Parsing de Datas
  let startDateTime: Date | undefined
  let endDateTime: Date | undefined

  if (filters.startDate) {
    startDateTime = new Date(`${filters.startDate}T00:00:00.000`)
    if (isNaN(startDateTime.getTime())) startDateTime = undefined
  }

  if (filters.endDate) {
    endDateTime = new Date(`${filters.endDate}T23:59:59.999`)
    if (isNaN(endDateTime.getTime())) endDateTime = undefined
  }

  // 1. Condições de Filtro para Tabela tickets
  const activeConditions: any[] = []
  if (filters.unitId) activeConditions.push(eq(tickets.unitId, filters.unitId))
  if (startDateTime) activeConditions.push(gte(tickets.createdAt, startDateTime))
  if (endDateTime) activeConditions.push(lte(tickets.createdAt, endDateTime))
  if (filters.serviceId && filters.serviceId !== 'ALL') activeConditions.push(eq(tickets.serviceId, filters.serviceId))
  if (filters.status && filters.status !== 'ALL') activeConditions.push(eq(tickets.status, filters.status))
  if (filters.priorityId && filters.priorityId > 0) activeConditions.push(eq(tickets.priorityId, filters.priorityId))
  if (filters.userId && filters.userId !== 'ALL') activeConditions.push(eq(tickets.userId, filters.userId))

  // 2. Condições de Filtro para Tabela ticketsHistory
  const historyConditions: any[] = []
  if (filters.unitId) historyConditions.push(eq(ticketsHistory.unitId, filters.unitId))
  if (startDateTime) historyConditions.push(gte(ticketsHistory.createdAt, startDateTime))
  if (endDateTime) historyConditions.push(lte(ticketsHistory.createdAt, endDateTime))
  if (filters.serviceId && filters.serviceId !== 'ALL') historyConditions.push(eq(ticketsHistory.serviceId, filters.serviceId))
  if (filters.status && filters.status !== 'ALL') historyConditions.push(eq(ticketsHistory.status, filters.status))
  if (filters.priorityId && filters.priorityId > 0) historyConditions.push(eq(ticketsHistory.priorityId, filters.priorityId))
  if (filters.userId && filters.userId !== 'ALL') historyConditions.push(eq(ticketsHistory.userId, filters.userId))

  // Execução concorrente das duas buscas
  const [activeResults, historyResults] = await Promise.all([
    db
      .select({
        id: tickets.id,
        formattedTicket: tickets.formattedTicket,
        ticketNumber: tickets.ticketNumber,
        ticketPrefix: tickets.ticketPrefix,
        status: tickets.status,
        resolution: tickets.resolution,
        customerName: tickets.customerName,
        customerDoc: tickets.customerDoc,
        createdAt: tickets.createdAt,
        calledAt: tickets.calledAt,
        startedAt: tickets.startedAt,
        finishedAt: tickets.finishedAt,
        metadata: tickets.metadata,
        unitId: tickets.unitId,
        unitName: units.name,
        serviceId: tickets.serviceId,
        serviceName: services.name,
        serviceRoomId: services.roomId,
        priorityId: tickets.priorityId,
        priorityName: priorities.name,
        priorityColor: priorities.colorHex,
        locationId: tickets.locationId,
        locationName: locations.name,
        locationNumber: locations.number,
        locationRoomId: locations.roomId,
        userId: tickets.userId,
        attendantName: users.name,
      })
      .from(tickets)
      .innerJoin(units, eq(tickets.unitId, units.id))
      .innerJoin(services, eq(tickets.serviceId, services.id))
      .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
      .leftJoin(locations, eq(tickets.locationId, locations.id))
      .leftJoin(users, eq(tickets.userId, users.id))
      .where(activeConditions.length > 0 ? and(...activeConditions) : undefined),

    db
      .select({
        id: ticketsHistory.id,
        formattedTicket: ticketsHistory.formattedTicket,
        ticketNumber: ticketsHistory.ticketNumber,
        ticketPrefix: ticketsHistory.ticketPrefix,
        status: ticketsHistory.status,
        resolution: ticketsHistory.resolution,
        customerName: ticketsHistory.customerName,
        customerDoc: ticketsHistory.customerDoc,
        createdAt: ticketsHistory.createdAt,
        calledAt: ticketsHistory.calledAt,
        startedAt: ticketsHistory.startedAt,
        finishedAt: ticketsHistory.finishedAt,
        waitTimeSeconds: ticketsHistory.waitTimeSeconds,
        serviceTimeSeconds: ticketsHistory.serviceTimeSeconds,
        totalTimeSeconds: ticketsHistory.totalTimeSeconds,
        metadata: ticketsHistory.metadata,
        unitId: ticketsHistory.unitId,
        unitName: units.name,
        serviceId: ticketsHistory.serviceId,
        serviceName: services.name,
        serviceRoomId: services.roomId,
        priorityId: ticketsHistory.priorityId,
        priorityName: priorities.name,
        priorityColor: priorities.colorHex,
        locationId: ticketsHistory.locationId,
        locationName: locations.name,
        locationNumber: locations.number,
        locationRoomId: locations.roomId,
        userId: ticketsHistory.userId,
        attendantName: users.name,
      })
      .from(ticketsHistory)
      .innerJoin(units, eq(ticketsHistory.unitId, units.id))
      .innerJoin(services, eq(ticketsHistory.serviceId, services.id))
      .innerJoin(priorities, eq(ticketsHistory.priorityId, priorities.id))
      .leftJoin(locations, eq(ticketsHistory.locationId, locations.id))
      .leftJoin(users, eq(ticketsHistory.userId, users.id))
      .where(historyConditions.length > 0 ? and(...historyConditions) : undefined),
  ])

  // Busca mapa de salas para resolver o nome da sala (caso vinculada ao serviço ou local)
  const allRooms = await db.select({ id: rooms.id, name: rooms.name, number: rooms.number }).from(rooms)
  const roomMap = new Map(allRooms.map((r) => [r.id, `${r.name}${r.number ? ` (${r.number})` : ''}`]))

  // Unifica e calcula tempos
  const itemsMap = new Map<string, TicketReportItem>()

  // 1. Processa senhas do histórico
  for (const row of historyResults) {
    const effectiveRoomId = row.serviceRoomId || row.locationRoomId || null
    const roomName = effectiveRoomId ? roomMap.get(effectiveRoomId) || null : null

    const wait = row.waitTimeSeconds !== null && row.waitTimeSeconds !== undefined
      ? row.waitTimeSeconds
      : row.calledAt && row.createdAt
      ? Math.max(0, Math.round((new Date(row.calledAt).getTime() - new Date(row.createdAt).getTime()) / 1000))
      : null

    const serviceTime = row.serviceTimeSeconds !== null && row.serviceTimeSeconds !== undefined
      ? row.serviceTimeSeconds
      : row.finishedAt && row.startedAt
      ? Math.max(0, Math.round((new Date(row.finishedAt).getTime() - new Date(row.startedAt).getTime()) / 1000))
      : null

    const total = row.totalTimeSeconds !== null && row.totalTimeSeconds !== undefined
      ? row.totalTimeSeconds
      : row.finishedAt && row.createdAt
      ? Math.max(0, Math.round((new Date(row.finishedAt).getTime() - new Date(row.createdAt).getTime()) / 1000))
      : null

    itemsMap.set(row.id, {
      id: row.id,
      formattedTicket: row.formattedTicket,
      ticketNumber: row.ticketNumber,
      ticketPrefix: row.ticketPrefix,
      status: row.status,
      resolution: row.resolution,
      customerName: row.customerName,
      customerDoc: row.customerDoc,
      createdAt: new Date(row.createdAt).toISOString(),
      calledAt: row.calledAt ? new Date(row.calledAt).toISOString() : null,
      startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
      finishedAt: row.finishedAt ? new Date(row.finishedAt).toISOString() : null,
      waitTimeSeconds: wait,
      serviceTimeSeconds: serviceTime,
      totalTimeSeconds: total,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      roomId: effectiveRoomId,
      roomName,
      locationId: row.locationId,
      locationName: row.locationName,
      locationNumber: row.locationNumber,
      priorityId: row.priorityId,
      priorityName: row.priorityName,
      priorityColor: row.priorityColor,
      userId: row.userId,
      attendantName: row.attendantName,
      unitId: row.unitId,
      unitName: row.unitName,
      observation: (row.metadata as any)?.observation || null,
    })
  }

  // 2. Processa senhas ativas (sobrescreve se houver estado mais recente)
  for (const row of activeResults) {
    const effectiveRoomId = row.serviceRoomId || row.locationRoomId || null
    const roomName = effectiveRoomId ? roomMap.get(effectiveRoomId) || null : null

    const wait = row.calledAt && row.createdAt
      ? Math.max(0, Math.round((new Date(row.calledAt).getTime() - new Date(row.createdAt).getTime()) / 1000))
      : null

    const serviceTime = row.finishedAt && row.startedAt
      ? Math.max(0, Math.round((new Date(row.finishedAt).getTime() - new Date(row.startedAt).getTime()) / 1000))
      : null

    const total = row.finishedAt && row.createdAt
      ? Math.max(0, Math.round((new Date(row.finishedAt).getTime() - new Date(row.createdAt).getTime()) / 1000))
      : null

    itemsMap.set(row.id, {
      id: row.id,
      formattedTicket: row.formattedTicket,
      ticketNumber: row.ticketNumber,
      ticketPrefix: row.ticketPrefix,
      status: row.status,
      resolution: row.resolution,
      customerName: row.customerName,
      customerDoc: row.customerDoc,
      createdAt: new Date(row.createdAt).toISOString(),
      calledAt: row.calledAt ? new Date(row.calledAt).toISOString() : null,
      startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
      finishedAt: row.finishedAt ? new Date(row.finishedAt).toISOString() : null,
      waitTimeSeconds: wait,
      serviceTimeSeconds: serviceTime,
      totalTimeSeconds: total,
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      roomId: effectiveRoomId,
      roomName,
      locationId: row.locationId,
      locationName: row.locationName,
      locationNumber: row.locationNumber,
      priorityId: row.priorityId,
      priorityName: row.priorityName,
      priorityColor: row.priorityColor,
      userId: row.userId,
      attendantName: row.attendantName,
      unitId: row.unitId,
      unitName: row.unitName,
      observation: (row.metadata as any)?.observation || null,
    })
  }

  let items = Array.from(itemsMap.values())

  // Filtro adicional em memória por Sala
  if (filters.roomId && filters.roomId !== 'ALL') {
    items = items.filter((t) => t.roomId === filters.roomId)
  }

  // Filtro de Busca Textual Livre (Senha, Cidadão, Documento)
  if (filters.searchQuery?.trim()) {
    const q = filters.searchQuery.toLowerCase().trim()
    items = items.filter(
      (t) =>
        t.formattedTicket.toLowerCase().includes(q) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.customerDoc && t.customerDoc.toLowerCase().includes(q)) ||
        t.serviceName.toLowerCase().includes(q) ||
        (t.attendantName && t.attendantName.toLowerCase().includes(q))
    )
  }

  // Ordenação decrescente por data de criação
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Cálculo dos Indicadores Consolidados (KPIs)
  let totalWaitSum = 0
  let totalWaitCount = 0
  let totalServiceSum = 0
  let totalServiceCount = 0

  const summary: TicketReportSummary = {
    total: items.length,
    finished: 0,
    noShow: 0,
    cancelled: 0,
    inProgress: 0,
    waiting: 0,
    avgWaitSeconds: 0,
    avgServiceSeconds: 0,
    byPriority: {},
    byService: {},
    byRoom: {},
  }

  for (const t of items) {
    if (t.status === 'FINISHED') summary.finished++
    else if (t.status === 'NO_SHOW') summary.noShow++
    else if (t.status === 'CANCELLED') summary.cancelled++
    else if (t.status === 'IN_PROGRESS' || t.status === 'CALLED') summary.inProgress++
    else if (t.status === 'ISSUED') summary.waiting++

    if (t.waitTimeSeconds !== null && t.waitTimeSeconds >= 0) {
      totalWaitSum += t.waitTimeSeconds
      totalWaitCount++
    }

    if (t.serviceTimeSeconds !== null && t.serviceTimeSeconds >= 0) {
      totalServiceSum += t.serviceTimeSeconds
      totalServiceCount++
    }

    summary.byPriority[t.priorityName] = (summary.byPriority[t.priorityName] || 0) + 1
    summary.byService[t.serviceName] = (summary.byService[t.serviceName] || 0) + 1
    const rName = t.roomName || 'Atendimento Geral'
    summary.byRoom[rName] = (summary.byRoom[rName] || 0) + 1
  }

  summary.avgWaitSeconds = totalWaitCount > 0 ? Math.round(totalWaitSum / totalWaitCount) : 0
  summary.avgServiceSeconds = totalServiceCount > 0 ? Math.round(totalServiceSum / totalServiceCount) : 0

  return { items, summary }
}



