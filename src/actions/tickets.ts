'use server'

import { eq, and, desc, asc, inArray, sql, lte, or, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets, dailyCounters, services, priorities, locations, ticketsHistory, units, users, rooms } from '@/lib/db/schema'
import { publishPanelEvent } from '@/lib/redis'
import { buildTicketAnnouncement } from '@/lib/speech-normalizer'

export interface IssueTicketInput {
  unitId: string
  serviceId: string
  priorityId: number
  customerName?: string
  customerDoc?: string
}

/**
 * Obtém a unidade padrão ou especificada, juntamente com serviços, prioridades e locais.
 */
export async function getUnitData(unitId?: string) {
  let unit
  if (unitId) {
    const [u] = await db.select().from(units).where(eq(units.id, unitId)).limit(1)
    unit = u
  } else {
    const [u] = await db.select().from(units).limit(1)
    unit = u
  }

  if (!unit) {
    return null
  }

  const [activeServices, activePriorities, activeLocations, waitingTickets] = await Promise.all([
    db.select().from(services).where(and(eq(services.unitId, unit.id), eq(services.active, true))),
    db.select().from(priorities).where(eq(priorities.active, true)).orderBy(asc(priorities.id)),
    db.select().from(locations).where(and(eq(locations.unitId, unit.id), eq(locations.active, true))).orderBy(asc(locations.number)),
    db.select({ count: sql<number>`count(*)::int` }).from(tickets).where(and(eq(tickets.unitId, unit.id), eq(tickets.status, 'ISSUED'))),
  ])

  return {
    unit,
    services: activeServices,
    priorities: activePriorities,
    locations: activeLocations,
    waitingCount: waitingTickets[0]?.count || 0,
  }
}

/**
 * Emite uma nova senha para a fila com incremento atômico de número diário.
 */
export async function issueTicket(input: IssueTicketInput) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // 1. Obter serviço para recuperar prefixo
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.unitId, input.unitId)))
    .limit(1)

  if (!service) {
    throw new Error('Serviço não encontrado para a unidade informada.')
  }

  const [priority] = await db
    .select()
    .from(priorities)
    .where(eq(priorities.id, input.priorityId))
    .limit(1)

  // 2. Incrementar atomicamente o contador diário
  const [counter] = await db
    .insert(dailyCounters)
    .values({
      unitId: input.unitId,
      serviceId: input.serviceId,
      date: today,
      currentNumber: 1,
    })
    .onConflictDoUpdate({
      target: [dailyCounters.unitId, dailyCounters.serviceId, dailyCounters.date],
      set: {
        currentNumber: sql`${dailyCounters.currentNumber} + 1`,
      },
    })
    .returning()

  const ticketNumber = counter.currentNumber
  const formattedTicket = `${service.prefix}${ticketNumber.toString().padStart(3, '0')}`

  // 3. Inserir a nova senha na fila
  const [newTicket] = await db
    .insert(tickets)
    .values({
      unitId: input.unitId,
      serviceId: input.serviceId,
      priorityId: input.priorityId,
      ticketNumber,
      ticketPrefix: service.prefix,
      formattedTicket,
      status: 'ISSUED',
      customerName: input.customerName || null,
      customerDoc: input.customerDoc || null,
    })
    .returning()

  // 4. Quantidade de pessoas à frente
  const [ahead] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tickets)
    .where(
      and(
        eq(tickets.unitId, input.unitId),
        eq(tickets.status, 'ISSUED'),
        lte(tickets.createdAt, newTicket.createdAt)
      )
    )

  return {
    ...newTicket,
    serviceName: service.name,
    priorityName: priority?.name || 'Normal',
    priorityColor: priority?.colorHex || '#06B6D4',
    peopleAhead: ahead?.count || 1,
  }
}

/**
 * Atendente chama a próxima senha da fila (por Prioridade Estrita ou Intercalado 1-Urgência/1-Prioritário/1-Convencional).
 */
export async function callNextTicket(params: {
  unitId: string
  locationId: string
  userId?: string
  serviceIds?: string[]
  orderMode?: 'PRIORITY' | 'INTERLEAVED'
}) {
  // 1. Carrega dados da unidade para obter configurações de atendimento
  const [unitRecord] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, params.unitId))
    .limit(1)

  const meta = (unitRecord?.metadata as any) || {}
  const attendanceConfig = meta.attendanceConfig || {}
  const effectiveMode: 'PRIORITY' | 'INTERLEAVED' =
    params.orderMode || attendanceConfig.defaultOrderMode || 'PRIORITY'

  let nextItem: any = null

  if (effectiveMode === 'INTERLEAVED') {
    // Intercala ciclo: 1 Urgência (peso 3), 1 Prioritário (peso 2), 1 Convencional (peso 1)
    const lastWeight = meta.lastCalledPriorityWeight as number | undefined
    
    // Define a sequência de pesos desejados a partir do último chamado
    let targetWeightsOrder = [3, 2, 1]
    if (lastWeight === 3) targetWeightsOrder = [2, 1, 3]
    else if (lastWeight === 2) targetWeightsOrder = [1, 3, 2]
    else targetWeightsOrder = [3, 2, 1]

    // Procura na ordem circular o primeiro peso que tem senhas aguardando
    for (const targetWeight of targetWeightsOrder) {
      const [item] = await db
        .select({
          ticket: tickets,
          service: services,
          priority: priorities,
        })
        .from(tickets)
        .innerJoin(services, eq(tickets.serviceId, services.id))
        .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
        .where(
          and(
            eq(tickets.unitId, params.unitId),
            eq(tickets.status, 'ISSUED'),
            eq(priorities.weight, targetWeight),
            params.serviceIds && params.serviceIds.length > 0
              ? inArray(tickets.serviceId, params.serviceIds)
              : undefined
          )
        )
        .orderBy(asc(tickets.createdAt))
        .limit(1)

      if (item) {
        nextItem = item
        // Salva o peso chamado na unidade para o próximo ciclo
        const updatedMeta = { ...meta, lastCalledPriorityWeight: targetWeight }
        await db.update(units).set({ metadata: updatedMeta }).where(eq(units.id, params.unitId))
        break
      }
    }
  }

  // Se não foi encontrado no modo intercalado ou o modo é estrito por prioridade
  if (!nextItem) {
    const query = db
      .select({
        ticket: tickets,
        service: services,
        priority: priorities,
      })
      .from(tickets)
      .innerJoin(services, eq(tickets.serviceId, services.id))
      .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
      .where(
        and(
          eq(tickets.unitId, params.unitId),
          eq(tickets.status, 'ISSUED'),
          params.serviceIds && params.serviceIds.length > 0
            ? inArray(tickets.serviceId, params.serviceIds)
            : undefined
        )
      )
      .orderBy(desc(priorities.weight), asc(tickets.createdAt))
      .limit(1)

    const [item] = await query
    nextItem = item

    if (nextItem && effectiveMode === 'INTERLEAVED') {
      const updatedMeta = { ...meta, lastCalledPriorityWeight: nextItem.priority.weight }
      await db.update(units).set({ metadata: updatedMeta }).where(eq(units.id, params.unitId))
    }
  }

  if (!nextItem) {
    return { success: false, message: 'Nenhuma senha aguardando na fila.' }
  }

  // 2. Obter informações do local/guichê
  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, params.locationId))
    .limit(1)

  const calledAt = new Date()

  // 3. Atualizar o status do ticket para CALLED
  const [updatedTicket] = await db
    .update(tickets)
    .set({
      status: 'CALLED',
      locationId: params.locationId,
      userId: params.userId || null,
      calledAt,
    })
    .where(eq(tickets.id, nextItem.ticket.id))
    .returning()

  // 4. Gerar fala naturalizada para o painel com as configurações da unidade
  const speechConfig = meta.speechConfig

  const speech = buildTicketAnnouncement(
    {
      ticketPrefix: updatedTicket.ticketPrefix,
      ticketNumber: updatedTicket.ticketNumber,
      formattedTicket: updatedTicket.formattedTicket,
      locationName: location?.name,
      locationNumber: location?.number,
      customerName: updatedTicket.customerName,
      priorityName: nextItem.priority.name,
    },
    speechConfig
  )

  const payload = {
    ticket: {
      ...updatedTicket,
      serviceName: nextItem.service.name,
      priorityName: nextItem.priority.name,
      priorityColor: nextItem.priority.colorHex,
      locationName: location ? `${location.name} ${location.number.toString().padStart(2, '0')}` : 'Guichê',
      locationShort: location?.number?.toString() || '01',
    },
    speech,
  }

  // 5. Notificar clientes conectados via Redis SSE
  await publishPanelEvent(params.unitId, {
    type: 'TICKET_CALLED',
    timestamp: calledAt.toISOString(),
    payload,
  })

  return { success: true, data: payload }
}

/**
 * Atendente chama uma senha específica selecionada na fila de espera (chamada avulsa).
 */
export async function callSpecificTicket(params: {
  ticketId: string
  unitId: string
  locationId: string
  userId?: string
}) {
  const [targetItem] = await db
    .select({
      ticket: tickets,
      service: services,
      priority: priorities,
    })
    .from(tickets)
    .innerJoin(services, eq(tickets.serviceId, services.id))
    .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
    .where(
      and(
        eq(tickets.id, params.ticketId),
        eq(tickets.unitId, params.unitId),
        eq(tickets.status, 'ISSUED')
      )
    )
    .limit(1)

  if (!targetItem) {
    return { success: false, message: 'Esta senha não está mais disponível na fila.' }
  }

  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, params.locationId))
    .limit(1)

  const calledAt = new Date()

  const [updatedTicket] = await db
    .update(tickets)
    .set({
      status: 'CALLED',
      locationId: params.locationId,
      userId: params.userId || null,
      calledAt,
    })
    .where(eq(tickets.id, targetItem.ticket.id))
    .returning()

  const [unitRecord] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, params.unitId))
    .limit(1)

  const meta = (unitRecord?.metadata as any) || {}
  const speechConfig = meta.speechConfig

  const speech = buildTicketAnnouncement(
    {
      ticketPrefix: updatedTicket.ticketPrefix,
      ticketNumber: updatedTicket.ticketNumber,
      formattedTicket: updatedTicket.formattedTicket,
      locationName: location?.name,
      locationNumber: location?.number,
      customerName: updatedTicket.customerName,
      priorityName: targetItem.priority.name,
    },
    speechConfig
  )

  const payload = {
    ticket: {
      ...updatedTicket,
      serviceName: targetItem.service.name,
      priorityName: targetItem.priority.name,
      priorityColor: targetItem.priority.colorHex,
      locationName: location ? `${location.name} ${location.number.toString().padStart(2, '0')}` : 'Guichê',
      locationShort: location?.number?.toString() || '01',
    },
    speech,
  }

  await publishPanelEvent(params.unitId, {
    type: 'TICKET_CALLED',
    timestamp: calledAt.toISOString(),
    payload,
  })

  return { success: true, data: payload }
}

/**
 * Rechamar a mesma senha no painel da TV e executar a voz novamente.
 */
export async function recallTicket(ticketId: string, unitId: string) {
  const [item] = await db
    .select({
      ticket: tickets,
      service: services,
      priority: priorities,
      location: locations,
    })
    .from(tickets)
    .innerJoin(services, eq(tickets.serviceId, services.id))
    .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
    .leftJoin(locations, eq(tickets.locationId, locations.id))
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!item) return { success: false, message: 'Senha não encontrada.' }

  const [unitRecord] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)

  const speechConfig = (unitRecord?.metadata as any)?.speechConfig

  const speech = buildTicketAnnouncement(
    {
      ticketPrefix: item.ticket.ticketPrefix,
      ticketNumber: item.ticket.ticketNumber,
      formattedTicket: item.ticket.formattedTicket,
      locationName: item.location?.name,
      locationNumber: item.location?.number,
      customerName: item.ticket.customerName,
      priorityName: item.priority.name,
    },
    speechConfig
  )

  const payload = {
    ticket: {
      ...item.ticket,
      serviceName: item.service.name,
      priorityName: item.priority.name,
      priorityColor: item.priority.colorHex,
      locationName: item.location ? `${item.location.name} ${item.location.number.toString().padStart(2, '0')}` : 'Guichê',
      locationShort: item.location?.number?.toString() || '01',
    },
    speech,
  }

  await publishPanelEvent(unitId, {
    type: 'TICKET_CALLED',
    timestamp: new Date().toISOString(),
    payload,
  })

  return { success: true, data: payload }
}

/**
 * Inicia o atendimento da senha chamada.
 */
export async function startAttendance(ticketId: string) {
  const [ticket] = await db
    .update(tickets)
    .set({
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId))
    .returning()

  return ticket
}

/**
 * Finaliza ou coloca em espera o atendimento da senha.
 * Suporta seleção de serviço, resoluções (SOLVED, PENDING, UNSOLVED), observação e ficha em espera.
 */
export async function finishAttendance(
  arg1: string | {
    ticketId: string
    serviceId?: string
    resolution: 'SOLVED' | 'PENDING' | 'UNSOLVED'
    observation?: string
    holdPending?: boolean
  },
  legacyResolution: 'SOLVED' | 'PENDING' = 'SOLVED'
) {
  let ticketId: string
  let serviceId: string | undefined
  let resolution: 'SOLVED' | 'PENDING' | 'UNSOLVED' = 'SOLVED'
  let observation: string | undefined
  let holdPending: boolean = false

  if (typeof arg1 === 'object') {
    ticketId = arg1.ticketId
    serviceId = arg1.serviceId
    resolution = arg1.resolution
    observation = arg1.observation
    holdPending = arg1.holdPending || false
  } else {
    ticketId = arg1
    resolution = legacyResolution
  }

  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!ticket) return null

  const now = new Date()
  const existingMeta = (ticket.metadata as any) || {}
  const updatedMeta = {
    ...existingMeta,
    observation: observation?.trim() || existingMeta.observation || null,
    resolution,
  }

  // 1. Caso o atendente coloque a ficha em espera (Pendente)
  if (holdPending) {
    const [held] = await db
      .update(tickets)
      .set({
        status: 'PENDING',
        resolution: 'PENDING',
        locationId: null, // Libera o guichê/posto imediatamente para a próxima senha
        metadata: {
          ...updatedMeta,
          pendingAt: now.toISOString(),
        },
      })
      .where(eq(tickets.id, ticketId))
      .returning()

    return { id: held.id, status: 'PENDING', held: true }
  }

  // 2. Conclusão definitiva (Resolvido, Não Resolvido ou Pendente finalizado)
  const finishedAt = now
  const waitTimeSeconds = ticket.calledAt
    ? Math.floor((ticket.calledAt.getTime() - ticket.createdAt.getTime()) / 1000)
    : 0
  const serviceTimeSeconds = ticket.startedAt
    ? Math.floor((finishedAt.getTime() - ticket.startedAt.getTime()) / 1000)
    : 0
  const totalTimeSeconds = Math.floor((finishedAt.getTime() - ticket.createdAt.getTime()) / 1000)

  // Grava no histórico permanente particionado
  await db.insert(ticketsHistory).values({
    id: ticket.id,
    unitId: ticket.unitId,
    serviceId: serviceId || ticket.serviceId,
    priorityId: ticket.priorityId,
    locationId: ticket.locationId,
    userId: ticket.userId,
    ticketNumber: ticket.ticketNumber,
    ticketPrefix: ticket.ticketPrefix,
    formattedTicket: ticket.formattedTicket,
    status: 'FINISHED',
    resolution,
    customerName: ticket.customerName,
    customerDoc: ticket.customerDoc,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt,
    startedAt: ticket.startedAt,
    finishedAt,
    waitTimeSeconds,
    serviceTimeSeconds,
    totalTimeSeconds,
    metadata: updatedMeta,
  })

  // Remove da tabela de senhas ativas
  await db.delete(tickets).where(eq(tickets.id, ticketId))

  return { id: ticket.id, status: 'FINISHED', held: false }
}

/**
 * Marca senha como não compareceu (No-Show).
 */
export async function markNoShow(ticketId: string) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1)
  if (!ticket) return null

  await db.insert(ticketsHistory).values({
    id: ticket.id,
    unitId: ticket.unitId,
    serviceId: ticket.serviceId,
    priorityId: ticket.priorityId,
    locationId: ticket.locationId,
    userId: ticket.userId,
    ticketNumber: ticket.ticketNumber,
    ticketPrefix: ticket.ticketPrefix,
    formattedTicket: ticket.formattedTicket,
    status: 'NO_SHOW',
    resolution: 'PENDING',
    customerName: ticket.customerName,
    customerDoc: ticket.customerDoc,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt,
    finishedAt: new Date(),
    metadata: ticket.metadata,
  })

  await db.delete(tickets).where(eq(tickets.id, ticketId))
  return { id: ticket.id, status: 'NO_SHOW' }
}

/**
 * Obtém os dados iniciais para carregar o painel da TV.
 */
export async function getPanelInitialData(unitId: string) {
  // 1. Dados da Unidade
  const [unit] = await db
    .select()
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)

  // 2. Última senha chamada ativa
  const activeTickets = await db
    .select({
      id: tickets.id,
      ticketPrefix: tickets.ticketPrefix,
      ticketNumber: tickets.ticketNumber,
      formattedTicket: tickets.formattedTicket,
      customerName: tickets.customerName,
      status: tickets.status,
      calledAt: tickets.calledAt,
      serviceName: services.name,
      priorityName: priorities.name,
      priorityColor: priorities.colorHex,
      locationName: locations.name,
      locationNumber: locations.number,
    })
    .from(tickets)
    .innerJoin(services, eq(tickets.serviceId, services.id))
    .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
    .leftJoin(locations, eq(tickets.locationId, locations.id))
    .where(and(eq(tickets.unitId, unitId), inArray(tickets.status, ['CALLED', 'IN_PROGRESS'])))
    .orderBy(desc(tickets.calledAt))
    .limit(6)

  const current = activeTickets[0]
  const history = activeTickets.slice(1).map((t) => ({
    ...t,
    locationFormatted: t.locationName && t.locationNumber !== null ? `${t.locationName} ${t.locationNumber.toString().padStart(2, '0')}` : 'Guichê',
  }))

  return {
    unit: unit || { name: 'Unidade Principal', code: 'UNI01' },
    currentTicket: current
      ? {
          ...current,
          locationFormatted: current.locationName && current.locationNumber !== null
            ? `${current.locationName} ${current.locationNumber.toString().padStart(2, '0')}`
            : 'Guichê 01',
          locationShort: current.locationNumber?.toString() || '01',
        }
      : null,
    history,
  }
}

/**
 * Obtém os serviços elegíveis para um guichê/atendente com base no vínculo de sala e usuário.
 */
export async function getAttendantEligibleServices(params: {
  unitId: string
  locationId?: string
  userId?: string
}) {
  let roomId: string | null = null
  if (params.locationId) {
    const [loc] = await db
      .select({ roomId: locations.roomId })
      .from(locations)
      .where(eq(locations.id, params.locationId))
      .limit(1)
    roomId = loc?.roomId || null
  }

  const allServices = await db
    .select({
      id: services.id,
      name: services.name,
      prefix: services.prefix,
      weight: services.weight,
      active: services.active,
      roomId: services.roomId,
      userId: services.userId,
    })
    .from(services)
    .where(and(eq(services.unitId, params.unitId), eq(services.active, true)))
    .orderBy(asc(services.name))

  const eligibleServices = allServices.filter((s) => {
    const isGlobal = !s.roomId && !s.userId
    const matchesRoom = roomId && s.roomId === roomId
    const matchesUser = params.userId && s.userId === params.userId
    return isGlobal || matchesRoom || matchesUser
  })

  return {
    allServices,
    eligibleServices,
    roomId,
  }
}

/**
 * Obtém o estado da fila de atendimento para a tela do atendente.
 * Retorna senhas em espera, senha ativa, fichas pendentes/on-hold e serviços elegíveis.
 */
export async function getAttendantQueueState(unitId: string, locationId?: string, userId?: string) {
  const eligibleData = await getAttendantEligibleServices({ unitId, locationId, userId })
  const eligibleServiceIds = eligibleData.eligibleServices.map((s) => s.id)

  const [waitingList, currentActive, pendingList, [unitRecord]] = await Promise.all([
    db
      .select({
        id: tickets.id,
        formattedTicket: tickets.formattedTicket,
        ticketPrefix: tickets.ticketPrefix,
        ticketNumber: tickets.ticketNumber,
        customerName: tickets.customerName,
        createdAt: tickets.createdAt,
        serviceId: services.id,
        serviceName: services.name,
        priorityName: priorities.name,
        priorityWeight: priorities.weight,
        priorityColor: priorities.colorHex,
      })
      .from(tickets)
      .innerJoin(services, eq(tickets.serviceId, services.id))
      .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
      .where(and(eq(tickets.unitId, unitId), eq(tickets.status, 'ISSUED')))
      .orderBy(desc(priorities.weight), asc(tickets.createdAt))
      .limit(20),

    locationId
      ? db
          .select({
            id: tickets.id,
            formattedTicket: tickets.formattedTicket,
            ticketPrefix: tickets.ticketPrefix,
            ticketNumber: tickets.ticketNumber,
            customerName: tickets.customerName,
            status: tickets.status,
            calledAt: tickets.calledAt,
            startedAt: tickets.startedAt,
            serviceId: services.id,
            serviceName: services.name,
            priorityName: priorities.name,
            priorityColor: priorities.colorHex,
            locationName: locations.name,
            locationNumber: locations.number,
            metadata: tickets.metadata,
          })
          .from(tickets)
          .innerJoin(services, eq(tickets.serviceId, services.id))
          .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
          .leftJoin(locations, eq(tickets.locationId, locations.id))
          .where(and(eq(tickets.unitId, unitId), eq(tickets.locationId, locationId), inArray(tickets.status, ['CALLED', 'IN_PROGRESS'])))
          .limit(1)
      : Promise.resolve([]),

    db
      .select({
        id: tickets.id,
        formattedTicket: tickets.formattedTicket,
        ticketPrefix: tickets.ticketPrefix,
        ticketNumber: tickets.ticketNumber,
        customerName: tickets.customerName,
        customerDoc: tickets.customerDoc,
        status: tickets.status,
        resolution: tickets.resolution,
        createdAt: tickets.createdAt,
        calledAt: tickets.calledAt,
        startedAt: tickets.startedAt,
        serviceId: services.id,
        serviceName: services.name,
        priorityName: priorities.name,
        priorityColor: priorities.colorHex,
        metadata: tickets.metadata,
      })
      .from(tickets)
      .innerJoin(services, eq(tickets.serviceId, services.id))
      .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
      .where(and(eq(tickets.unitId, unitId), eq(tickets.status, 'PENDING')))
      .orderBy(desc(tickets.createdAt))
      .limit(20),

    db.select({ metadata: units.metadata }).from(units).where(eq(units.id, unitId)).limit(1),
  ])

  const meta = (unitRecord?.metadata as any) || {}
  const attendanceConfig = {
    defaultOrderMode: (meta.attendanceConfig?.defaultOrderMode as 'PRIORITY' | 'INTERLEAVED') || 'PRIORITY',
    allowManualQueueSelection: meta.attendanceConfig?.allowManualQueueSelection ?? true,
  }

  return {
    waiting: waitingList,
    currentTicket: currentActive[0] || null,
    pendingTickets: pendingList,
    eligibleServices: eligibleData.eligibleServices,
    allServices: eligibleData.allServices,
    attendanceConfig,
  }
}

/**
 * Retoma o atendimento de uma ficha colocada em espera (pendente) no guichê do atendente.
 */
export async function resumePendingTicket(params: {
  ticketId: string
  unitId: string
  locationId: string
  userId?: string
}) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, params.ticketId), eq(tickets.unitId, params.unitId), eq(tickets.status, 'PENDING')))
    .limit(1)

  if (!ticket) {
    return { success: false, message: 'Ficha em espera não encontrada ou já concluída.' }
  }

  const [resumed] = await db
    .update(tickets)
    .set({
      status: 'IN_PROGRESS',
      locationId: params.locationId,
      userId: params.userId || null,
      startedAt: ticket.startedAt || new Date(),
    })
    .where(eq(tickets.id, params.ticketId))
    .returning()

  return { success: true, ticket: resumed }
}

/**
 * Redireciona o atendimento por erro de triagem, gerando uma nova senha para outro serviço/local.
 */
export async function redirectTicket(params: {
  currentTicketId: string
  unitId: string
  targetServiceId: string
  priorityId?: number
  reason?: string
  attendantUserId?: string
}) {
  const [current] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, params.currentTicketId), eq(tickets.unitId, params.unitId)))
    .limit(1)

  if (!current) {
    return { success: false, message: 'Senha atual não encontrada para redirecionamento.' }
  }

  const finishedAt = new Date()
  await db.insert(ticketsHistory).values({
    id: current.id,
    unitId: current.unitId,
    serviceId: current.serviceId,
    priorityId: current.priorityId,
    locationId: current.locationId,
    userId: params.attendantUserId || current.userId,
    ticketNumber: current.ticketNumber,
    ticketPrefix: current.ticketPrefix,
    formattedTicket: current.formattedTicket,
    status: 'REDIRECTED',
    resolution: 'UNSOLVED',
    customerName: current.customerName,
    customerDoc: current.customerDoc,
    createdAt: current.createdAt,
    calledAt: current.calledAt,
    startedAt: current.startedAt,
    finishedAt,
    metadata: {
      ...(current.metadata as any),
      redirectReason: params.reason?.trim() || 'Erro na triagem',
      targetServiceId: params.targetServiceId,
      redirectedByUserId: params.attendantUserId,
    },
  })

  // Remove senha anterior das ativas
  await db.delete(tickets).where(eq(tickets.id, current.id))

  // Emite nova senha para a fila com o serviço corrigido
  const newTicket = await issueTicket({
    unitId: params.unitId,
    serviceId: params.targetServiceId,
    priorityId: params.priorityId || current.priorityId,
    customerName: current.customerName || undefined,
    customerDoc: current.customerDoc || undefined,
  })

  return {
    success: true,
    previousFormattedTicket: current.formattedTicket,
    newTicket,
  }
}

/**
 * Consulta o histórico de fichas atendidas com filtros por data e busca por atendente ou cidadão.
 */
export async function getAttendedTicketsHistory(params: {
  unitId: string
  date?: string
  searchQuery?: string
}) {
  const targetDate = params.date || new Date().toISOString().slice(0, 10)

  const items = await db
    .select({
      id: ticketsHistory.id,
      ticketNumber: ticketsHistory.ticketNumber,
      ticketPrefix: ticketsHistory.ticketPrefix,
      formattedTicket: ticketsHistory.formattedTicket,
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
      serviceName: services.name,
      priorityName: priorities.name,
      priorityColor: priorities.colorHex,
      locationName: locations.name,
      locationNumber: locations.number,
      attendantName: users.name,
      attendantEmail: users.email,
    })
    .from(ticketsHistory)
    .innerJoin(services, eq(ticketsHistory.serviceId, services.id))
    .innerJoin(priorities, eq(ticketsHistory.priorityId, priorities.id))
    .leftJoin(locations, eq(ticketsHistory.locationId, locations.id))
    .leftJoin(users, eq(ticketsHistory.userId, users.id))
    .where(
      and(
        eq(ticketsHistory.unitId, params.unitId),
        sql`to_char(coalesce(${ticketsHistory.finishedAt}, ${ticketsHistory.createdAt}), 'YYYY-MM-DD') = ${targetDate}`
      )
    )
    .orderBy(desc(ticketsHistory.finishedAt))

  if (params.searchQuery && params.searchQuery.trim()) {
    const q = params.searchQuery.trim().toLowerCase()
    return items.filter((item) =>
      item.formattedTicket.toLowerCase().includes(q) ||
      (item.customerName && item.customerName.toLowerCase().includes(q)) ||
      (item.attendantName && item.attendantName.toLowerCase().includes(q)) ||
      (item.serviceName && item.serviceName.toLowerCase().includes(q))
    )
  }

  return items
}
