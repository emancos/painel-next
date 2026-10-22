import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { tickets } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { publishPanelEvent } from '@/lib/redis'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { unitId, ticketId, status, queueLength } = body

    if (!unitId || !ticketId || !status) {
      return NextResponse.json({ error: 'Parâmetros unitId, ticketId e status são obrigatórios.' }, { status: 400 })
    }

    if (status !== 'PLAYING' && status !== 'PLAYED') {
      return NextResponse.json({ error: 'Status de reprodução inválido.' }, { status: 400 })
    }

    // 1. Atualiza atomicamente o broadcastStatus no metadata da senha
    await db
      .update(tickets)
      .set({
        metadata: sql`jsonb_set(COALESCE(${tickets.metadata}, '{}'::jsonb), '{broadcastStatus}', ${JSON.stringify(status)}::jsonb)`,
      })
      .where(eq(tickets.id, ticketId))

    // 2. Dispara evento via SSE para notificar todos os painéis e atendentes em tempo real
    await publishPanelEvent(unitId, {
      type: status === 'PLAYING' ? 'TICKET_PLAYING' : 'TICKET_PLAYED',
      timestamp: new Date().toISOString(),
      payload: {
        ticketId,
        status,
        queueLengthRemaining: queueLength ?? 0,
      },
    })

    return NextResponse.json({ success: true, ticketId, status })
  } catch (err) {
    console.error('[API ticket-status] Erro:', err)
    return NextResponse.json({ error: 'Erro ao processar status de reprodução.' }, { status: 500 })
  }
}
