import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

// Global singleton to prevent multiple instances during Next.js Hot Reloading
declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined
}

export function getRedisClient(): Redis {
  if (process.env.NODE_ENV === 'production') {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }

  if (!global.__redisClient) {
    global.__redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        // Limit retry frequency in development if redis is not running
        const delay = Math.min(times * 500, 2000)
        return delay
      }
    })

    global.__redisClient.on('error', (err) => {
      // Log warning without crashing during local dev if redis container isn't up
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Redis] Connection warning (running in degraded fallback mode):', err.message)
      } else {
        console.error('[Redis] Connection error:', err)
      }
    })
  }

  return global.__redisClient
}

/**
 * Cria uma nova conexão dedicada para Subscriptions (Pub/Sub do Redis).
 * Clientes no modo de inscrição não podem executar outros comandos.
 */
export function createRedisSubscriber(): Redis {
  const sub = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })

  sub.on('error', (err) => {
    console.warn('[Redis Sub] Warning:', err.message)
  })

  return sub
}

export interface PanelEvent<T = unknown> {
  type:
    | 'TICKET_CALLED'
    | 'TICKET_UPDATED'
    | 'TICKET_FINISHED'
    | 'CONFIG_CHANGED'
    | 'TICKET_PLAYING'
    | 'TICKET_PLAYED'
    | 'TICKET_ISSUED'
    | 'PANEL_RESET'
    | 'DAILY_RESET'
  timestamp: string
  payload: T
}

/**
 * Publica um evento em tempo real para o canal da unidade informada.
 */
export async function publishPanelEvent<T>(unitId: string, event: PanelEvent<T>): Promise<void> {
  try {
    const client = getRedisClient()
    const channel = `unit:${unitId}:panel`
    await client.publish(channel, JSON.stringify(event))
  } catch (error) {
    console.error(`[Redis] Erro ao publicar no canal unit:${unitId}:panel:`, error)
  }
}
