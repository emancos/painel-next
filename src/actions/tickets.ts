'use server'

import { eq, and, desc, asc, inArray, sql, lte, gte, lt, or, isNull, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tickets, dailyCounters, services, priorities, locations, ticketsHistory, units, users, rooms, floors } from '@/lib/db/schema'
import { publishPanelEvent } from '@/lib/redis'
import { buildTicketAnnouncement, formatLocationCascade } from '@/lib/speech-normalizer'
import { getOperationalDate, getOperationalCycleStart } from '@/lib/operational-cycle'

export interface IssueTicketInput {
  unitId: string
  serviceId: string
  priorityId: number
  customerName?: string
  customerDoc?: string
}

/**
 * Obtém a unidade padrão ou especificada, juntamente com serviços, prioridades, locais, andares e salas.
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

  const [rawServices, activePriorities, activeLocations, waitingTickets, unitFloors, unitRooms] = await Promise.all([
    db
      .select({
        id: services.id,
        unitId: services.unitId,
        roomId: services.roomId,
        userId: services.userId,
        name: services.name,
        prefix: services.prefix,
        weight: services.weight,
        active: services.active,
        metadata: services.metadata,
        createdAt: services.createdAt,
        attendantName: users.name,
      })
      .from(services)
      .leftJoin(users, eq(services.userId, users.id))
      .where(and(eq(services.unitId, unit.id), eq(services.active, true)))
      .orderBy(asc(services.name)),
    db.select().from(priorities).where(eq(priorities.active, true)).orderBy(asc(priorities.id)),
    db
      .select({
        id: locations.id,
        name: locations.name,
        number: locations.number,
        roomId: locations.roomId,
        currentUserId: locations.currentUserId,
        active: locations.active,
        roomName: rooms.name,
        floorName: floors.name,
      })
      .from(locations)
      .leftJoin(rooms, eq(locations.roomId, rooms.id))
      .leftJoin(floors, eq(rooms.floorId, floors.id))
      .where(and(eq(locations.unitId, unit.id), eq(locations.active, true)))
      .orderBy(asc(locations.number)),
    db.select({ count: sql<number>`count(*)::int` }).from(tickets).where(and(eq(tickets.unitId, unit.id), eq(tickets.status, 'ISSUED'))),
    db.select().from(floors).where(and(eq(floors.unitId, unit.id), eq(floors.active, true))).orderBy(asc(floors.number)),
    db.select().from(rooms).where(and(eq(rooms.unitId, unit.id), eq(rooms.active, true))).orderBy(asc(rooms.name)),
  ])

  // Resolve a sala e o posto onde o atendente específico do serviço está lotado
  const activeServices = rawServices.map((s) => {
    let effectiveRoomId = s.roomId || null
    let attendantLocationName: string | null = null
    let attendantRoomName: string | null = null

    if (s.userId) {
      const loc = activeLocations.find((l) => l.currentUserId === s.userId)
      if (loc) {
        attendantLocationName = `${loc.name} ${loc.number.toString().padStart(2, '0')}`
        if (loc.roomId) {
          effectiveRoomId = loc.roomId
          attendantRoomName = loc.roomName || null
        }
      }
    }

    return {
      ...s,
      roomId: effectiveRoomId,
      attendantName: s.attendantName || null,
      locationName: attendantLocationName,
      roomName: attendantRoomName,
    }
  })

  return {
    unit,
    services: activeServices,
    priorities: activePriorities,
    locations: activeLocations,
    floors: unitFloors,
    rooms: unitRooms,
    waitingCount: waitingTickets[0]?.count || 0,
  }
}

/**
 * Emite uma nova senha para a fila com incremento atômico de número diário.
 */
export async function issueTicket(input: IssueTicketInput) {
  // 0. Obter configurações de reset automático de horário e timezone da unidade
  const [unitRecord] = await db
    .select({ metadata: units.metadata, timezone: units.timezone })
    .from(units)
    .where(eq(units.id, input.unitId))
    .limit(1)

  const attendanceConfig = (unitRecord?.metadata as any)?.attendanceConfig
  const autoResetEnabled = attendanceConfig?.autoResetEnabled ?? true
  const autoResetTime = autoResetEnabled ? (attendanceConfig?.autoResetTime || '00:00') : '00:00'
  const timeZone = unitRecord?.timezone || 'America/Sao_Paulo'
  const today = getOperationalDate(autoResetTime, timeZone)

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

  // 5. Notifica atendentes e painéis em tempo real
  await publishPanelEvent(input.unitId, {
    type: 'TICKET_ISSUED',
    timestamp: new Date().toISOString(),
    payload: {
      ticketId: newTicket.id,
      formattedTicket,
      ticketPrefix: service.prefix,
      ticketNumber,
      serviceId: input.serviceId,
      serviceName: service.name,
      priorityId: input.priorityId,
      priorityName: priority?.name || 'Normal',
      priorityColor: priority?.colorHex || '#06B6D4',
      customerName: input.customerName || null,
      createdAt: newTicket.createdAt,
      assignedUserId: service.userId || null,
    },
  })

  return {
    ...newTicket,
    serviceName: service.name,
    priorityName: priority?.name || 'Normal',
    priorityColor: priority?.colorHex || '#06B6D4',
    peopleAhead: ahead?.count || 1,
  }
}

/**
 * Determina a sala e o andar efetivos de atendimento em cascata:
 * 1. Prioridade para a sala vinculada diretamente à Mesa/Guichê.
 * 2. Se a Mesa/Guichê for geral (sem sala cadastrada), herda a sala e andar vinculado ao Serviço da senha.
 */
async function resolveEffectiveRoomAndFloor(
  locationRoomName?: string | null,
  locationFloorName?: string | null,
  serviceRoomId?: string | null
): Promise<{ roomName: string | null; floorName: string | null }> {
  if (locationRoomName) {
    return {
      roomName: locationRoomName,
      floorName: locationFloorName || null,
    }
  }

  if (serviceRoomId) {
    const [svcRoom] = await db
      .select({
        roomName: rooms.name,
        floorName: floors.name,
      })
      .from(rooms)
      .leftJoin(floors, eq(rooms.floorId, floors.id))
      .where(eq(rooms.id, serviceRoomId))
      .limit(1)

    if (svcRoom) {
      return {
        roomName: svcRoom.roomName || null,
        floorName: svcRoom.floorName || null,
      }
    }
  }

  return { roomName: null, floorName: null }
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
  // 0. Garante que não há atendimento em andamento ou chamado neste guichê/posto
  const [existingActive] = await db
    .select({
      id: tickets.id,
      formattedTicket: tickets.formattedTicket,
      status: tickets.status,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.unitId, params.unitId),
        eq(tickets.locationId, params.locationId),
        inArray(tickets.status, ['CALLED', 'IN_PROGRESS'])
      )
    )
    .limit(1)

  if (existingActive) {
    return {
      success: false,
      message: `A senha ${existingActive.formattedTicket} já está em atendimento neste posto. Finalize-a ou marque como 'Não Veio' antes de chamar a próxima.`,
    }
  }

  // 1. Carrega dados da unidade para obter configurações de atendimento
  const [unitRecord] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, params.unitId))
    .limit(1)

  // 1.1 Identifica serviços elegíveis para este atendente e posto
  const eligibleData = await getAttendantEligibleServices({
    unitId: params.unitId,
    locationId: params.locationId,
    userId: params.userId,
  })
  const eligibleServiceIds = eligibleData.eligibleServices.map((s) => s.id)

  if (eligibleServiceIds.length === 0) {
    return {
      success: false,
      message: 'Nenhum serviço elegível para o seu posto de atendimento no momento.',
    }
  }

  const allowedServiceIds = params.serviceIds && params.serviceIds.length > 0
    ? params.serviceIds.filter((id) => eligibleServiceIds.includes(id))
    : eligibleServiceIds

  if (allowedServiceIds.length === 0) {
    return {
      success: false,
      message: 'Você não possui permissão para chamar os serviços especificados.',
    }
  }

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
            inArray(tickets.serviceId, allowedServiceIds),
            or(
              isNull(services.userId),
              params.userId ? eq(services.userId, params.userId) : sql`FALSE`
            )
          )
        )
        .orderBy(asc(tickets.createdAt))
        .limit(1)
        .for('update', { of: tickets, skipLocked: true })

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
          inArray(tickets.serviceId, allowedServiceIds),
          or(
            isNull(services.userId),
            params.userId ? eq(services.userId, params.userId) : sql`FALSE`
          )
        )
      )
      .orderBy(desc(priorities.weight), asc(tickets.createdAt))
      .limit(1)
      .for('update', { of: tickets, skipLocked: true })

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

  // 2. Obter informações do local/guichê com cascata de sala e andar
  const [location] = await db
    .select({
      id: locations.id,
      name: locations.name,
      number: locations.number,
      roomId: locations.roomId,
      roomName: rooms.name,
      floorName: floors.name,
    })
    .from(locations)
    .leftJoin(rooms, eq(locations.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .where(eq(locations.id, params.locationId))
    .limit(1)

  const calledAt = new Date()

  // 3. Atualizar o status do ticket para CALLED e definir broadcastStatus como WAITING
  const [updatedTicket] = await db
    .update(tickets)
    .set({
      status: 'CALLED',
      locationId: params.locationId,
      userId: params.userId || null,
      calledAt,
      metadata: sql`jsonb_set(COALESCE(${tickets.metadata}, '{}'::jsonb), '{broadcastStatus}', '"WAITING"'::jsonb)`,
    })
    .where(eq(tickets.id, nextItem.ticket.id))
    .returning()

  // 4. Gerar fala naturalizada para o painel com as configurações da unidade em cascata
  const speechConfig = meta.speechConfig
  const { roomName: effectiveRoomName, floorName: effectiveFloorName } =
    await resolveEffectiveRoomAndFloor(location?.roomName, location?.floorName, nextItem?.service?.roomId)

  const locCascade = formatLocationCascade(effectiveFloorName, effectiveRoomName, location?.name, location?.number)

  const speech = buildTicketAnnouncement(
    {
      ticketPrefix: updatedTicket.ticketPrefix,
      ticketNumber: updatedTicket.ticketNumber,
      formattedTicket: updatedTicket.formattedTicket,
      locationName: location?.name,
      locationNumber: location?.number,
      floorName: effectiveFloorName,
      roomName: effectiveRoomName,
      customerName: updatedTicket.customerName,
      priorityName: nextItem.priority.name,
    },
    speechConfig
  )

  console.log('[Chamada Painel] Chamada de senha emitida:', {
    ticket: updatedTicket.formattedTicket,
    mesa: `${location?.name} ${location?.number}`,
    andar: effectiveFloorName,
    sala: effectiveRoomName,
    textoVoz: speech.plainText,
  })

  const payload = {
    ticket: {
      ...updatedTicket,
      serviceName: nextItem.service.name,
      priorityName: nextItem.priority.name,
      priorityColor: nextItem.priority.colorHex,
      locationName: locCascade.formatted,
      locationPlace: locCascade.place,
      locationShort: locCascade.short,
      floorName: effectiveFloorName,
      roomName: effectiveRoomName,
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
  // 0. Garante que não há atendimento em andamento ou chamado neste guichê/posto
  const [existingActive] = await db
    .select({
      id: tickets.id,
      formattedTicket: tickets.formattedTicket,
      status: tickets.status,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.unitId, params.unitId),
        eq(tickets.locationId, params.locationId),
        inArray(tickets.status, ['CALLED', 'IN_PROGRESS'])
      )
    )
    .limit(1)

  if (existingActive) {
    return {
      success: false,
      message: `A senha ${existingActive.formattedTicket} já está em atendimento neste posto. Finalize-a ou marque como 'Não Veio' antes de chamar outra senha.`,
    }
  }

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

  // Validação: se o serviço for restrito a um atendente específico, apenas ele pode chamar
  if (targetItem.service.userId && targetItem.service.userId !== params.userId) {
    return {
      success: false,
      message: 'Esta senha pertence a um serviço exclusivo de outro atendente e só pode ser chamada por ele.',
    }
  }

  const [location] = await db
    .select({
      id: locations.id,
      name: locations.name,
      number: locations.number,
      roomId: locations.roomId,
      roomName: rooms.name,
      floorName: floors.name,
    })
    .from(locations)
    .leftJoin(rooms, eq(locations.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
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
      metadata: sql`jsonb_set(COALESCE(${tickets.metadata}, '{}'::jsonb), '{broadcastStatus}', '"WAITING"'::jsonb)`,
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
  const { roomName: effectiveRoomName, floorName: effectiveFloorName } =
    await resolveEffectiveRoomAndFloor(location?.roomName, location?.floorName, targetItem?.service?.roomId)

  const locCascade = formatLocationCascade(effectiveFloorName, effectiveRoomName, location?.name, location?.number)

  const speech = buildTicketAnnouncement(
    {
      ticketPrefix: updatedTicket.ticketPrefix,
      ticketNumber: updatedTicket.ticketNumber,
      formattedTicket: updatedTicket.formattedTicket,
      locationName: location?.name,
      locationNumber: location?.number,
      floorName: effectiveFloorName,
      roomName: effectiveRoomName,
      customerName: updatedTicket.customerName,
      priorityName: targetItem.priority.name,
    },
    speechConfig
  )

  console.log('[Chamada Painel] Chamada avulsa:', {
    ticket: updatedTicket.formattedTicket,
    mesa: `${location?.name} ${location?.number}`,
    andar: effectiveFloorName,
    sala: effectiveRoomName,
    textoVoz: speech.plainText,
  })

  const payload = {
    ticket: {
      ...updatedTicket,
      serviceName: targetItem.service.name,
      priorityName: targetItem.priority.name,
      priorityColor: targetItem.priority.colorHex,
      locationName: locCascade.formatted,
      locationPlace: locCascade.place,
      locationShort: locCascade.short,
      floorName: effectiveFloorName,
      roomName: effectiveRoomName,
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
      roomName: rooms.name,
      floorName: floors.name,
    })
    .from(tickets)
    .innerJoin(services, eq(tickets.serviceId, services.id))
    .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
    .leftJoin(locations, eq(tickets.locationId, locations.id))
    .leftJoin(rooms, eq(locations.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!item) return { success: false, message: 'Senha não encontrada.' }

  const [unitRecord] = await db
    .select({ metadata: units.metadata })
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)

  const speechConfig = (unitRecord?.metadata as any)?.speechConfig
  const { roomName: effectiveRoomName, floorName: effectiveFloorName } =
    await resolveEffectiveRoomAndFloor(item.roomName, item.floorName, item.service?.roomId)

  const locCascade = formatLocationCascade(effectiveFloorName, effectiveRoomName, item.location?.name, item.location?.number)

  const speech = buildTicketAnnouncement(
    {
      ticketPrefix: item.ticket.ticketPrefix,
      ticketNumber: item.ticket.ticketNumber,
      formattedTicket: item.ticket.formattedTicket,
      locationName: item.location?.name,
      locationNumber: item.location?.number,
      floorName: effectiveFloorName,
      roomName: effectiveRoomName,
      customerName: item.ticket.customerName,
      priorityName: item.priority.name,
    },
    speechConfig
  )

  console.log('[Chamada Painel] Rechamar senha:', {
    ticket: item.ticket.formattedTicket,
    mesa: `${item.location?.name} ${item.location?.number}`,
    andar: effectiveFloorName,
    sala: effectiveRoomName,
    textoVoz: speech.plainText,
  })

  const payload = {
    ticket: {
      ...item.ticket,
      serviceName: item.service.name,
      priorityName: item.priority.name,
      priorityColor: item.priority.colorHex,
      locationName: locCascade.formatted,
      locationPlace: locCascade.place,
      locationShort: locCascade.short,
      floorName: effectiveFloorName,
      roomName: effectiveRoomName,
    },
    speech,
  }

  await db
    .update(tickets)
    .set({
      metadata: sql`jsonb_set(COALESCE(${tickets.metadata}, '{}'::jsonb), '{broadcastStatus}', '"WAITING"'::jsonb)`,
    })
    .where(eq(tickets.id, item.ticket.id))

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
 * Suporta filtragem por serviços específicos caso a tela seja de um setor determinado.
 */
export async function getPanelInitialData(unitId: string, serviceIds?: string[]) {
  // 1. Dados da Unidade
  const [unit] = await db
    .select()
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1)

  if (!unit) {
    return {
      unit: null,
      allServices: [],
      currentTicket: null,
      history: [],
    }
  }

  const attendanceConfig = (unit.metadata as any)?.attendanceConfig
  const autoResetEnabled = attendanceConfig?.autoResetEnabled ?? true
  const autoResetTime = autoResetEnabled ? (attendanceConfig?.autoResetTime || '00:00') : '00:00'
  const timeZone = unit.timezone || 'America/Sao_Paulo'
  const cycleStart = getOperationalCycleStart(autoResetTime, timeZone)

  // 1.1 Lista de serviços ativos da unidade (para configuração do painel)
  const allServices = await db
    .select({
      id: services.id,
      name: services.name,
      prefix: services.prefix,
    })
    .from(services)
    .where(and(eq(services.unitId, unitId), eq(services.active, true)))
    .orderBy(asc(services.name))

  // 1.2 Mapa de salas e andares da unidade para fallback rápido caso o guichê não tenha sala direta
  const unitRoomsWithFloors = await db
    .select({
      roomId: rooms.id,
      roomName: rooms.name,
      floorName: floors.name,
    })
    .from(rooms)
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .where(eq(rooms.unitId, unitId))

  const roomMap = new Map(unitRoomsWithFloors.map((r) => [r.roomId, r]))

  const validServiceIds = Array.isArray(serviceIds) && serviceIds.length > 0 ? serviceIds : null

  // 1.3 Limpeza de senhas em atendimento/chamadas de ciclos anteriores para iniciar o painel limpo
  const staleActiveTickets = await db
    .select()
    .from(tickets)
    .where(
      and(
        eq(tickets.unitId, unitId),
        inArray(tickets.status, ['CALLED', 'IN_PROGRESS']),
        lt(tickets.calledAt, cycleStart)
      )
    )

  if (staleActiveTickets.length > 0) {
    const now = new Date()
    const historyRows = staleActiveTickets.map((t) => ({
      id: t.id,
      unitId: t.unitId,
      serviceId: t.serviceId,
      priorityId: t.priorityId,
      locationId: t.locationId,
      userId: t.userId,
      ticketNumber: t.ticketNumber,
      ticketPrefix: t.ticketPrefix,
      formattedTicket: t.formattedTicket,
      status: 'FINISHED',
      resolution: 'UNSOLVED',
      customerName: t.customerName,
      customerDoc: t.customerDoc,
      createdAt: t.createdAt,
      calledAt: t.calledAt,
      finishedAt: now,
      metadata: {
        ...(t.metadata as any),
        finishedReason: 'Auto-finalizado na virada do ciclo diário para painel limpo',
        finishedAt: now.toISOString(),
      },
    }))
    await db.insert(ticketsHistory).values(historyRows).catch(() => {})
    await db.delete(tickets).where(inArray(tickets.id, staleActiveTickets.map((t) => t.id))).catch(() => {})
  }

  // 1.4 Se configurado, arquiva também senhas emitidas e não atendidas do dia anterior
  if (attendanceConfig?.autoResetClearQueue) {
    const staleWaiting = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.unitId, unitId),
          eq(tickets.status, 'ISSUED'),
          lt(tickets.createdAt, cycleStart)
        )
      )

    if (staleWaiting.length > 0) {
      const now = new Date()
      const historyRows = staleWaiting.map((t) => ({
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
          cancelledReason: 'Fila arquivada automaticamente na virada do ciclo diário',
          cancelledAt: now.toISOString(),
        },
      }))
      await db.insert(ticketsHistory).values(historyRows).catch(() => {})
      await db.delete(tickets).where(inArray(tickets.id, staleWaiting.map((t) => t.id))).catch(() => {})
    }
  }

  // 2. Senhas ativas no momento (somente chamadas no ciclo operacional atual)
  const activeConditions = [
    eq(tickets.unitId, unitId),
    inArray(tickets.status, ['CALLED', 'IN_PROGRESS']),
    gte(tickets.calledAt, cycleStart),
  ]
  if (validServiceIds) {
    activeConditions.push(inArray(tickets.serviceId, validServiceIds))
  }

  const activeTickets = await db
    .select({
      id: tickets.id,
      serviceId: tickets.serviceId,
      serviceRoomId: services.roomId,
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
      roomName: rooms.name,
      floorName: floors.name,
    })
    .from(tickets)
    .innerJoin(services, eq(tickets.serviceId, services.id))
    .innerJoin(priorities, eq(tickets.priorityId, priorities.id))
    .leftJoin(locations, eq(tickets.locationId, locations.id))
    .leftJoin(rooms, eq(locations.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .where(and(...activeConditions))
    .orderBy(desc(tickets.calledAt))
    .limit(15)

  // 3. Chamadas anteriores concluídas recentemente (somente chamadas no ciclo operacional atual)
  const historyConditions = [
    eq(ticketsHistory.unitId, unitId),
    sql`${ticketsHistory.calledAt} IS NOT NULL`,
    gte(ticketsHistory.calledAt, cycleStart),
  ]
  if (validServiceIds) {
    historyConditions.push(inArray(ticketsHistory.serviceId, validServiceIds))
  }

  const recentFinished = await db
    .select({
      id: ticketsHistory.id,
      serviceId: ticketsHistory.serviceId,
      serviceRoomId: services.roomId,
      ticketPrefix: ticketsHistory.ticketPrefix,
      ticketNumber: ticketsHistory.ticketNumber,
      formattedTicket: ticketsHistory.formattedTicket,
      customerName: ticketsHistory.customerName,
      status: ticketsHistory.status,
      calledAt: ticketsHistory.calledAt,
      serviceName: services.name,
      priorityName: priorities.name,
      priorityColor: priorities.colorHex,
      locationName: locations.name,
      locationNumber: locations.number,
      roomName: rooms.name,
      floorName: floors.name,
    })
    .from(ticketsHistory)
    .innerJoin(services, eq(ticketsHistory.serviceId, services.id))
    .innerJoin(priorities, eq(ticketsHistory.priorityId, priorities.id))
    .leftJoin(locations, eq(ticketsHistory.locationId, locations.id))
    .leftJoin(rooms, eq(locations.roomId, rooms.id))
    .leftJoin(floors, eq(rooms.floorId, floors.id))
    .where(and(...historyConditions))
    .orderBy(desc(ticketsHistory.calledAt))
    .limit(15)

  const current = activeTickets[0] || (recentFinished.length > 0 ? recentFinished[0] : null)

  // Candidatos ao histórico combinando ativos e finalizados do ciclo corrente
  const rawHistoryCandidates = [
    ...activeTickets.slice(activeTickets[0] ? 1 : 0),
    ...recentFinished.slice(!activeTickets[0] && recentFinished[0] ? 1 : 0),
  ]

  // Ordena decrescente por horário em que foram chamadas
  rawHistoryCandidates.sort((a, b) => {
    const timeA = a.calledAt ? new Date(a.calledAt).getTime() : 0
    const timeB = b.calledAt ? new Date(b.calledAt).getTime() : 0
    return timeB - timeA
  })

  // Deduplica rigorosamente por formattedTicket e id, e garante que o current não se repita
  const seenKeys = new Set<string>()
  if (current) {
    seenKeys.add(current.id)
    seenKeys.add(current.formattedTicket)
  }

  const history = rawHistoryCandidates
    .filter((t) => {
      if (seenKeys.has(t.id) || seenKeys.has(t.formattedTicket)) {
        return false
      }
      seenKeys.add(t.id)
      seenKeys.add(t.formattedTicket)
      return true
    })
    .slice(0, 8)
    .map((t) => {
      const fallbackRoom = t.serviceRoomId ? roomMap.get(t.serviceRoomId) : null
      const effectiveRoomName = t.roomName || fallbackRoom?.roomName || null
      const effectiveFloorName = t.floorName || fallbackRoom?.floorName || null
      const locCascade = formatLocationCascade(effectiveFloorName, effectiveRoomName, t.locationName, t.locationNumber)
      return {
        ...t,
        locationFormatted: locCascade.formatted,
        locationPlace: locCascade.place,
        locationShort: locCascade.short,
        floorName: effectiveFloorName,
        roomName: effectiveRoomName,
      }
    })

  let currentLocCascade = null
  let currentEffectiveRoom = null
  let currentEffectiveFloor = null

  if (current) {
    const fallbackRoom = current.serviceRoomId ? roomMap.get(current.serviceRoomId) : null
    currentEffectiveRoom = current.roomName || fallbackRoom?.roomName || null
    currentEffectiveFloor = current.floorName || fallbackRoom?.floorName || null
    currentLocCascade = formatLocationCascade(currentEffectiveFloor, currentEffectiveRoom, current.locationName, current.locationNumber)
  }

  return {
    unit: {
      id: unit.id,
      code: unit.code,
      name: unit.name,
      subtitle: unit.subtitle,
      logoUrl: unit.logoUrl,
      timezone: unit.timezone,
      autoResetEnabled,
      autoResetTime,
      cycleStart: cycleStart.toISOString(),
    },
    allServices,
    currentTicket: current
      ? {
          ...current,
          locationFormatted: currentLocCascade!.formatted,
          locationPlace: currentLocCascade!.place,
          locationShort: currentLocCascade!.short,
          floorName: currentEffectiveFloor,
          roomName: currentEffectiveRoom,
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

  // Se não foi passado locationId ou o local não tinha sala definida, resolve pela lotação do usuário
  if (!roomId && params.userId) {
    const [userLoc] = await db
      .select({ roomId: locations.roomId })
      .from(locations)
      .where(and(eq(locations.currentUserId, params.userId), eq(locations.active, true)))
      .limit(1)
    if (userLoc?.roomId) {
      roomId = userLoc.roomId
    }
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
    // 1. Se o serviço tem atendente exclusivo, apenas aquele atendente específico é elegível
    if (s.userId) {
      return Boolean(params.userId && s.userId === params.userId)
    }

    // 2. Se o serviço NÃO tem atendente exclusivo (geral da unidade ou da sala)
    const isGlobal = !s.roomId
    const matchesRoom = Boolean(roomId && s.roomId === roomId)
    return isGlobal || matchesRoom
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
    eligibleServiceIds.length > 0
      ? db
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
          .where(
            and(
              eq(tickets.unitId, unitId),
              eq(tickets.status, 'ISSUED'),
              inArray(tickets.serviceId, eligibleServiceIds),
              or(
                isNull(services.userId),
                userId ? eq(services.userId, userId) : sql`FALSE`
              )
            )
          )
          .orderBy(desc(priorities.weight), asc(tickets.createdAt))
          .limit(20)
      : Promise.resolve([]),

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
  const cfg = meta.attendanceConfig || {}
  const attendanceConfig = {
    defaultOrderMode: (cfg.defaultOrderMode as 'PRIORITY' | 'INTERLEAVED') || 'PRIORITY',
    allowManualQueueSelection: cfg.allowManualQueueSelection ?? true,
    autoResetEnabled: cfg.autoResetEnabled ?? true,
    autoResetTime: cfg.autoResetTime || '00:00',
    autoResetClearQueue: cfg.autoResetClearQueue ?? false,
    lastManualResetAt: cfg.lastManualResetAt || null,
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
  // 0. Garante que não há atendimento em andamento ou chamado neste guichê/posto
  const [existingActive] = await db
    .select({
      id: tickets.id,
      formattedTicket: tickets.formattedTicket,
      status: tickets.status,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.unitId, params.unitId),
        eq(tickets.locationId, params.locationId),
        inArray(tickets.status, ['CALLED', 'IN_PROGRESS'])
      )
    )
    .limit(1)

  if (existingActive) {
    return {
      success: false,
      message: `A senha ${existingActive.formattedTicket} já está em atendimento neste posto. Finalize-a ou marque como 'Não Veio' antes de retomar outra ficha.`,
    }
  }

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
  const [unitRec] = await db
    .select({ timezone: units.timezone })
    .from(units)
    .where(eq(units.id, params.unitId))
    .limit(1)

  const timeZone = unitRec?.timezone || 'America/Sao_Paulo'
  const targetDate = params.date || getOperationalDate('00:00', timeZone)

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
        sql`to_char(coalesce(${ticketsHistory.finishedAt}, ${ticketsHistory.createdAt}) AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') = ${targetDate}`
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
