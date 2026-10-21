import { NextRequest, NextResponse } from 'next/server'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

export const dynamic = 'force-dynamic'

// Cache em memória para sínteses de texto frequentes
const ttsAudioCache = new Map<string, Buffer>()
const MAX_CACHE_ITEMS = 300

// Mapeamento e validação de vozes válidas do Microsoft Edge-TTS
const VALID_VOICES = new Set([
  'pt-BR-FranciscaNeural',
  'pt-BR-AntonioNeural',
  'pt-BR-ThalitaMultilingualNeural',
  'pt-PT-RaquelNeural',
  'pt-PT-DuarteNeural',
])

function normalizeVoice(rawVoice?: string): string {
  if (!rawVoice) return 'pt-BR-FranciscaNeural'
  
  // Normaliza nomes antigos ou variantes
  if (rawVoice === 'pt-BR-ThalitaNeural') return 'pt-BR-ThalitaMultilingualNeural'
  if (VALID_VOICES.has(rawVoice)) return rawVoice

  // Fallback inteligente baseado em gênero do nome
  const lower = rawVoice.toLowerCase()
  if (lower.includes('antonio') || lower.includes('donato') || lower.includes('fabio') || lower.includes('humberto') || lower.includes('julio') || lower.includes('nicolau') || lower.includes('valerio') || lower.includes('duarte')) {
    return 'pt-BR-AntonioNeural'
  }
  if (lower.includes('thalita')) {
    return 'pt-BR-ThalitaMultilingualNeural'
  }
  if (lower.includes('raquel')) {
    return 'pt-PT-RaquelNeural'
  }
  return 'pt-BR-FranciscaNeural'
}

async function synthesizeToBuffer(text: string, voice: string, rate: string, pitch: string, retries = 2): Promise<Buffer> {
  const cacheKey = `${voice}_${rate}_${pitch}_${text}`
  if (ttsAudioCache.has(cacheKey)) {
    return ttsAudioCache.get(cacheKey)!
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const tts = new MsEdgeTTS()
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)

      const streamResult = tts.toStream(text, {
        rate: rate || '+0%',
        pitch: pitch || '+0Hz',
      })

      const chunks: Buffer[] = []
      await new Promise<void>((resolve, reject) => {
        streamResult.audioStream.on('data', (chunk: Buffer) => chunks.push(chunk))
        streamResult.audioStream.once('end', () => resolve())
        streamResult.audioStream.once('error', (err: Error) => reject(err))
      })

      const buffer = Buffer.concat(chunks)
      if (buffer.length === 0) {
        throw new Error('Nenhum dado de áudio foi retornado pelo sintetizador.')
      }

      // Salva no cache
      if (ttsAudioCache.size >= MAX_CACHE_ITEMS) {
        const firstKey = ttsAudioCache.keys().next().value
        if (firstKey) ttsAudioCache.delete(firstKey)
      }
      ttsAudioCache.set(cacheKey, buffer)

      return buffer
    } catch (err) {
      console.warn(`[API TTS] Tentativa ${attempt}/${retries} falhou (${voice}):`, (err as Error).message)
      if (attempt < retries) {
        // Pausa breve antes da tentativa seguinte para dissipar cooldown do gateway
        await new Promise((r) => setTimeout(r, 700))
      } else {
        throw err
      }
    }
  }

  throw new Error('Falha na síntese de áudio após tentativas.')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { text, voice: rawVoice, rate = '+0%', pitch = '+0Hz' } = body

    if (!text) {
      return NextResponse.json({ error: 'É necessário fornecer "text".' }, { status: 400 })
    }

    const voice = normalizeVoice(rawVoice)
    const audioBuffer = await synthesizeToBuffer(text, voice, rate, pitch)

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[API TTS POST] Erro ao sintetizar áudio:', error)
    return NextResponse.json(
      { error: 'Falha na síntese de voz via Edge-TTS', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const text = searchParams.get('text')
  const rawVoice = searchParams.get('voice') || 'pt-BR-FranciscaNeural'
  const rate = searchParams.get('rate') || '+0%'
  const pitch = searchParams.get('pitch') || '+0Hz'

  if (!text) {
    return NextResponse.json({ error: 'Parâmetro "text" é obrigatório.' }, { status: 400 })
  }

  try {
    const voice = normalizeVoice(rawVoice)
    const audioBuffer = await synthesizeToBuffer(text, voice, rate, pitch)

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('[API TTS GET] Erro ao sintetizar áudio:', error)
    return NextResponse.json({ error: 'Falha na síntese de voz' }, { status: 500 })
  }
}
