'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getUnitData, 
  getAttendantQueueState, 
  callNextTicket, 
  callSpecificTicket,
  recallTicket, 
  startAttendance, 
  finishAttendance, 
  markNoShow,
  resumePendingTicket,
  redirectTicket,
  getAttendedTicketsHistory
} from '@/actions/tickets'
import { getSessionAction, logoutAction } from '@/actions/auth'
import { bindAttendantToLocation } from '@/actions/admin'
import { 
  Megaphone, 
  RotateCcw, 
  Play, 
  CheckCircle, 
  UserX, 
  Clock, 
  Users, 
  ArrowLeft,
  MapPin,
  Tag,
  User,
  LogOut,
  Lock,
  DoorOpen,
  Shuffle,
  ShieldCheck,
  PauseCircle,
  History,
  ArrowRightLeft,
  Search,
  Calendar,
  FileText,
  Check,
  X,
  AlertTriangle,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'

interface LocationItem {
  id: string
  name: string
  number: number
  roomId?: string | null
}

interface WaitingTicketItem {
  id: string
  formattedTicket: string
  ticketPrefix: string
  ticketNumber: number
  customerName: string | null
  createdAt: Date
  serviceId: string
  serviceName: string
  priorityName: string
  priorityColor: string
}

interface CurrentTicketData {
  id: string
  formattedTicket: string
  customerName: string | null
  status: string
  serviceId: string
  serviceName: string
  priorityName: string
  priorityColor: string
  locationName: string | null
  locationNumber: number | null
}

interface EligibleServiceItem {
  id: string
  name: string
  prefix: string
  weight: number
  active: boolean
  roomId?: string | null
  userId?: string | null
}

export default function AtendimentoPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [unit, setUnit] = useState<{ id: string; name: string } | null>(null)
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [waitingQueue, setWaitingQueue] = useState<WaitingTicketItem[]>([])
  const [currentTicket, setCurrentTicket] = useState<CurrentTicketData | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Navegação de abas operacionais
  const [activeView, setActiveView] = useState<'CALLING' | 'PENDING' | 'HISTORY'>('CALLING')

  // Fichas em espera e Serviços elegíveis (Vinculados por sala ou usuário)
  const [pendingTickets, setPendingTickets] = useState<any[]>([])
  const [eligibleServices, setEligibleServices] = useState<EligibleServiceItem[]>([])
  const [allServices, setAllServices] = useState<EligibleServiceItem[]>([])
  const [prioritiesList, setPrioritiesList] = useState<any[]>([])

  // Modal 1: Finalizar Atendimento (Serviço, Resolução, Pendência e Observação)
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false)
  const [finishServiceId, setFinishServiceId] = useState('')
  const [finishResolution, setFinishResolution] = useState<'SOLVED' | 'PENDING' | 'UNSOLVED'>('SOLVED')
  const [finishObservation, setFinishObservation] = useState('')
  const [isHoldPending, setIsHoldPending] = useState(false)

  // Modal 2: Redirecionar Atendimento (Erro na triagem -> Novo serviço/local)
  const [isRedirectModalOpen, setIsRedirectModalOpen] = useState(false)
  const [redirectServiceId, setRedirectServiceId] = useState('')
  const [redirectPriorityId, setRedirectPriorityId] = useState<number>(1)
  const [redirectReason, setRedirectReason] = useState('')

  // Histórico de Fichas Atendidas (Data + Busca)
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [historySearch, setHistorySearch] = useState('')
  const [historyItems, setHistoryItems] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Regras de fila e ordem de atendimento
  const [attendanceConfig, setAttendanceConfig] = useState<{
    defaultOrderMode: 'PRIORITY' | 'INTERLEAVED'
    allowManualQueueSelection: boolean
  }>({
    defaultOrderMode: 'PRIORITY',
    allowManualQueueSelection: true,
  })

  // 1. Verifica autenticação do usuário e permissão de acesso
  useEffect(() => {
    getSessionAction().then((u) => {
      if (!u) {
        router.push('/login?redirect=/atendimento')
      } else if (u.role === 'TRIAGE') {
        // Usuários com perfil TRIAGE só podem acessar o painel de triagem e o painel de chamados
        router.push('/triagem')
      } else {
        setCurrentUser(u)
      }
    })
  }, [router])

  // 2. Carrega dados da unidade e locais
  useEffect(() => {
    getUnitData().then((data) => {
      if (!data) return
      setUnit(data.unit)
      setLocations(data.locations)
      setPrioritiesList(data.priorities || [])
      if (data.locations.length > 0) {
        setSelectedLocationId(data.locations[0].id)
      }
    })
  }, [])

  // 3. Atualiza fila e vincula usuário ao local
  const refreshQueue = (unitId: string, locId: string, uId?: string) => {
    getAttendantQueueState(unitId, locId, uId).then((state) => {
      setWaitingQueue(state.waiting as unknown as WaitingTicketItem[])
      if (state.currentTicket) {
        setCurrentTicket(state.currentTicket as unknown as CurrentTicketData)
      } else {
        setCurrentTicket(null)
      }
      setPendingTickets(state.pendingTickets || [])
      setEligibleServices(state.eligibleServices || [])
      setAllServices(state.allServices || [])
      if (state.attendanceConfig) {
        setAttendanceConfig(state.attendanceConfig)
      }
    })
  }

  useEffect(() => {
    if (unit && selectedLocationId && currentUser) {
      bindAttendantToLocation(selectedLocationId, currentUser.id).catch(() => {})
      refreshQueue(unit.id, selectedLocationId, currentUser.id)
      const timer = setInterval(() => refreshQueue(unit.id, selectedLocationId, currentUser.id), 5000)
      return () => clearInterval(timer)
    }
  }, [unit, selectedLocationId, currentUser])

  // Carrega histórico quando a aba de histórico está ativa
  useEffect(() => {
    if (unit && activeView === 'HISTORY') {
      loadHistory(unit.id, historyDate, historySearch)
    }
  }, [unit, activeView, historyDate, historySearch])

  const loadHistory = async (unitId: string, date: string, query: string) => {
    setIsLoadingHistory(true)
    try {
      const items = await getAttendedTicketsHistory({
        unitId,
        date,
        searchQuery: query,
      })
      setHistoryItems(items)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Chamar Próximo (respeitando estritamente o modo definido pelo administrador)
  const handleCallNext = () => {
    if (!unit || !selectedLocationId) return
    if (currentTicket) {
      setStatusMessage(`Finalize o atendimento da senha atual (${currentTicket.formattedTicket}) ou marque como 'Não Veio' antes de chamar a próxima.`)
      return
    }
    setStatusMessage(null)

    startTransition(async () => {
      const res = await callNextTicket({
        unitId: unit.id,
        locationId: selectedLocationId,
        userId: currentUser?.id,
        orderMode: attendanceConfig.defaultOrderMode,
      })

      if (res.success && res.data) {
        setStatusMessage(`Senha ${res.data.ticket.formattedTicket} chamada no painel!`)
        refreshQueue(unit.id, selectedLocationId, currentUser?.id)
      } else {
        setStatusMessage(res.message || 'Nenhuma senha na fila.')
      }
    })
  }

  // Chamar Senha Específica Avulsa selecionada na Fila de Espera
  const handleCallSpecific = (ticketId: string) => {
    if (!unit || !selectedLocationId) return
    if (currentTicket) {
      setStatusMessage(`Finalize o atendimento da senha atual (${currentTicket.formattedTicket}) ou marque como 'Não Veio' antes de chamar outra senha.`)
      return
    }
    setStatusMessage(null)

    startTransition(async () => {
      const res = await callSpecificTicket({
        ticketId,
        unitId: unit.id,
        locationId: selectedLocationId,
        userId: currentUser?.id,
      })

      if (res.success && res.data) {
        setStatusMessage(`Senha ${res.data.ticket.formattedTicket} chamada avulsa da fila!`)
        refreshQueue(unit.id, selectedLocationId, currentUser?.id)
      } else {
        setStatusMessage(res.message || 'Erro ao chamar senha avulsa.')
      }
    })
  }

  // Rechamar
  const handleRecall = () => {
    if (!unit || !currentTicket) return
    startTransition(async () => {
      await recallTicket(currentTicket.id, unit.id)
      setStatusMessage(`Senha ${currentTicket.formattedTicket} rechamada com voz!`)
    })
  }

  // Iniciar Atendimento
  const handleStartAttendance = () => {
    if (!currentTicket) return
    startTransition(async () => {
      await startAttendance(currentTicket.id)
      setCurrentTicket((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null))
      setStatusMessage('Atendimento em andamento.')
    })
  }

  // Abre Modal de Finalização
  const handleOpenFinishModal = () => {
    if (!currentTicket) return
    const initialServiceId = currentTicket.serviceId || eligibleServices[0]?.id || allServices[0]?.id || ''
    setFinishServiceId(initialServiceId)
    setFinishResolution('SOLVED')
    setFinishObservation('')
    setIsHoldPending(false)
    setIsFinishModalOpen(true)
  }

  // Confirmação de Finalização do Atendimento
  const handleConfirmFinish = () => {
    if (!unit || !currentTicket || !selectedLocationId) return
    startTransition(async () => {
      try {
        const res = await finishAttendance({
          ticketId: currentTicket.id,
          serviceId: finishServiceId || undefined,
          resolution: finishResolution,
          observation: finishObservation,
          holdPending: finishResolution === 'PENDING' && isHoldPending,
        })

        setIsFinishModalOpen(false)
        if (res?.held) {
          setStatusMessage(`Ficha ${currentTicket.formattedTicket} colocada em espera. Posto liberado!`)
        } else {
          setStatusMessage(`Atendimento da senha ${currentTicket.formattedTicket} finalizado com sucesso!`)
        }
        setCurrentTicket(null)
        refreshQueue(unit.id, selectedLocationId, currentUser?.id)
        if (activeView === 'HISTORY') {
          loadHistory(unit.id, historyDate, historySearch)
        }
      } catch (err) {
        setStatusMessage((err as Error).message)
      }
    })
  }

  // Retomar atendimento de ficha em espera
  const handleResumePending = (ticketId: string, ticketCode: string) => {
    if (!unit || !selectedLocationId) return
    if (currentTicket) {
      alert('Você já possui um atendimento ativo neste posto. Conclua ou coloque-o em espera antes de retomar outra ficha.')
      return
    }

    startTransition(async () => {
      const res = await resumePendingTicket({
        ticketId,
        unitId: unit.id,
        locationId: selectedLocationId,
        userId: currentUser?.id,
      })

      if (res.success && res.ticket) {
        setStatusMessage(`Ficha ${ticketCode} retomada para atendimento no posto!`)
        refreshQueue(unit.id, selectedLocationId, currentUser?.id)
        setActiveView('CALLING')
      } else {
        setStatusMessage(res.message || 'Erro ao retomar ficha em espera.')
      }
    })
  }

  // Abre Modal de Redirecionamento por erro de triagem
  const handleOpenRedirectModal = () => {
    if (!currentTicket) return
    const fallbackServiceId = allServices.find((s) => s.id !== currentTicket.serviceId)?.id || allServices[0]?.id || ''
    setRedirectServiceId(fallbackServiceId)
    setRedirectPriorityId(1)
    setRedirectReason('')
    setIsRedirectModalOpen(true)
  }

  // Confirmação de Redirecionamento
  const handleConfirmRedirect = () => {
    if (!unit || !currentTicket || !selectedLocationId || !redirectServiceId) return
    startTransition(async () => {
      try {
        const res = await redirectTicket({
          currentTicketId: currentTicket.id,
          unitId: unit.id,
          targetServiceId: redirectServiceId,
          priorityId: redirectPriorityId,
          reason: redirectReason,
          attendantUserId: currentUser?.id,
        })

        setIsRedirectModalOpen(false)
        if (res.success && res.newTicket) {
          setStatusMessage(`Atendimento redirecionado! Senha anterior: ${res.previousFormattedTicket} ➔ Nova Senha: ${res.newTicket.formattedTicket}`)
          setCurrentTicket(null)
          refreshQueue(unit.id, selectedLocationId, currentUser?.id)
        } else {
          setStatusMessage(res.message || 'Erro ao redirecionar senha.')
        }
      } catch (err) {
        setStatusMessage((err as Error).message)
      }
    })
  }

  // Não Compareceu (No-Show)
  const handleNoShow = () => {
    if (!unit || !currentTicket || !selectedLocationId) return
    startTransition(async () => {
      await markNoShow(currentTicket.id)
      setCurrentTicket(null)
      setStatusMessage('Senha marcada como Não Compareceu.')
      refreshQueue(unit.id, selectedLocationId, currentUser?.id)
    })
  }

  const handleLogout = async () => {
    if (selectedLocationId) {
      await bindAttendantToLocation(selectedLocationId, null)
    }
    await logoutAction()
    router.push('/login')
  }

  const selectedLocation = locations.find((l) => l.id === selectedLocationId)

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
        <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-sm">
          <Lock className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
          <h2 className="text-xl font-bold">Verificando Credenciais...</h2>
          <p className="text-xs text-slate-400">Você precisa estar logado para iniciar o atendimento.</p>
          <Link href="/login" className="inline-block px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl">
            Ir para Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col p-6 md:p-8 justify-between">
      {/* Topo do Módulo do Atendente */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Voltar ao Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Painel do Atendente <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Operador Conectado</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              {unit?.name || 'Unidade Central Matriz'} • Gestão de Fila e Chamadas
            </p>
          </div>
        </div>

        {/* Controles de Topo: Botão Admin (se ADMIN), Seletor de Guichê e Usuário */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Requisito 5: Atalho para Admin caso o usuário logado tenha perfil ADMIN */}
          {currentUser.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 font-bold text-xs transition-all shadow-sm shadow-cyan-500/10 active:scale-95"
              title="Acessar Painel Administrativo Global"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Painel Admin</span>
            </Link>
          )}

          <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
            <User className="w-4 h-4 text-cyan-400" />
            <div className="text-left text-xs">
              <span className="font-bold text-white block">{currentUser.name}</span>
              <span className="text-[10px] text-cyan-400 font-mono">{currentUser.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 ml-1 transition-colors"
              title="Encerrar Turno (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-sm focus:outline-none focus:border-cyan-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.number.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Sub-navegação Operacional: Fila & Chamadas | Fichas em Espera | Histórico */}
      <div className="flex items-center space-x-2 my-5 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveView('CALLING')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeView === 'CALLING'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Atendimento & Fila</span>
        </button>

        <button
          onClick={() => setActiveView('PENDING')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeView === 'PENDING'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <PauseCircle className="w-4 h-4" />
          <span>Fichas em Espera</span>
          {pendingTickets.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeView === 'PENDING' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {pendingTickets.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('HISTORY')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeView === 'HISTORY'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Atendimentos</span>
        </button>
      </div>

      {/* Notificação / Mensagem de Status */}
      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-semibold flex items-center justify-between mb-4 animate-fade-in">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-xs hover:underline text-cyan-400">Fechar</button>
        </div>
      )}

      {/* ========================================================
          VISÃO 1: ATENDIMENTO ATIVO E FILA DE ESPERA
         ======================================================== */}
      {activeView === 'CALLING' && (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 mb-6">
          {/* Lado Esquerdo: Senha em Atendimento e Controles Principais (7 Colunas) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <div className="flex-1 rounded-3xl p-8 bg-slate-900/60 border border-slate-800 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Posto: <span className="text-cyan-400 font-mono text-sm">{selectedLocation ? `${selectedLocation.name} ${selectedLocation.number.toString().padStart(2, '0')}` : 'Guichê'}</span>
                </span>
                {currentTicket && (
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    currentTicket.status === 'IN_PROGRESS' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    {currentTicket.status === 'IN_PROGRESS' ? 'Em Atendimento' : 'Chamado (Aguardando Cidadão)'}
                  </span>
                )}
              </div>

              {currentTicket ? (
                <div className="my-auto text-center space-y-3">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                    Senha Atual
                  </span>
                  <div className="font-mono text-7xl md:text-8xl font-black text-cyan-400 tracking-tight drop-shadow-[0_0_25px_rgba(6,182,212,0.3)]">
                    {currentTicket.formattedTicket}
                  </div>

                  <div className="flex items-center justify-center space-x-2 pt-2 flex-wrap gap-y-2">
                    <span
                      className="px-3.5 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider"
                      style={{ backgroundColor: currentTicket.priorityColor }}
                    >
                      {currentTicket.priorityName}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
                      {currentTicket.serviceName}
                    </span>
                  </div>

                  {currentTicket.customerName && (
                    <p className="text-sm font-semibold text-slate-300 pt-1">
                      Cidadão: <span className="text-white capitalize">{currentTicket.customerName}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="my-auto text-center p-8 space-y-3 text-slate-500">
                  <Tag className="w-12 h-12 mx-auto text-slate-700 animate-pulse" />
                  <h3 className="text-xl font-bold text-slate-400">Posto Disponível</h3>
                  <p className="text-xs max-w-sm mx-auto">
                    Operador <strong className="text-cyan-400">{currentUser.name}</strong>, clique no botão abaixo para chamar a próxima senha da fila.
                  </p>
                </div>
              )}

              {/* Indicador Informativo do Modo de Chamada Configurado pelo Administrador */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <Shuffle className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-slate-300">Modo de Chamada:</span>
                </div>

                <div>
                  {attendanceConfig.defaultOrderMode === 'INTERLEAVED' ? (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Intercalado (1 Urgência, 1 Prioritário, 1 Convencional)
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      Prioridade Estrita (Urgência &gt; Prioritário &gt; Convencional)
                    </span>
                  )}
                </div>
              </div>

              {/* Botões de Ação do Atendimento */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                {!currentTicket ? (
                  <button
                    onClick={handleCallNext}
                    disabled={isPending || waitingQueue.length === 0}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-lg flex items-center justify-center space-x-3 transition-all shadow-xl shadow-cyan-500/25 active:scale-[0.99] disabled:opacity-40"
                  >
                    <Megaphone className="w-6 h-6" />
                    <span>CHAMAR PRÓXIMA SENHA</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={handleRecall}
                      disabled={isPending}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex flex-col items-center justify-center gap-1 border border-slate-700 transition-colors"
                      title="Chamar novamente no painel e falar voz"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Rechamar</span>
                    </button>

                    {currentTicket.status !== 'IN_PROGRESS' ? (
                      <button
                        onClick={handleStartAttendance}
                        disabled={isPending}
                        className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>Iniciar</span>
                      </button>
                    ) : (
                      /* Requisito 2: Finalizar com modal de serviço, resolução e observação */
                      <button
                        onClick={handleOpenFinishModal}
                        disabled={isPending}
                        className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Finalizar</span>
                      </button>
                    )}

                    {/* Requisito 3: Redirecionar atendimento em caso de erro na triagem */}
                    <button
                      onClick={handleOpenRedirectModal}
                      disabled={isPending}
                      className="p-3 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 font-bold text-xs flex flex-col items-center justify-center gap-1 border border-indigo-800/60 transition-colors"
                      title="Redirecionar para outro serviço ou local"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Redirecionar</span>
                    </button>

                    <button
                      onClick={handleNoShow}
                      disabled={isPending}
                      className="p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-bold text-xs flex flex-col items-center justify-center gap-1 border border-rose-800/60 transition-colors"
                      title="Marcar senha como não compareceu"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Não Veio</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Visualizador da Fila em Espera (5 Colunas) */}
          <div className="lg:col-span-5 rounded-3xl p-6 bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider">
                  Fila de Espera
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {attendanceConfig.allowManualQueueSelection && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Chamada Avulsa Ativa
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 font-bold border border-cyan-800">
                  {waitingQueue.length} aguardando
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px]">
              {waitingQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 text-slate-700" />
                  <span className="text-sm">Fila vazia no momento</span>
                </div>
              ) : (
                waitingQueue.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors gap-2"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-500 w-5 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-lg text-white">
                            {t.formattedTicket}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.priorityColor }}
                            title={t.priorityName}
                          />
                        </div>
                        <span className="text-xs text-slate-400 block truncate max-w-[130px] sm:max-w-[160px]">
                          {t.customerName || t.serviceName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        {new Date(t.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {attendanceConfig.allowManualQueueSelection && (
                        <button
                          onClick={() => handleCallSpecific(t.id)}
                          disabled={isPending || Boolean(currentTicket)}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 ${
                            Boolean(currentTicket)
                              ? 'bg-slate-800/50 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-50'
                              : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 border-cyan-500/40 active:scale-95'
                          }`}
                          title={
                            currentTicket
                              ? `Finalize ou marque 'Não Veio' na senha atual (${currentTicket.formattedTicket}) antes de chamar outra senha`
                              : 'Chamar esta ficha avulsa da fila de espera'
                          }
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          <span>Chamar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {/* ========================================================
          VISÃO 2: FICHAS EM ESPERA (PENDING / ON-HOLD)
         ======================================================== */}
      {activeView === 'PENDING' && (
        <main className="flex-1 rounded-3xl p-6 md:p-8 bg-slate-900/60 border border-slate-800 mb-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PauseCircle className="w-6 h-6 text-amber-400" />
                <span>Fichas Colocadas em Espera</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Atendimentos suspensos temporariamente aguardando resolução de pendência (documentos, aprovação, etc.).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {pendingTickets.length} fichas pendentes
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4">
            {pendingTickets.length === 0 ? (
              <div className="text-center p-12 text-slate-500 space-y-3">
                <Clock className="w-12 h-12 mx-auto text-slate-700" />
                <h3 className="text-base font-bold text-slate-400">Nenhuma ficha em espera no momento</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Ao finalizar um atendimento como <strong>Pendente</strong>, você pode colocá-lo em espera para liberar o posto e retomá-lo posteriormente aqui.
                </p>
              </div>
            ) : (
              pendingTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-amber-500/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <span className="font-mono font-black text-2xl text-amber-400">
                        {t.formattedTicket}
                      </span>
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: t.priorityColor }}
                      >
                        {t.priorityName}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {t.serviceName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Pendente desde: {new Date(t.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300">
                      Cidadão: <strong className="text-white">{t.customerName || 'Não identificado'}</strong>
                      {t.customerDoc && <span className="text-slate-400 font-mono ml-2">({t.customerDoc})</span>}
                    </div>

                    {t.metadata?.observation && (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs">
                        <strong>Motivo / Observação:</strong> {t.metadata.observation}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <button
                      onClick={() => handleResumePending(t.id, t.formattedTicket)}
                      disabled={isPending || Boolean(currentTicket)}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition-all shadow-md ${
                        Boolean(currentTicket)
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                      }`}
                      title={
                        currentTicket
                          ? `Finalize ou marque 'Não Veio' na senha atual (${currentTicket.formattedTicket}) antes de retomar outra ficha`
                          : 'Retomar atendimento desta ficha'
                      }
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Retomar Atendimento</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* ========================================================
          VISÃO 3: HISTÓRICO DE ATENDIMENTOS (FILTRO DATA E BUSCA)
         ======================================================== */}
      {activeView === 'HISTORY' && (
        <main className="flex-1 rounded-3xl p-6 md:p-8 bg-slate-900/60 border border-slate-800 mb-6 flex flex-col">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-6 h-6 text-cyan-400" />
                <span>Histórico de Fichas Atendidas</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Consulta detalhada de atendimentos concluídos, resoluções, tempos e observações registradas.
              </p>
            </div>

            {/* Controles de Busca e Filtro por Data */}
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="bg-transparent text-xs text-white font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700 w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar senha, cidadão, atendente..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[550px]">
            {isLoadingHistory ? (
              <div className="text-center p-12 text-slate-400 animate-pulse">Carregando histórico...</div>
            ) : historyItems.length === 0 ? (
              <div className="text-center p-12 text-slate-500 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-700" />
                <p className="text-sm">Nenhum registro de atendimento encontrado para este filtro.</p>
              </div>
            ) : (
              historyItems.map((h) => {
                const isSolved = h.resolution === 'SOLVED'
                const isPendingRes = h.resolution === 'PENDING'
                const isRedirected = h.status === 'REDIRECTED'
                const isNoShow = h.status === 'NO_SHOW'

                return (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono font-bold text-lg text-white">
                          {h.formattedTicket}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: h.priorityColor }}
                        >
                          {h.priorityName}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {h.serviceName}
                        </span>

                        {/* Badge de Resolução */}
                        {isSolved && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Resolvido
                          </span>
                        )}
                        {isPendingRes && !isNoShow && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pendente
                          </span>
                        )}
                        {h.resolution === 'UNSOLVED' && !isRedirected && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <X className="w-3 h-3" /> Não Resolvido
                          </span>
                        )}
                        {isRedirected && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                            <ArrowRightLeft className="w-3 h-3" /> Redirecionado
                          </span>
                        )}
                        {isNoShow && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1">
                            <UserX className="w-3 h-3" /> Não Compareceu
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400 flex-wrap">
                        <span>Cidadão: <strong className="text-white">{h.customerName || 'Não identificado'}</strong></span>
                        <span>•</span>
                        <span>Atendente: <strong className="text-cyan-400">{h.attendantName || 'Sistema'}</strong></span>
                        <span>•</span>
                        <span>Posto: {h.locationName ? `${h.locationName} ${h.locationNumber}` : 'Geral'}</span>
                      </div>

                      {h.metadata?.observation && (
                        <p className="text-xs text-slate-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                          <strong className="text-cyan-400">Obs:</strong> {h.metadata.observation}
                        </p>
                      )}
                      {h.metadata?.redirectReason && (
                        <p className="text-xs text-indigo-300 bg-indigo-950/40 p-2 rounded-xl border border-indigo-900/60">
                          <strong className="text-indigo-400">Motivo Redirecionamento:</strong> {h.metadata.redirectReason}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 text-xs text-slate-400 font-mono space-y-1">
                      <div>
                        {h.finishedAt && (
                          <span>Concluído: {new Date(h.finishedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                      {h.serviceTimeSeconds > 0 && (
                        <div className="text-[11px] text-cyan-400">
                          Atendimento: {Math.floor(h.serviceTimeSeconds / 60)}m {h.serviceTimeSeconds % 60}s
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </main>
      )}

      {/* ========================================================
          MODAL: FINALIZAR ATENDIMENTO (REQUISITO 2)
          Serviço, Resolução (Resolvido, Pendente, Não Resolvido),
          Opção de colocar em espera e Observação
         ======================================================== */}
      {isFinishModalOpen && currentTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span>Finalizar Atendimento</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Senha: <strong className="text-cyan-400 font-mono text-sm">{currentTicket.formattedTicket}</strong> {currentTicket.customerName ? `• ${currentTicket.customerName}` : ''}
                </span>
              </div>
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção do Serviço */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Serviço Realizado
                </label>
                <select
                  value={finishServiceId}
                  onChange={(e) => setFinishServiceId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <optgroup label="Serviços Elegíveis para seu Guichê/Setor">
                    {eligibleServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.prefix}] {s.name}
                      </option>
                    ))}
                  </optgroup>
                  {allServices.some((s) => !eligibleServices.some((e) => e.id === s.id)) && (
                    <optgroup label="Outros Serviços da Unidade">
                      {allServices
                        .filter((s) => !eligibleServices.some((e) => e.id === s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            [{s.prefix}] {s.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Status de Resolução */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Status da Resolução
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFinishResolution('SOLVED')
                      setIsHoldPending(false)
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      finishResolution === 'SOLVED'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Resolvido</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFinishResolution('PENDING')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      finishResolution === 'PENDING'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Pendente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFinishResolution('UNSOLVED')
                      setIsHoldPending(false)
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      finishResolution === 'UNSOLVED'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <X className="w-4 h-4 text-rose-400" />
                    <span>Não Resolvido</span>
                  </button>
                </div>
              </div>

              {/* Opção especial para PENDENTE: Colocar em espera */}
              {finishResolution === 'PENDING' && (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 animate-fade-in space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHoldPending}
                      onChange={(e) => setIsHoldPending(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-300 block">
                        Colocar ficha em espera (Liberar Guichê)
                      </span>
                      <span className="text-[11px] text-slate-300">
                        O posto ficará livre imediatamente para você chamar a próxima senha. Você poderá retomar esta ficha na aba &quot;Fichas em Espera&quot;.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Observação Opcional */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Observações do Atendimento (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={finishObservation}
                  onChange={(e) => setFinishObservation(e.target.value)}
                  placeholder="Ex: Cidadão orientado a retornar com comprovante de residência atualizado..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsFinishModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                disabled={isPending}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                  finishResolution === 'PENDING' && isHoldPending
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {finishResolution === 'PENDING' && isHoldPending ? 'Colocar em Espera' : 'Concluir Atendimento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REDIRECIONAR ATENDIMENTO (REQUISITO 3)
          Erro na triagem -> Novo serviço/local com nova senha
         ======================================================== */}
      {isRedirectModalOpen && currentTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                  <span>Redirecionar Atendimento</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Senha Atual: <strong className="text-cyan-400 font-mono text-sm">{currentTicket.formattedTicket}</strong>
                </span>
              </div>
              <button
                onClick={() => setIsRedirectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 text-indigo-200 text-xs">
              Houve divergência na triagem? Ao redirecionar, uma <strong>nova senha será emitida</strong> com o serviço correto e a senha atual será arquivada como redirecionada.
            </div>

            <div className="space-y-4">
              {/* Novo Serviço de Destino */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Novo Serviço de Destino
                </label>
                <select
                  value={redirectServiceId}
                  onChange={(e) => setRedirectServiceId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {allServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.prefix}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prioridade do Atendimento */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Prioridade da Nova Senha
                </label>
                <select
                  value={redirectPriorityId}
                  onChange={(e) => setRedirectPriorityId(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {prioritiesList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Motivo do Redirecionamento */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Motivo do Redirecionamento
                </label>
                <textarea
                  rows={2}
                  value={redirectReason}
                  onChange={(e) => setRedirectReason(e.target.value)}
                  placeholder="Ex: Cidadão selecionou serviço errado no totem de autoatendimento..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsRedirectModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRedirect}
                disabled={isPending || !redirectServiceId}
                className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-40"
              >
                Confirmar & Gerar Nova Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-900 gap-2">
        <span>Posto de Atendimento Operacional • Autenticado como {currentUser.name}</span>
        <Link href={`/painel/${unit?.id || ''}`} target="_blank" className="text-cyan-400 hover:underline">
          Abrir Painel da TV em outra aba ➔
        </Link>
      </footer>
    </div>
  )
}
