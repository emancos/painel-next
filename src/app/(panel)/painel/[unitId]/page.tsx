'use client'

import { useEffect, useState, useRef, use } from 'react'
import { FeaturedTicket, FeaturedTicketData } from '@/components/panel/FeaturedTicket'
import { TicketHistory, HistoryTicketItem } from '@/components/panel/TicketHistory'
import { DigitalClock } from '@/components/panel/DigitalClock'
import { speechManager } from '@/lib/speech'
import { Volume2, VolumeX, Maximize, Minimize, Radio, ShieldCheck } from 'lucide-react'

interface PanelPageProps {
  params: Promise<{ unitId: string }>
}

interface SseTicketPayload {
  ticket: {
    id: string
    formattedTicket: string
    ticketPrefix: string
    ticketNumber: number
    customerName?: string | null
    serviceName: string
    priorityName: string
    priorityColor?: string
    locationName: string
    locationShort: string
  }
  speech: {
    plainText: string
    ssml?: string
    voice: string
    rate?: string
    pitch?: string
  }
}

export default function TVPanelPage({ params }: PanelPageProps) {
  const resolvedParams = use(params)
  const unitId = resolvedParams.unitId

  interface QueuedCallItem {
    ticket: FeaturedTicketData
    speech: SseTicketPayload['speech']
    ticketId: string
  }

  const currentTicketRef = useRef<FeaturedTicketData | null>(null)
  const displayQueueRef = useRef<QueuedCallItem[]>([])
  const isDisplayingRef = useRef<boolean>(false)

  const [currentTicket, setCurrentTicket] = useState<FeaturedTicketData | null>(null)
  const [history, setHistory] = useState<HistoryTicketItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [unitName, setUnitName] = useState('Unidade de Atendimento')
  const [unitSubtitle, setUnitSubtitle] = useState<string | null>(null)
  const [unitLogoUrl, setUnitLogoUrl] = useState<string | null>(null)
  const [unitTimezone, setUnitTimezone] = useState<string>('America/Sao_Paulo')

  // Desbloqueio e ativação do áudio (exigido por navegadores modernos)
  const handleEnableAudio = () => {
    speechManager.unlockAudio()
    setAudioEnabled(true)
    speechManager.playChime()
  }

  // Alternar tela cheia da TV
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Processador sequencial da fila de chamadas com garantia de tempo de tela e áudio
  const processNextCall = async () => {
    if (displayQueueRef.current.length === 0) {
      isDisplayingRef.current = false
      return
    }

    isDisplayingRef.current = true
    const item = displayQueueRef.current.shift()!
    const newTicket = item.ticket
    const prev = currentTicketRef.current

    const isSameTicket = Boolean(
      prev && (prev.id === newTicket.id || prev.formattedTicket === newTicket.formattedTicket)
    )

    // 1. Atualiza a referência e o estado do ticket principal em destaque
    currentTicketRef.current = newTicket
    setCurrentTicket(newTicket)

    // 2. Atualiza o histórico lateral
    setHistory((prevHistory) => {
      if (isSameTicket) {
        return prevHistory
          .filter(
            (h) => h.id !== newTicket.id && h.formattedTicket !== newTicket.formattedTicket
          )
          .slice(0, 5)
      }

      const filtered = prevHistory.filter(
        (h) =>
          h.id !== newTicket.id &&
          h.formattedTicket !== newTicket.formattedTicket &&
          (!prev || (h.id !== prev.id && h.formattedTicket !== prev.formattedTicket))
      )

      if (prev) {
        const retiredTicket: HistoryTicketItem = {
          id: prev.id,
          formattedTicket: prev.formattedTicket,
          serviceName: prev.serviceName,
          priorityName: prev.priorityName,
          priorityColor: prev.priorityColor,
          locationFormatted: prev.locationFormatted,
          calledAt: new Date(),
        }
        return [retiredTicket, ...filtered].slice(0, 5)
      }

      return filtered.slice(0, 5)
    })

    // 3. Ativa efeito de flash na tela
    setIsFlashing(true)

    // 4. Notifica o backend e os atendentes que esta senha está SENDO REPRODUZIDA NA TELA AGORA
    fetch('/api/panel/ticket-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId,
        ticketId: item.ticketId,
        status: 'PLAYING',
        queueLength: displayQueueRef.current.length,
      }),
    }).catch((err) => console.warn('Aviso ao notificar PLAYING:', err))

    // 5. Toca o gongo e sintetiza a voz, garantindo tempo mínimo na tela de 6.5s
    const audioPromise = speechManager.playAnnouncement({
      text: item.speech.plainText,
      voice: item.speech.voice,
      rate: item.speech.rate,
      pitch: item.speech.pitch,
    })

    const minDisplayPromise = new Promise((resolve) => setTimeout(resolve, 6500))

    await Promise.all([audioPromise, minDisplayPromise])

    setIsFlashing(false)

    // 6. Notifica o backend e os atendentes que esta senha FOI REPRODUZIDA NA TELA
    fetch('/api/panel/ticket-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId,
        ticketId: item.ticketId,
        status: 'PLAYED',
        queueLength: displayQueueRef.current.length,
      }),
    }).catch((err) => console.warn('Aviso ao notificar PLAYED:', err))

    // 7. Pausa curta antes de passar para a próxima senha da fila (se houver)
    setTimeout(() => {
      processNextCall()
    }, 400)
  }

  // Carregar dados iniciais e conectar ao SSE em tempo real
  useEffect(() => {
    let isMounted = true

    // 1. Carregar dados iniciais via fetch
    fetch(`/api/panel-init?unitId=${encodeURIComponent(unitId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) return
        if (data.unit?.name) setUnitName(data.unit.name)
        if (data.unit?.subtitle) setUnitSubtitle(data.unit.subtitle)
        if (data.unit?.logoUrl) setUnitLogoUrl(data.unit.logoUrl)
        if (data.unit?.timezone) setUnitTimezone(data.unit.timezone)
        if (data.currentTicket) {
          currentTicketRef.current = data.currentTicket
          setCurrentTicket(data.currentTicket)
        }
        if (data.history && Array.isArray(data.history)) {
          const currentId = data.currentTicket?.id
          const currentFormatted = data.currentTicket?.formattedTicket
          const seen = new Set<string>()
          const initialHistory = (data.history as HistoryTicketItem[]).filter((item) => {
            if (currentId && item.id === currentId) return false
            if (currentFormatted && item.formattedTicket === currentFormatted) return false
            const key = item.formattedTicket || item.id
            if (seen.has(key)) return false
            seen.add(key)
            return true
          }).slice(0, 5)
          setHistory(initialHistory)
        }
      })
      .catch((err) => console.warn('Aviso: Carregando painel sem dados prévios:', err))

    // 2. Conectar ao Server-Sent Events (SSE)
    const eventSource = new EventSource(`/api/realtime/sse?unitId=${encodeURIComponent(unitId)}`)

    eventSource.onopen = () => {
      if (isMounted) setIsConnected(true)
    }

    eventSource.onerror = () => {
      if (isMounted) setIsConnected(false)
    }

    eventSource.onmessage = (event) => {
      if (!isMounted || !event.data) return

      try {
        const parsed = JSON.parse(event.data)

        if (parsed.type === 'TICKET_CALLED') {
          const payload = parsed.payload as SseTicketPayload
          const newTicket: FeaturedTicketData = {
            id: payload.ticket.id,
            formattedTicket: payload.ticket.formattedTicket,
            ticketPrefix: payload.ticket.ticketPrefix,
            ticketNumber: payload.ticket.ticketNumber,
            customerName: payload.ticket.customerName,
            serviceName: payload.ticket.serviceName,
            priorityName: payload.ticket.priorityName,
            priorityColor: payload.ticket.priorityColor,
            locationFormatted: payload.ticket.locationName,
            locationShort: payload.ticket.locationShort,
          }

          // Enfileira a nova chamada garantindo que ela não atropela a que está na tela
          displayQueueRef.current.push({
            ticket: newTicket,
            speech: payload.speech,
            ticketId: payload.ticket.id,
          })

          // Se a tela não estiver ocupada reproduzindo outra senha, inicia imediatamente
          if (!isDisplayingRef.current) {
            processNextCall()
          }
        }
      } catch (err) {
        console.warn('Erro ao processar mensagem do SSE:', err)
      }
    }

    return () => {
      isMounted = false
      eventSource.close()
      displayQueueRef.current = []
      isDisplayingRef.current = false
    }
  }, [unitId])

  return (
    <main className="min-h-screen flex flex-col p-6 md:p-8 justify-between relative bg-gradient-to-b from-[#090D16] via-[#0B132B] to-[#090D16]">
      {/* Barra Superior / Header */}
      <header className="flex items-center justify-between pb-6 mb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-4">
          {unitLogoUrl ? (
            <img
              src={unitLogoUrl}
              alt="Brasão da Unidade"
              className="w-14 h-14 object-contain rounded-2xl bg-white/5 border border-white/10 p-1.5"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-black tracking-wide text-white">
                {unitName}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {isConnected ? 'AO VIVO' : 'CONECTANDO...'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              {unitSubtitle || 'Painel de Atendimento em Tempo Real'}
            </p>
          </div>
        </div>

        {/* Controles de Áudio, Fullscreen e Relógio Digital */}
        <div className="flex items-center space-x-4 md:space-x-6">
          <button
            onClick={handleEnableAudio}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              audioEnabled
                ? 'bg-slate-800/80 text-cyan-400 border border-cyan-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold animate-bounce'
            }`}
            title={audioEnabled ? 'Áudio ativado' : 'Clique para ativar a chamada por voz'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? 'Voz Ativa' : 'Ativar Voz'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <DigitalClock timezone={unitTimezone} />
        </div>
      </header>

      {/* Área Central: Senha em Destaque + Histórico Lateral */}
      <section className="flex-1 flex flex-col lg:flex-row gap-6 my-2">
        <FeaturedTicket ticket={currentTicket} isFlashing={isFlashing} />
        <TicketHistory history={history} />
      </section>

      {/* Rodapé Institucional / Marquee Informativo */}
      <footer className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Atendimento conforme Lei Federal nº 10.048/2000 (Prioridades)</span>
        </div>

        <div className="hidden md:block overflow-hidden max-w-xl text-slate-500 text-right">
          <span>Ao ouvir sua senha, dirija-se com seus documentos ao guichê informado.</span>
        </div>
      </footer>
    </main>
  )
}
