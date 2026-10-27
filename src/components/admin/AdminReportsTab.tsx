'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Calendar,
  Clock,
  Timer,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Building2,
  DoorOpen,
  Briefcase,
  Users,
  ChevronLeft,
  ChevronRight,
  Shield,
  Download,
  FileText,
  UserCheck,
  Tag
} from 'lucide-react'
import {
  getAdminTicketsReport,
  TicketReportFilters,
  TicketReportItem,
  TicketReportSummary,
} from '@/actions/admin'

interface AdminReportsTabProps {
  units: any[]
  selectedUnitId: string
  rooms: any[]
  services: any[]
  usersList: any[]
  currentUser: any
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  if (minutes < 60) {
    return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return `${hours}h ${remainingMins}m`
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return '--'
  try {
    const d = new Date(isoString)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return isoString
  }
}

function formatTimeOnly(isoString: string | null): string {
  if (!isoString) return '--'
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

function getTodayStr(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

export function AdminReportsTab({
  units,
  selectedUnitId,
  rooms,
  services,
  usersList,
  currentUser,
}: AdminReportsTabProps) {
  // Filtros de busca
  const [filterUnitId, setFilterUnitId] = useState(selectedUnitId || (units[0]?.id || ''))
  const [startDate, setStartDate] = useState(getTodayStr())
  const [endDate, setEndDate] = useState(getTodayStr())
  const [filterServiceId, setFilterServiceId] = useState('ALL')
  const [filterRoomId, setFilterRoomId] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPriorityId, setFilterPriorityId] = useState<number>(0)
  const [filterUserId, setFilterUserId] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Estado dos dados
  const [ticketsList, setTicketsList] = useState<TicketReportItem[]>([])
  const [summary, setSummary] = useState<TicketReportSummary>({
    total: 0,
    finished: 0,
    noShow: 0,
    cancelled: 0,
    inProgress: 0,
    waiting: 0,
    avgWaitSeconds: 0,
    avgServiceSeconds: 0,
    byPriority: {},
    byService: {},
    byRoom: {},
  })

  const [isPending, startTransition] = useTransition()
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [printReportType, setPrintReportType] = useState<'ANALYTIC' | 'SYNTHETIC'>('ANALYTIC')

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Sincroniza com a unidade selecionada no topo
  useEffect(() => {
    if (selectedUnitId) {
      setFilterUnitId(selectedUnitId)
    }
  }, [selectedUnitId])

  // Busca dados
  const handleFetchReport = () => {
    startTransition(async () => {
      try {
        const filters: TicketReportFilters = {
          unitId: filterUnitId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          serviceId: filterServiceId !== 'ALL' ? filterServiceId : undefined,
          roomId: filterRoomId !== 'ALL' ? filterRoomId : undefined,
          status: filterStatus !== 'ALL' ? filterStatus : undefined,
          priorityId: filterPriorityId > 0 ? filterPriorityId : undefined,
          userId: filterUserId !== 'ALL' ? filterUserId : undefined,
          searchQuery: searchQuery.trim() || undefined,
        }

        const res = await getAdminTicketsReport(filters)
        setTicketsList(res.items)
        setSummary(res.summary)
        setCurrentPage(1)
      } catch (err) {
        console.error('Erro ao buscar relatório:', err)
      }
    })
  }

  // Carrega ao montar ou ao trocar de unidade
  useEffect(() => {
    if (filterUnitId) {
      handleFetchReport()
    }
  }, [filterUnitId])

  // Atalhos de datas
  const handleDateShortcut = (type: 'TODAY' | 'YESTERDAY' | 'LAST7' | 'THIS_MONTH') => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    if (type === 'TODAY') {
      setStartDate(todayStr)
      setEndDate(todayStr)
    } else if (type === 'YESTERDAY') {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      setStartDate(yesterdayStr)
      setEndDate(yesterdayStr)
    } else if (type === 'LAST7') {
      const past7 = new Date(today)
      past7.setDate(today.getDate() - 6)
      setStartDate(past7.toISOString().split('T')[0])
      setEndDate(todayStr)
    } else if (type === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setStartDate(firstDay.toISOString().split('T')[0])
      setEndDate(todayStr)
    }
  }

  // Status Label Helper (Nomes Amigáveis para Exibição / PDF)
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'FINISHED':
        return 'Concluído'
      case 'IN_PROGRESS':
        return 'Em Atendimento'
      case 'CALLED':
        return 'Chamada'
      case 'ISSUED':
        return 'Na Fila'
      case 'NO_SHOW':
        return 'Não Compareceu'
      case 'CANCELLED':
        return 'Cancelada'
      default:
        return status
    }
  }

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Concluído
          </span>
        )
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> Em Atendimento
          </span>
        )
      case 'CALLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30">
            <AlertTriangle className="w-3 h-3" /> Chamada
          </span>
        )
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Não Compareceu
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30">
            <XCircle className="w-3 h-3" /> Cancelada
          </span>
        )
      case 'ISSUED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
            <Clock className="w-3 h-3" /> Na Fila
          </span>
        )
    }
  }

  // Disparar Impressão / Salvar PDF
  const handlePrint = (type: 'ANALYTIC' | 'SYNTHETIC') => {
    setPrintReportType(type)
    setIsPrintModalOpen(false)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  // Dados paginados
  const totalPages = Math.ceil(ticketsList.length / pageSize) || 1
  const paginatedTickets = ticketsList.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const activeUnit = units.find((u) => u.id === filterUnitId) || units[0]

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo de Relatórios */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Consulta de Senhas & Relatórios
              </h2>
              <p className="text-xs text-slate-400">
                Auditoria analítica completa de senhas emitidas, tempos de espera e emissão de relatórios em PDF.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação Superior */}
        <div className="flex items-center gap-2.5 shrink-0 z-10 flex-wrap">
          <button
            onClick={() => handleFetchReport()}
            disabled={isPending}
            className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Recarregar dados com filtros atuais"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={ticketsList.length === 0}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition-all shadow-md shadow-cyan-500/25 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Gerar e exportar relatório em PDF com filtros aplicados"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar Relatório PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Filtros Avançados */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros Avançados de Pesquisa</span>
          </div>

          {/* Atalhos Rápidos de Datas */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] text-slate-500 hidden sm:inline mr-1">Atalhos:</span>
            <button
              onClick={() => handleDateShortcut('TODAY')}
              type="button"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
            >
              Hoje
            </button>
            <button
              onClick={() => handleDateShortcut('YESTERDAY')}
              type="button"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
            >
              Ontem
            </button>
            <button
              onClick={() => handleDateShortcut('LAST7')}
              type="button"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => handleDateShortcut('THIS_MONTH')}
              type="button"
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors shrink-0"
            >
              Este Mês
            </button>
          </div>
        </div>

        {/* Grade de Controles de Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {/* Unidade */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-400" /> Unidade
            </label>
            <select
              value={filterUnitId}
              onChange={(e) => setFilterUnitId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" /> Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" /> Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Sala */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <DoorOpen className="w-3 h-3 text-cyan-400" /> Sala / Posto
            </label>
            <select
              value={filterRoomId}
              onChange={(e) => setFilterRoomId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas as Salas</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.number ? `(${r.number})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Serviço */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-cyan-400" /> Serviço
            </label>
            <select
              value={filterServiceId}
              onChange={(e) => setFilterServiceId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Serviços</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.prefix}] {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-cyan-400" /> Status da Senha
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Status</option>
              <option value="FINISHED">Concluído (Atendido)</option>
              <option value="IN_PROGRESS">Em Atendimento</option>
              <option value="CALLED">Chamada</option>
              <option value="ISSUED">Aguardando na Fila</option>
              <option value="NO_SHOW">Não Compareceu</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          {/* Atendente */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" /> Atendente
            </label>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Atendentes</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Busca Textual */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-cyan-400" /> Senha, Cidadão ou Doc
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: SG001, Maria, CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchReport()}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Botão de Aplicar Filtros */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleFetchReport}
            disabled={isPending}
            className="h-10 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Filtrar Senhas</span>
          </button>
        </div>
      </div>

      {/* 3. Cards de Indicadores Consolidados (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Emitidas */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block">Total de Senhas</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{summary.total}</span>
            <span className="text-[10px] text-cyan-400 font-mono">100%</span>
          </div>
        </div>

        {/* Atendidas / Finalizadas */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
          <span className="text-[11px] font-bold text-emerald-300 block">Atendidas</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">{summary.finished}</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">
              {summary.total > 0 ? `${Math.round((summary.finished / summary.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Desistências / Não Compareceu */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1">
          <span className="text-[11px] font-bold text-rose-300 block">Não Compareceu</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-400">{summary.noShow + summary.cancelled}</span>
            <span className="text-[10px] text-rose-400/80 font-mono">
              {summary.total > 0 ? `${Math.round(((summary.noShow + summary.cancelled) / summary.total) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Tempo Médio de Espera (TME) */}
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-1">
          <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1">
            <Clock className="w-3 h-3" /> TME (Espera Média)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-sky-400">
              {formatDuration(summary.avgWaitSeconds)}
            </span>
            <span className="text-[10px] text-sky-400/80 font-mono">Médio</span>
          </div>
        </div>

        {/* Tempo Médio de Atendimento (TMA) */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1">
            <Timer className="w-3 h-3" /> TMA (Atend. Médio)
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-indigo-400">
              {formatDuration(summary.avgServiceSeconds)}
            </span>
            <span className="text-[10px] text-indigo-400/80 font-mono">Médio</span>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Senhas Emitidas (Visualização Web & Mobile) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <span>Senhas Encontradas</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-mono">
              {ticketsList.length}
            </span>
          </h3>

          {/* Paginação Compacta */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Visualização Desktop (Tabela Completa com Scroll Seguro) */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Senha</th>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Cidadão / Doc</th>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Serviço</th>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Sala / Posto</th>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Atendente</th>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Emissão</th>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Espera</th>
                <th className="py-3 px-3.5 text-slate-700 dark:text-slate-400">Atendimento</th>
                <th className="py-3 px-3.5 text-right text-slate-700 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Nenhuma senha encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Senha e Prioridade */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {t.formattedTicket}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                          style={{
                            backgroundColor: `${t.priorityColor}20`,
                            color: t.priorityColor,
                            border: `1px solid ${t.priorityColor}40`,
                          }}
                        >
                          {t.priorityName}
                        </span>
                      </div>
                    </td>

                    {/* Cidadão / Doc */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-slate-900 dark:text-white block font-bold truncate max-w-[150px]">
                        {t.customerName || 'Não identificado'}
                      </span>
                      {t.customerDoc && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Doc: {t.customerDoc}
                        </span>
                      )}
                    </td>

                    {/* Serviço */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-slate-800 dark:text-slate-200 block truncate max-w-[140px]">
                        {t.serviceName}
                      </span>
                    </td>

                    {/* Sala / Local */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-slate-700 dark:text-slate-300 block truncate max-w-[120px]">
                        {t.roomName || 'Geral'}
                      </span>
                      {t.locationName && (
                        <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono block">
                          {t.locationName} {t.locationNumber}
                        </span>
                      )}
                    </td>

                    {/* Atendente */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-slate-700 dark:text-slate-300 block truncate max-w-[120px]">
                        {t.attendantName || '--'}
                      </span>
                    </td>

                    {/* Horário de Emissão */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {formatTimeOnly(t.createdAt)}
                    </td>

                    {/* Tempo de Espera */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-sky-600 dark:text-sky-400">
                      {formatDuration(t.waitTimeSeconds)}
                    </td>

                    {/* Tempo de Atendimento */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      {formatDuration(t.serviceTimeSeconds)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right">
                      {getStatusBadge(t.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Visualização Mobile (Cards Responsivos - Não quebra em telas de celular) */}
        <div className="md:hidden space-y-3">
          {paginatedTickets.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma senha encontrada com os filtros selecionados.
            </div>
          ) : (
            paginatedTickets.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs"
              >
                {/* Linha 1: Senha, Prioridade e Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-white">
                      {t.formattedTicket}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                      style={{
                        backgroundColor: `${t.priorityColor}20`,
                        color: t.priorityColor,
                        border: `1px solid ${t.priorityColor}40`,
                      }}
                    >
                      {t.priorityName}
                    </span>
                  </div>
                  <div>{getStatusBadge(t.status)}</div>
                </div>

                {/* Linha 2: Cidadão e Serviço */}
                <div className="text-slate-300">
                  <div className="font-bold text-white truncate">
                    {t.customerName || 'Cidadão não identificado'}
                  </div>
                  <div className="text-[11px] text-cyan-400 truncate mt-0.5">
                    {t.serviceName}
                  </div>
                </div>

                {/* Linha 3: Sala, Atendente e Horários */}
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sala / Posto:</span>
                    <span className="text-slate-200 font-medium">
                      {t.roomName || 'Geral'}{t.locationNumber ? ` (${t.locationName} ${t.locationNumber})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Atendente:</span>
                    <span className="text-slate-200 font-medium">{t.attendantName || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Espera:</span>
                    <span className="text-sky-400 font-mono">{formatDuration(t.waitTimeSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Atendimento:</span>
                    <span className="text-indigo-400 font-mono">{formatDuration(t.serviceTimeSeconds)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL DE CONFIGURAÇÃO DE IMPRESSÃO / PDF
         ======================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                Opções do Relatório PDF
              </h3>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Selecione o formato do documento PDF a ser gerado com base nos filtros ativos:
              </p>

              {/* Opção 1: Relatório Analítico Completo */}
              <button
                onClick={() => handlePrint('ANALYTIC')}
                className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group flex items-start gap-3 cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 mt-0.5">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                    1. Relatório Analítico Completo
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Inclui cabeçalho institucional, indicadores gerais (TME, TMA, totais) e listagem detalhada de todas as {ticketsList.length} senhas filtradas.
                  </p>
                </div>
              </button>

              {/* Opção 2: Relatório Sintético (Resumo Executivo) */}
              <button
                onClick={() => handlePrint('SYNTHETIC')}
                className="w-full p-4 rounded-2xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group flex items-start gap-3 cursor-pointer"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    2. Relatório Sintético (Resumo Executivo)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Resumo em 1 página contendo os totais de atendimentos, médias de tempo, distribuição por salas e serviços.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DOCUMENTO OFICIAL FORMATADO PARA IMPRESSÃO / SALVAR COMO PDF
          (Visível apenas quando window.print() é disparado via @media print)
         ======================================================== */}
      <div id="print-report-container" className="hidden print:block text-black bg-white p-8">
        {/* Cabeçalho Institucional do Relatório */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {activeUnit.logoUrl ? (
              <img
                src={activeUnit.logoUrl}
                alt="Brasão"
                className="w-14 h-14 object-contain"
              />
            ) : (
              <div className="w-14 h-14 bg-slate-200 border border-slate-400 flex items-center justify-center font-bold text-lg">
                {activeUnit.code?.slice(0, 2) || 'UN'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">
                {activeUnit.name}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {activeUnit.subtitle || 'Sistema Integrado de Atendimento e Chamadas'}
              </p>
              <h2 className="text-sm font-bold text-cyan-800 uppercase mt-1">
                {printReportType === 'ANALYTIC'
                  ? 'Relatório Analítico de Senhas Emitidas e Atendimentos'
                  : 'Relatório Sintético de Indicadores e Gestão de Fila'}
              </h2>
            </div>
          </div>

          <div className="text-right text-[10px] text-slate-600 font-mono leading-tight">
            <div>Data de Emissão: {new Date().toLocaleString('pt-BR')}</div>
            <div>Emitido por: {currentUser?.name || 'Administrador'}</div>
            <div>Código Unidade: {activeUnit.code}</div>
          </div>
        </div>

        {/* Metadados dos Filtros Utilizados */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs mb-6 grid grid-cols-3 gap-2">
          <div>
            <span className="font-bold text-slate-700">Período: </span>
            <span>{startDate ? formatDateTime(`${startDate}T00:00:00`) : 'Início'} até {endDate ? formatDateTime(`${endDate}T23:59:59`) : 'Fim'}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Status: </span>
            <span>{filterStatus === 'ALL' ? 'Todos os Status' : getStatusLabel(filterStatus)}</span>
          </div>
          <div>
            <span className="font-bold text-slate-700">Sala: </span>
            <span>{filterRoomId === 'ALL' ? 'Todas as Salas' : rooms.find(r => r.id === filterRoomId)?.name || 'Específica'}</span>
          </div>
        </div>

        {/* Quadro de Indicadores Consolidados */}
        <div className="mb-6">
          <h3 className="text-xs font-black uppercase text-slate-800 mb-2 border-b border-slate-300 pb-1">
            Indicadores de Desempenho Operacional (KPIs)
          </h3>
          <div className="grid grid-cols-5 gap-3">
            <div className="border border-slate-300 rounded p-2 text-center bg-slate-50">
              <span className="text-[10px] text-slate-600 block">Total Emitidas</span>
              <span className="text-lg font-black text-slate-900">{summary.total}</span>
            </div>
            <div className="border border-slate-300 rounded p-2 text-center bg-slate-50">
              <span className="text-[10px] text-slate-600 block">Concluídas</span>
              <span className="text-lg font-black text-emerald-800">{summary.finished}</span>
            </div>
            <div className="border border-slate-300 rounded p-2 text-center bg-slate-50">
              <span className="text-[10px] text-slate-600 block">Não Compareceu</span>
              <span className="text-lg font-black text-rose-800">{summary.noShow + summary.cancelled}</span>
            </div>
            <div className="border border-slate-300 rounded p-2 text-center bg-slate-50">
              <span className="text-[10px] text-slate-600 block">TME (Espera Média)</span>
              <span className="text-lg font-black text-sky-800">{formatDuration(summary.avgWaitSeconds)}</span>
            </div>
            <div className="border border-slate-300 rounded p-2 text-center bg-slate-50">
              <span className="text-[10px] text-slate-600 block">TMA (Atend. Médio)</span>
              <span className="text-lg font-black text-indigo-800">{formatDuration(summary.avgServiceSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Se Sintético: Distribuições por Serviço e Sala */}
        {printReportType === 'SYNTHETIC' && (
          <div className="grid grid-cols-2 gap-6 my-6">
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-800 border-b pb-1 mb-2">
                Atendimentos por Serviço
              </h4>
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(summary.byService).map(([serv, count]) => (
                    <tr key={serv} className="border-b border-slate-200">
                      <td className="py-1 font-medium">{serv}</td>
                      <td className="py-1 text-right font-bold">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-800 border-b pb-1 mb-2">
                Atendimentos por Sala / Posto
              </h4>
              <table className="w-full text-xs">
                <tbody>
                  {Object.entries(summary.byRoom).map(([r, count]) => (
                    <tr key={r} className="border-b border-slate-200">
                      <td className="py-1 font-medium">{r}</td>
                      <td className="py-1 text-right font-bold">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Se Analítico: Tabela com todas as senhas */}
        {printReportType === 'ANALYTIC' && (
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 mb-2 border-b border-slate-300 pb-1">
              Listagem Analítica de Senhas ({ticketsList.length} registros)
            </h3>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-700 font-bold bg-slate-100">
                  <th className="py-1.5 px-2">Senha</th>
                  <th className="py-1.5 px-2">Prioridade</th>
                  <th className="py-1.5 px-2">Cidadão</th>
                  <th className="py-1.5 px-2">Serviço</th>
                  <th className="py-1.5 px-2">Sala/Posto</th>
                  <th className="py-1.5 px-2">Atendente</th>
                  <th className="py-1.5 px-2">Emissão</th>
                  <th className="py-1.5 px-2">Espera</th>
                  <th className="py-1.5 px-2">Atendimento</th>
                  <th className="py-1.5 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {ticketsList.map((t, idx) => (
                  <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-1 px-2 font-mono font-bold">{t.formattedTicket}</td>
                    <td className="py-1 px-2">{t.priorityName}</td>
                    <td className="py-1 px-2">{t.customerName || '--'}</td>
                    <td className="py-1 px-2">{t.serviceName}</td>
                    <td className="py-1 px-2">{t.roomName || 'Geral'}</td>
                    <td className="py-1 px-2">{t.attendantName || '--'}</td>
                    <td className="py-1 px-2 font-mono">{formatTimeOnly(t.createdAt)}</td>
                    <td className="py-1 px-2 font-mono">{formatDuration(t.waitTimeSeconds)}</td>
                    <td className="py-1 px-2 font-mono">{formatDuration(t.serviceTimeSeconds)}</td>
                    <td className="py-1 px-2 text-right font-bold">{getStatusLabel(t.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé da Impressão */}
        <div className="mt-8 pt-4 border-t border-slate-400 text-center text-[9px] text-slate-500">
          Documento gerado automaticamente pelo Sistema Operacional de Chamadas e Atendimento • Página 1
        </div>
      </div>
    </div>
  )
}
