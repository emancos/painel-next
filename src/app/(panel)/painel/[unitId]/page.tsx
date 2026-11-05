'use client'

import { useEffect, useState, useRef, use, useCallback } from 'react'
import Link from 'next/link'
import { FeaturedTicket, FeaturedTicketData, LocationTextSize } from '@/components/panel/FeaturedTicket'
import { TicketHistory, HistoryTicketItem } from '@/components/panel/TicketHistory'
import { DigitalClock } from '@/components/panel/DigitalClock'
import { speechManager } from '@/lib/speech'
import { getOperationalDate } from '@/lib/operational-cycle'
import { setDocumentFavicon } from '@/lib/favicon'
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Filter,
} from 'lucide-react'

interface PanelPageProps {
  params: Promise<{ unitId: string }>
}

interface SseTicketPayload {
  ticket: {
    id: string
    serviceId?: string
    formattedTicket: string
    ticketPrefix: string
    ticketNumber: number
    customerName?: string | null
    serviceName: string
    priorityName: string
    priorityColor?: string
    locationName: string
    locationShort: string
    locationPlace?: string
    floorName?: string | null
    roomName?: string | null
    roomNumber?: string | null
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

  // Referência do filtro de serviços mantida em sincronia para o listener SSE
  const selectedServiceIdsRef = useRef<string[]>([])

  // Configurações de reset programado diário para limpar o painel no início do expediente
  const autoResetConfigRef = useRef<{ enabled: boolean; time: string; timezone: string }>({
    enabled: true,
    time: '00:00',
    timezone: 'America/Sao_Paulo',
  })
  const operationalCycleKeyRef = useRef<string | null>(null)

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

  // Configurações da tela: Tema (Padrão: Claro), Layout (Padrão: classic) e Escala dos Textos do Local
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [layout, setLayout] = useState<'classic' | 'widescreen' | 'compact'>('classic')
  const [locationTextSize, setLocationTextSize] = useState<LocationTextSize>('md')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  // Função utilitária para calcular a chave do ciclo operacional corrente da unidade
  const getOperationalCycleKey = (autoResetTime: string = '00:00', timeZone: string = 'America/Sao_Paulo'): string => {
    return getOperationalDate(autoResetTime, timeZone)
  }

  // Desbloqueio e ativação do áudio (exigido por navegadores modernos)
  const handleEnableAudio = () => {
    speechManager.unlockAudio()
    setAudioEnabled(true)
    speechManager.playChime()
  }

  // Verificador robusto de tela cheia (HTML5 Fullscreen API, display-mode ou dimensão nativa F11)
  const checkIsFullscreen = useCallback(() => {
    if (typeof window === 'undefined') return false
    const hasFsElement = Boolean(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
    const isDisplayModeFs = Boolean(
      window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches
    )
    const isWindowFs =
      Math.abs(window.innerHeight - window.screen.height) <= 10 &&
      Math.abs(window.innerWidth - window.screen.width) <= 10

    return hasFsElement || isDisplayModeFs || isWindowFs
  }, [])

  // Alternar tela cheia da TV (suporta tanto clique no botão quanto tecla F11)
  const toggleFullscreen = useCallback(() => {
    const isCurrentlyFs = checkIsFullscreen()

    if (!isCurrentlyFs) {
      const docEl = document.documentElement as any
      const requestFs =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen
      if (requestFs) {
        requestFs
          .call(docEl)
          .then(() => setIsFullscreen(true))
          .catch(() => setIsFullscreen(true))
      } else {
        setIsFullscreen(true)
      }
    } else {
      const doc = document as any
      const exitFs =
        doc.exitFullscreen ||
        doc.webkitExitFullscreen ||
        doc.mozCancelFullScreen ||
        doc.msExitFullscreen
      if (document.fullscreenElement && exitFs) {
        exitFs
          .call(doc)
          .then(() => setIsFullscreen(false))
          .catch(() => setIsFullscreen(false))
      } else {
        setIsFullscreen(false)
      }
    }
  }, [checkIsFullscreen])

  // Monitora alterações de tela cheia (botão, tecla F11 do teclado, resize e display-mode)
  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(checkIsFullscreen())
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      }
    }

    // Checagem inicial
    updateFullscreenState()

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', updateFullscreenState)
    document.addEventListener('webkitfullscreenchange', updateFullscreenState)
    document.addEventListener('mozfullscreenchange', updateFullscreenState)
    document.addEventListener('MSFullscreenChange', updateFullscreenState)
    window.addEventListener('resize', updateFullscreenState)

    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(display-mode: fullscreen)') : null
    if (mql && mql.addEventListener) {
      mql.addEventListener('change', updateFullscreenState)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', updateFullscreenState)
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState)
      document.removeEventListener('mozfullscreenchange', updateFullscreenState)
      document.removeEventListener('MSFullscreenChange', updateFullscreenState)
      window.removeEventListener('resize', updateFullscreenState)
      if (mql && mql.removeEventListener) {
        mql.removeEventListener('change', updateFullscreenState)
      }
    }
  }, [checkIsFullscreen, toggleFullscreen])

  // Carrega dados iniciais da unidade e histórico filtrado
  const loadPanelData = useCallback(async (filterIds: string[]) => {
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('unitId', unitId)
      if (filterIds.length > 0) {
        queryParams.set('services', filterIds.join(','))
      }

      const res = await fetch(`/api/panel-init?${queryParams.toString()}`)
      if (!res.ok) return

      const data = await res.json()
      if (data.unit?.name) setUnitName(data.unit.name)
      if (data.unit?.subtitle) setUnitSubtitle(data.unit.subtitle)
      if (data.unit?.logoUrl) {
        setUnitLogoUrl(data.unit.logoUrl)
        setDocumentFavicon(data.unit.logoUrl)
      }
      if (data.unit?.timezone) setUnitTimezone(data.unit.timezone)

      if (data.unit) {
        autoResetConfigRef.current = {
          enabled: data.unit.autoResetEnabled ?? true,
          time: data.unit.autoResetTime || '00:00',
          timezone: data.unit.timezone || 'America/Sao_Paulo',
        }
        operationalCycleKeyRef.current = getOperationalCycleKey(
          autoResetConfigRef.current.time,
          autoResetConfigRef.current.timezone
        )
      }

      currentTicketRef.current = data.currentTicket || null
      setCurrentTicket(data.currentTicket || null)

      if (data.history && Array.isArray(data.history)) {
        const currentId = data.currentTicket?.id
        const currentFormatted = data.currentTicket?.formattedTicket
        const seen = new Set<string>()
        const initialHistory = (data.history as HistoryTicketItem[])
          .filter((item) => {
            if (currentId && item.id === currentId) return false
            if (currentFormatted && item.formattedTicket === currentFormatted) return false
            const key = item.formattedTicket || item.id
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, 8)
        setHistory(initialHistory)
      } else {
        setHistory([])
      }
    } catch (err) {
      console.warn('Aviso ao carregar dados do painel:', err)
    }
  }, [unitId])

  // Monitor periódico do horário programado: se o ciclo virar, limpa o painel para o novo dia
  useEffect(() => {
    const interval = setInterval(() => {
      const cfg = autoResetConfigRef.current
      if (!cfg.enabled) return

      const currentCycle = getOperationalCycleKey(cfg.time, cfg.timezone)
      if (operationalCycleKeyRef.current && operationalCycleKeyRef.current !== currentCycle) {
        console.log(`[Painel] Horário programado (${cfg.time}) atingido. Limpando painel para iniciar vazio no novo dia:`, currentCycle)
        operationalCycleKeyRef.current = currentCycle
        currentTicketRef.current = null
        setCurrentTicket(null)
        setHistory([])
        displayQueueRef.current = []
        setIsFlashing(false)
        loadPanelData(selectedServiceIdsRef.current)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [loadPanelData])

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
          .slice(0, 8)
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
          locationPlace: prev.locationPlace,
          locationShort: prev.locationShort,
          floorName: prev.floorName,
          roomName: prev.roomName,
          roomNumber: prev.roomNumber,
          calledAt: new Date(),
        }
        return [retiredTicket, ...filtered].slice(0, 8)
      }

      return filtered.slice(0, 8)
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

  // Inicialização do painel: tema, layout, filtros e SSE
  useEffect(() => {
    let isMounted = true

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)

      // 1. Tema do painel (Padrão: Claro)
      const urlTheme = urlParams.get('theme')
      if (urlTheme === 'dark' || urlTheme === 'light') {
        setTheme(urlTheme)
        try {
          localStorage.setItem(`panel_theme_${unitId}`, urlTheme)
        } catch (e) {}
      } else {
        try {
          const storedTheme = localStorage.getItem(`panel_theme_${unitId}`)
          if (storedTheme === 'dark' || storedTheme === 'light') {
            setTheme(storedTheme)
          } else {
            setTheme('light') // Padrão da TV: Tema Claro
          }
        } catch (e) {
          setTheme('light')
        }
      }

      // 2. Layout do painel (Padrão: classic)
      const urlLayout = urlParams.get('layout')
      if (urlLayout === 'classic' || urlLayout === 'widescreen' || urlLayout === 'compact') {
        setLayout(urlLayout)
        try {
          localStorage.setItem(`panel_layout_${unitId}`, urlLayout)
        } catch (e) {}
      } else {
        try {
          const storedLayout = localStorage.getItem(`panel_layout_${unitId}`)
          if (storedLayout === 'classic' || storedLayout === 'widescreen' || storedLayout === 'compact') {
            setLayout(storedLayout)
          } else {
            setLayout('classic')
          }
        } catch (e) {
          setLayout('classic')
        }
      }

      // 3. Filtro de serviços / setores
      let initialFilter: string[] = []
      const urlServices = urlParams.get('services')
      if (urlServices) {
        initialFilter = urlServices
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        try {
          localStorage.setItem(`panel_services_${unitId}`, JSON.stringify(initialFilter))
        } catch (e) {}
      } else {
        try {
          const stored = localStorage.getItem(`panel_services_${unitId}`)
          if (stored) {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed)) {
              initialFilter = parsed
            }
          }
        } catch (e) {}
      }

      selectedServiceIdsRef.current = initialFilter
      setSelectedServiceIds(initialFilter)

      // 4. Tamanho dos textos do local (Sala e Guichê)
      const urlTextSize = urlParams.get('textSize')
      if (urlTextSize === 'sm' || urlTextSize === 'md' || urlTextSize === 'lg' || urlTextSize === 'xl') {
        setLocationTextSize(urlTextSize)
        try {
          localStorage.setItem(`panel_location_text_size_${unitId}`, urlTextSize)
        } catch (e) {}
      } else {
        try {
          const storedSize = localStorage.getItem(`panel_location_text_size_${unitId}`)
          if (storedSize === 'sm' || storedSize === 'md' || storedSize === 'lg' || storedSize === 'xl') {
            setLocationTextSize(storedSize)
          } else {
            setLocationTextSize('md')
          }
        } catch (e) {
          setLocationTextSize('md')
        }
      }

      // Carrega dados iniciais com o filtro ativo
      loadPanelData(initialFilter)
    }

    // Conectar ao Server-Sent Events (SSE)
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

        if (
          parsed.type === 'PANEL_RESET' ||
          parsed.type === 'DAILY_RESET' ||
          (parsed.type === 'CONFIG_CHANGED' && parsed.payload?.action === 'RESET_COUNTERS')
        ) {
          console.log('[Painel] Evento de reset em tempo real recebido via SSE. Limpando senhas do painel.')
          currentTicketRef.current = null
          setCurrentTicket(null)
          setHistory([])
          displayQueueRef.current = []
          setIsFlashing(false)
          loadPanelData(selectedServiceIdsRef.current)
          return
        }

        if (parsed.type === 'TICKET_CALLED') {
          const payload = parsed.payload as SseTicketPayload

          // FILTRO POR TELA/SETOR: se esta tela foi configurada para serviços específicos,
          // ignorar chamadas de serviços que não foram selecionados para esta tela.
          const activeFilter = selectedServiceIdsRef.current
          if (
            activeFilter.length > 0 &&
            payload.ticket.serviceId &&
            !activeFilter.includes(payload.ticket.serviceId)
          ) {
            return
          }

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
            locationPlace: payload.ticket.locationPlace,
            locationShort: payload.ticket.locationShort,
            floorName: payload.ticket.floorName,
            roomName: payload.ticket.roomName,
            roomNumber: payload.ticket.roomNumber,
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
  }, [unitId, loadPanelData])

  const isLight = theme === 'light'

  return (
    <main
      className={`min-h-screen flex flex-col p-3 sm:p-5 md:p-6 lg:p-8 justify-between relative transition-colors duration-500 overflow-x-hidden ${
        isLight
          ? 'bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200 text-slate-800'
          : 'bg-[#060a12] text-white'
      }`}
    >
      {/* Ambient background lighting mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {isLight ? (
          <>
            <div className="mesh-orb mesh-orb-cyan -top-40 -left-20 w-[550px] h-[550px] opacity-20" />
            <div className="mesh-orb mesh-orb-emerald -bottom-40 -right-20 w-[550px] h-[550px] opacity-15" />
          </>
        ) : (
          <>
            <div className="mesh-orb mesh-orb-cyan -top-40 -left-20 w-[650px] h-[650px] opacity-25" />
            <div className="mesh-orb mesh-orb-indigo top-1/3 -right-20 w-[600px] h-[600px] opacity-20" />
            <div className="mesh-orb mesh-orb-emerald -bottom-40 left-1/4 w-[550px] h-[550px] opacity-15" />
          </>
        )}
      </div>

      {/* Barra Superior / Header */}
      <header
        className={`flex items-center justify-between pb-3 sm:pb-4 md:pb-5 mb-2 sm:mb-3 border-b transition-colors duration-300 z-10 relative flex-wrap sm:flex-nowrap gap-3 ${
          isLight
            ? 'border-slate-300/80 bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 md:p-5 shadow-sm'
            : 'border-slate-800/80 bg-slate-900/50 backdrop-blur-md rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 md:p-5'
        }`}
      >
        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
          {unitLogoUrl ? (
            <img
              src={unitLogoUrl}
              alt="Brasão da Unidade"
              className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain rounded-2xl p-1.5 border shadow-xs shrink-0 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
              }`}
            />
          ) : (
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center shadow-xs shrink-0 ${
                isLight ? 'bg-cyan-100 border-cyan-300 text-cyan-700' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 animate-pulse" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center space-x-2 sm:space-x-2.5 flex-wrap gap-1">
              <h1 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {unitName}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black tracking-wider shrink-0 ${
                  isConnected
                    ? isLight
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse'
                }`}
              >
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-1.5 animate-ping bg-current" />
                {isConnected ? 'AO VIVO' : 'CONECTANDO...'}
              </span>

              {/* Indicador de Setor / Filtro desta Tela */}
              {selectedServiceIds.length > 0 ? (
                <span
                  className={`hidden sm:inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border shrink-0 ${
                    isLight
                      ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                  Setor ({selectedServiceIds.length})
                </span>
              ) : null}
            </div>
            <p className={`text-[11px] sm:text-xs font-medium tracking-wide mt-0.5 truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {unitSubtitle || 'Painel de Atendimento em Tempo Real'}
            </p>
          </div>
        </div>

        {/* Controles: Áudio, Configurações, Fullscreen e Relógio Digital */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* REQUISITO 3: Quando em tela cheia (F11 ou botão pressionado), ocultar Voz Ativa, Configurações e Fullscreen */}
          {!isFullscreen && (
            <>
              {/* Botão de Áudio (Voz Ativa) */}
              <button
                onClick={handleEnableAudio}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md ${
                  audioEnabled
                    ? isLight
                      ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                      : 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                    : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white animate-bounce shadow-cyan-500/30'
                }`}
                title={audioEnabled ? 'Áudio ativado' : 'Clique para ativar a chamada por voz'}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
                <span className="hidden md:inline">{audioEnabled ? 'Voz Ativa' : 'Ativar Voz'}</span>
              </button>

              {/* Botão Configurações */}
              <Link
                href={`/painel/${unitId}/config`}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all border ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-xs hover:border-cyan-400'
                    : 'bg-slate-800/80 text-slate-200 hover:text-white border-slate-700/80 hover:bg-slate-700/60 hover:border-cyan-500/40 shadow-sm'
                }`}
                title="Configurações desta tela (Tema, Layout, Tamanho de Texto e Setores)"
              >
                <SlidersHorizontal className={`w-4 h-4 shrink-0 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                <span className="hidden md:inline">Configurações</span>
              </Link>

              {/* Botão Tela Cheia */}
              <button
                onClick={toggleFullscreen}
                className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all ${
                  isLight
                    ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-300 shadow-xs hover:border-cyan-400'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/80 hover:border-cyan-500/40 shadow-sm'
                }`}
                title="Alternar Tela Cheia (F11)"
              >
                {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </>
          )}

          {/* Relógio Digital com Timezone e Tema */}
          <DigitalClock timezone={unitTimezone} theme={theme} />
        </div>
      </header>

      {/* REQUISITO 2: Área Central com os 3 Layouts Disponíveis */}
      {layout === 'widescreen' ? (
        /* LAYOUT 2: Widescreen Horizontal (Senha no Topo + Histórico em Grade Inferior) */
        <section className="flex-1 flex flex-col gap-3 sm:gap-4 md:gap-5 my-1 sm:my-2">
          <FeaturedTicket
            ticket={currentTicket}
            isFlashing={isFlashing}
            theme={theme}
            variant="widescreen"
            locationTextSize={locationTextSize}
          />
          <TicketHistory history={history} theme={theme} variant="widescreen" />
        </section>
      ) : layout === 'compact' ? (
        /* LAYOUT 3: Foco Dividido / Chamada Dupla */
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 my-1 sm:my-2 items-stretch">
          <div className="lg:col-span-7 flex flex-col">
            <FeaturedTicket
              ticket={currentTicket}
              isFlashing={isFlashing}
              theme={theme}
              variant="compact"
              locationTextSize={locationTextSize}
            />
          </div>
          <div className="lg:col-span-5 flex flex-col">
            <TicketHistory history={history} theme={theme} variant="compact" />
          </div>
        </section>
      ) : (
        /* LAYOUT 1 (Padrão): Destaque Lateral Clássico */
        <section className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 my-1 sm:my-2">
          <FeaturedTicket
            ticket={currentTicket}
            isFlashing={isFlashing}
            theme={theme}
            variant="classic"
            locationTextSize={locationTextSize}
          />
          <TicketHistory history={history} theme={theme} variant="classic" />
        </section>
      )}

      {/* Rodapé Institucional / Marquee Informativo */}
      <footer
        className={`mt-2 sm:mt-4 pt-2.5 sm:pt-4 border-t flex items-center justify-between text-[11px] sm:text-xs transition-colors duration-300 ${
          isLight ? 'border-slate-300/80 text-slate-600' : 'border-slate-800/60 text-slate-400'
        }`}
      >
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <ShieldCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <span className="truncate">Atendimento conforme Lei Federal nº 10.048/2000 (Prioridades)</span>
        </div>

        <div className={`hidden md:block overflow-hidden max-w-xl text-right shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
          <span>Ao ouvir sua senha, dirija-se com seus documentos ao guichê informado.</span>
        </div>
      </footer>
    </main>
  )
}
