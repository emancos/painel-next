import { NextRequest } from 'next/server'
import { createRedisSubscriber } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const unitId = searchParams.get('unitId')

  if (!unitId) {
    return new Response('Parâmetro unitId é obrigatório.', { status: 400 })
  }

  const encoder = new TextEncoder()
  let subscriber: ReturnType<typeof createRedisSubscriber> | null = null
  let heartbeatTimer: NodeJS.Timeout | null = null

  const stream = new ReadableStream({
    start(controller) {
      // 1. Mensagem inicial de conexão estabelecida
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', unitId })}\n\n`))

      try {
        // 2. Conectar ao Redis Subscriber
        subscriber = createRedisSubscriber()
        const channel = `unit:${unitId}:panel`

        subscriber.subscribe(channel, (err) => {
          if (err) {
            console.error(`[SSE] Erro ao subscrever canal ${channel}:`, err)
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Falha no canal Redis' })}\n\n`))
          }
        })

        subscriber.on('message', (_ch, message) => {
          try {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`))
          } catch {
            // Controller já pode ter sido fechado pelo cliente
          }
        })
      } catch (err) {
        console.warn('[SSE] Redis indisponível no momento. Conexão mantida em fallback local:', (err as Error).message)
      }

      // 3. Heartbeat a cada 15 segundos para manter a conexão viva contra timeouts de proxies/firewall
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer)
        }
      }, 15000)
    },

    cancel() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }
      if (subscriber) {
        subscriber.unsubscribe().catch(() => {})
        subscriber.quit().catch(() => {})
        subscriber = null
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Evita buffering no Nginx
    },
  })
}
