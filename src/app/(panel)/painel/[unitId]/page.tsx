'use client'

import { useEffect, useState, useRef, use, useCallback } from 'react'
import { FeaturedTicket, FeaturedTicketData } from '@/components/panel/FeaturedTicket'
import { TicketHistory, HistoryTicketItem } from '@/components/panel/TicketHistory'
import { DigitalClock } from '@/components/panel/DigitalClock'
import { speechManager } from '@/lib/speech'
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Check,
  Copy,
  CheckCheck,
  Tv,
  Filter,
} from 'lucide-react'

interface PanelPageProps {
  params: Promise<{ unitId: string }>
}

interface ServiceOption {
  id: string
  name: string
  prefix: string
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

  // Estado de serviços e filtro por tela (setor)
  const [allServices, setAllServices] = useState<ServiceOption[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [tempFilterMode, setTempFilterMode] = useState<'ALL' | 'SPECIFIC'>('ALL')
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([])
  const [copiedUrl, setCopiedUrl] = useState(false)

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
      if (data.unit?.logoUrl) setUnitLogoUrl(data.unit.logoUrl)
      if (data.unit?.timezone) setUnitTimezone(data.unit.timezone)
      if (data.allServices && Array.isArray(data.allServices)) {
        setAllServices(data.allServices)
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
          .slice(0, 5)
        setHistory(initialHistory)
      } else {
        setHistory([])
      }
    } catch (err) {
      console.warn('Aviso ao carregar dados do painel:', err)
    }
  }, [unitId])

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

  // Inicialização do filtro por localStorage ou URL e conexão SSE
  useEffect(() => {
    let isMounted = true

    // Recupera filtro configurado na URL ou no localStorage desta tela
    let initialFilter: string[] = []
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
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
    }

    selectedServiceIdsRef.current = initialFilter
    setSelectedServiceIds(initialFilter)

    // Carrega dados iniciais com o filtro ativo
    loadPanelData(initialFilter)

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

        if (parsed.type === 'TICKET_CALLED') {
          const payload = parsed.payload as SseTicketPayload

          // FILTRO POR TELA/SETOR: se esta tela foi configurada para serviços específicos,
          // ignorar completamente chamadas de serviços que não foram selecionados para esta tela.
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
  }, [unitId, loadPanelData])

  // Abrir modal de configurações
  const handleOpenSettings = () => {
    setTempFilterMode(selectedServiceIds.length > 0 ? 'SPECIFIC' : 'ALL')
    setTempSelectedIds([...selectedServiceIds])
    setCopiedUrl(false)
    setIsSettingsOpen(true)
  }

  // Alternar checkbox de um serviço no modal
  const handleToggleService = (serviceId: string) => {
    setTempSelectedIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  // Salvar configuração na instância local desta tela
  const handleSaveSettings = () => {
    const finalFilter = tempFilterMode === 'SPECIFIC' ? tempSelectedIds : []

    setSelectedServiceIds(finalFilter)
    selectedServiceIdsRef.current = finalFilter

    try {
      if (finalFilter.length > 0) {
        localStorage.setItem(`panel_services_${unitId}`, JSON.stringify(finalFilter))
      } else {
        localStorage.removeItem(`panel_services_${unitId}`)
      }
    } catch (e) {}

    // Recarrega os dados do painel para exibir apenas as senhas do setor selecionado
    loadPanelData(finalFilter)
    setIsSettingsOpen(false)
  }

  // Gera o link para Smart TV / Kiosk com o filtro configurado
  const getKioskUrl = () => {
    if (typeof window === 'undefined') return ''
    const base = `${window.location.origin}/painel/${unitId}`
    if (tempFilterMode === 'SPECIFIC' && tempSelectedIds.length > 0) {
      return `${base}?services=${tempSelectedIds.join(',')}`
    }
    return base
  }

  const handleCopyKioskUrl = () => {
    const url = getKioskUrl()
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2500)
    })
  }

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

              {/* Indicador de Setor / Filtro desta Tela */}
              {selectedServiceIds.length > 0 ? (
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Filter className="w-3 h-3 mr-1" />
                  Setor ({selectedServiceIds.length} serviço{selectedServiceIds.length > 1 ? 's' : ''})
                </span>
              ) : (
                <span className="hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
                  Todos os Serviços
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              {unitSubtitle || 'Painel de Atendimento em Tempo Real'}
            </p>
          </div>
        </div>

        {/* Controles: Áudio, Configurar Tela, Fullscreen e Relógio Digital */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Botão de Áudio */}
          <button
            onClick={handleEnableAudio}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              audioEnabled
                ? 'bg-slate-800/80 text-cyan-400 border border-cyan-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold animate-bounce'
            }`}
            title={audioEnabled ? 'Áudio ativado' : 'Clique para ativar a chamada por voz'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{audioEnabled ? 'Voz Ativa' : 'Ativar Voz'}</span>
          </button>

          {/* Botão de Configuração de Serviços desta Tela */}
          <button
            onClick={handleOpenSettings}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
              selectedServiceIds.length > 0
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/80 hover:bg-slate-700/60'
            }`}
            title="Configurar quais serviços/setor esta tela irá chamar"
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Setor</span>
          </button>

          {/* Botão Tela Cheia */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
            title="Alternar Tela Cheia"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Relógio Digital com Timezone */}
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

      {/* Modal de Configuração de Serviços desta Tela (Instância) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Configurar Esta Tela</h2>
                  <p className="text-xs text-slate-400">
                    Defina quais senhas e serviços serão chamados nesta TV
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Seleção do Modo de Operação */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Modo de Operação
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTempFilterMode('ALL')}
                    className={`flex items-start p-3.5 rounded-xl border text-left transition-all ${
                      tempFilterMode === 'ALL'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center h-5 mr-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          tempFilterMode === 'ALL'
                            ? 'border-cyan-400 bg-cyan-500'
                            : 'border-slate-500 bg-transparent'
                        }`}
                      >
                        {tempFilterMode === 'ALL' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white">
                        Todos os Serviços da Unidade (Geral)
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Esta tela chamará senhas de todos os serviços e guichês da unidade.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempFilterMode('SPECIFIC')}
                    className={`flex items-start p-3.5 rounded-xl border text-left transition-all ${
                      tempFilterMode === 'SPECIFIC'
                        ? 'bg-cyan-500/15 border-cyan-500 text-white'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center h-5 mr-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          tempFilterMode === 'SPECIFIC'
                            ? 'border-cyan-400 bg-cyan-500'
                            : 'border-slate-500 bg-transparent'
                        }`}
                      >
                        {tempFilterMode === 'SPECIFIC' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white">
                        Serviços Específicos do Setor
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Ideal para telas em salas de espera de Triagem, Laboratório, Consultórios, etc.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Lista de Serviços (quando modo SPECIFIC está ativo) */}
              {tempFilterMode === 'SPECIFIC' && (
                <div className="space-y-3 pt-2 border-t border-slate-800 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Serviços que esta tela irá chamar:
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setTempSelectedIds(allServices.map((s) => s.id))}
                        className="text-xs text-cyan-400 hover:underline"
                      >
                        Marcar todos
                      </button>
                      <span className="text-xs text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setTempSelectedIds([])}
                        className="text-xs text-slate-400 hover:underline"
                      >
                        Desmarcar
                      </button>
                    </div>
                  </div>

                  {allServices.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-800/40 text-center text-xs text-slate-400">
                      Nenhum serviço ativo encontrado para esta unidade.
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                      {allServices.map((service) => {
                        const isChecked = tempSelectedIds.includes(service.id)
                        return (
                          <label
                            key={service.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                                : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleService(service.id)}
                                className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-400"
                              />
                              <span className="text-sm font-medium">{service.name}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                              {service.prefix}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {tempSelectedIds.length === 0 && (
                    <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                      ⚠️ Nenhum serviço selecionado. Se salvar assim, a tela chamará todos os serviços por padrão.
                    </p>
                  )}
                </div>
              )}

              {/* Link Kiosk / Smart TV para facilitar configuração remota */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    URL para Smart TV / Kiosk Box
                  </label>
                  <span className="text-[11px] text-slate-500">Salva automaticamente neste dispositivo</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={getKioskUrl()}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKioskUrl}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    {copiedUrl ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dica: Para Smart TVs ou TV Boxes novos, basta abrir esta URL direta no navegador para já iniciar com este setor configurado.
                </p>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-800 bg-slate-900/90">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Configuração</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
