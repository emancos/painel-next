'use client'

import { useEffect, useState, use } from 'react'
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

  const [currentTicket, setCurrentTicket] = useState<FeaturedTicketData | null>(null)
  const [history, setHistory] = useState<HistoryTicketItem[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [unitName, setUnitName] = useState('Unidade de Atendimento')
  const [unitSubtitle, setUnitSubtitle] = useState<string | null>(null)
  const [unitLogoUrl, setUnitLogoUrl] = useState<string | null>(null)

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
        if (data.currentTicket) {
          setCurrentTicket(data.currentTicket)
        }
        if (data.history) {
          setHistory(data.history)
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

          // Atualiza histórico empurrando o anterior
          setCurrentTicket((prev) => {
            if (prev) {
              setHistory((old) => [
                {
                  id: prev.id,
                  formattedTicket: prev.formattedTicket,
                  serviceName: prev.serviceName,
                  priorityName: prev.priorityName,
                  priorityColor: prev.priorityColor,
                  locationFormatted: prev.locationFormatted,
                  calledAt: new Date(),
                },
                ...old.slice(0, 5),
              ])
            }
            return newTicket
          })

          // Efeito de flash na tela
          setIsFlashing(true)
          setTimeout(() => setIsFlashing(false), 3600)

          // Síntese de voz com Edge-TTS e Chime
          speechManager.enqueue({
            text: payload.speech.plainText,
            voice: payload.speech.voice,
            rate: payload.speech.rate,
            pitch: payload.speech.pitch,
          })
        }
      } catch (err) {
        console.warn('Erro ao processar mensagem do SSE:', err)
      }
    }

    return () => {
      isMounted = false
      eventSource.close()
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

          <DigitalClock />
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
