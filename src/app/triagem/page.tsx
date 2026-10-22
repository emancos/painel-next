'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getUnitData, issueTicket } from '@/actions/tickets'
import { getSessionAction, logoutAction } from '@/actions/auth'
import {
  Ticket,
  Sparkles,
  User,
  CheckCircle2,
  Printer,
  ArrowLeft,
  Layers,
  HelpCircle,
  CreditCard,
  FileText,
  LogOut,
  Tv,
  UserCheck,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { AdminThemeToggle } from '@/components/theme/AdminThemeToggle'

interface ServiceItem {
  id: string
  name: string
  prefix: string
}

interface PriorityItem {
  id: number
  name: string
  description: string | null
  colorHex: string
}

interface IssuedTicketModalData {
  formattedTicket: string
  serviceName: string
  priorityName: string
  priorityColor: string
  peopleAhead: number
  createdAt: Date
  customerName?: string | null
  unitName: string
  unitSubtitle?: string | null
  unitLogoUrl?: string | null
}

export default function TriagemTotemPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [unit, setUnit] = useState<{ id: string; name: string; subtitle?: string | null; logoUrl?: string | null } | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [priorities, setPriorities] = useState<PriorityItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<PriorityItem | null>(null)
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicketModalData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 1. Verifica autenticação obrigatória para acessar a triagem
  useEffect(() => {
    getSessionAction().then((u) => {
      if (!u) {
        router.push('/login?redirect=/triagem')
      } else {
        setCurrentUser(u)
        setIsAuthChecking(false)
      }
    })
  }, [router])

  // 2. Carrega dados da unidade, serviços e prioridades
  useEffect(() => {
    getUnitData()
      .then((data) => {
        if (!data) return
        setUnit(data.unit)
        setServices(data.services)
        setPriorities(data.priorities)
        if (data.priorities.length > 0) {
          setSelectedPriority(data.priorities[0])
        }
      })
      .catch((err) => console.error('Erro ao carregar dados da unidade:', err))
  }, [])

  const handleLogout = async () => {
    await logoutAction()
    router.push('/login')
  }

  const handleIssue = (service: ServiceItem, priority: PriorityItem) => {
    if (!unit) return
    setErrorMsg(null)

    startTransition(async () => {
      try {
        const res = await issueTicket({
          unitId: unit.id,
          serviceId: service.id,
          priorityId: priority.id,
          customerName: customerName.trim() || undefined,
        })

        setIssuedTicket({
          formattedTicket: res.formattedTicket,
          serviceName: res.serviceName,
          priorityName: res.priorityName,
          priorityColor: res.priorityColor,
          peopleAhead: res.peopleAhead,
          createdAt: new Date(res.createdAt),
          customerName: customerName.trim() || null,
          unitName: unit.name,
          unitSubtitle: unit.subtitle || null,
          unitLogoUrl: unit.logoUrl || null,
        })

        setCustomerName('')
      } catch (err) {
        setErrorMsg((err as Error).message)
      }
    })
  }

  const handlePrintTicket = () => {
    window.print()
  }

  const getServiceVisuals = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('caixa') || n.includes('pagamento')) {
      return {
        icon: <CreditCard className="w-8 h-8 text-amber-500" />,
        badgeClass: 'bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300',
        cardClass: 'card-boom-amber',
        accentGradient: 'from-amber-500 to-orange-500',
      }
    }
    if (n.includes('triagem') || n.includes('doc')) {
      return {
        icon: <FileText className="w-8 h-8 text-emerald-500" />,
        badgeClass: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
        cardClass: 'card-boom-emerald',
        accentGradient: 'from-emerald-500 to-teal-500',
      }
    }
    if (n.includes('priorit')) {
      return {
        icon: <Sparkles className="w-8 h-8 text-purple-500" />,
        badgeClass: 'bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300',
        cardClass: 'card-boom-purple',
        accentGradient: 'from-purple-500 to-indigo-500',
      }
    }
    return {
      icon: <Layers className="w-8 h-8 text-cyan-500" />,
      badgeClass: 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
      cardClass: 'card-boom-cyan',
      accentGradient: 'from-cyan-500 to-blue-600',
    }
  }

  const getPriorityVisuals = (p: PriorityItem) => {
    const n = p.name.toLowerCase()
    if (n.includes('especial') || n.includes('pcd') || n.includes('80')) {
      return {
        tag: '80+ • PCD • Mobilidade Reduzida',
        activeClass: 'border-2 border-purple-500 bg-purple-500/15 dark:bg-purple-500/20 text-purple-900 dark:text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.3)] ring-2 ring-purple-500/30',
        inactiveClass: 'border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-slate-900/40 hover:border-purple-400',
        dotClass: 'bg-purple-500',
        pillClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
      }
    }
    if (n.includes('priorit') || n.includes('60')) {
      return {
        tag: '60+ • Gestantes • Lactantes',
        activeClass: 'border-2 border-amber-500 bg-amber-500/15 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/30',
        inactiveClass: 'border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-slate-900/40 hover:border-amber-400',
        dotClass: 'bg-amber-500',
        pillClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
      }
    }
    return {
      tag: 'Ordem de Chegada',
      activeClass: 'border-2 border-cyan-500 bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.3)] ring-2 ring-cyan-500/30',
      inactiveClass: 'border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50/50 dark:bg-slate-900/40 hover:border-cyan-400',
      dotClass: 'bg-cyan-500',
      pillClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30',
    }
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Verificando autorização de acesso ao módulo de triagem...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between p-6 md:p-10 admin-page-container transition-colors duration-200 relative overflow-hidden">
      {/* Luzes de Fundo Ambientais */}
      <div className="mesh-orb-cyan -top-24 -left-24 w-96 h-96 opacity-40 dark:opacity-30 pointer-events-none" />
      <div className="mesh-orb-amber top-1/2 -right-24 w-[450px] h-[450px] opacity-35 dark:opacity-20 pointer-events-none" />
      <div className="mesh-orb-purple -bottom-24 left-1/3 w-96 h-96 opacity-30 dark:opacity-20 pointer-events-none" />

      {/* Topo do Totem com Identidade Institucional da Unidade e Identificação do Operador */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 z-10">
        <div className="flex items-center space-x-4">
          {currentUser?.role === 'ADMIN' ? (
            <Link
              href="/admin"
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs hover:scale-105"
              title="Voltar ao Painel Administrativo"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : currentUser?.role === 'ATTENDANT' ? (
            <Link
              href="/atendimento"
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-all shadow-xs hover:scale-105"
              title="Voltar ao Atendimento"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          ) : (
            <div
              className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-xs"
              title="Posto de Triagem e Recepção Autorizado"
            >
              <Ticket className="w-5 h-5" />
            </div>
          )}

          {unit?.logoUrl ? (
            <img
              src={unit.logoUrl}
              alt="Logo"
              className="w-12 h-12 object-contain rounded-2xl bg-white/10 p-1.5 border border-slate-300 dark:border-slate-700 shadow-md transition-transform hover:scale-105"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-cyan-500/30">
              {unit?.name?.charAt(0) || 'U'}
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {unit?.name || 'Unidade de Atendimento'}
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-bold uppercase shadow-xs">
                Totem de Emissão
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {unit?.subtitle || 'Toque no serviço desejado para emitir sua senha'}
            </p>
          </div>
        </div>

        {/* Informações do Operador Autenticado e Ações Rápidas */}
        <div className="flex items-center space-x-3 shrink-0 self-end md:self-auto flex-wrap gap-y-2">
          {/* Alternador de Tema Claro / Escuro (Admin/Sistema) */}
          <AdminThemeToggle />

          {currentUser && (
            <div className="h-11 px-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 hidden sm:flex items-center space-x-2 shrink-0 shadow-xs">
              <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div className="text-left text-xs leading-tight">
                <span className="font-bold text-slate-900 dark:text-white block">{currentUser.name}</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono block">
                  {currentUser.role === 'TRIAGE' ? 'Operador de Triagem' : currentUser.role}
                </span>
              </div>
            </div>
          )}

          {/* Atalho para Painel de Chamadas TV */}
          {unit?.id && (
            <Link
              href={`/painel/${unit.id}`}
              target="_blank"
              className="h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0 active:scale-95"
              title="Abrir Painel de Chamadas da TV"
            >
              <Tv className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden lg:inline">Painel TV</span>
            </Link>
          )}

          {/* Botão Sair / Logout */}
          <button
            onClick={handleLogout}
            className="h-11 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0 active:scale-95"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-5xl w-full mx-auto my-8 space-y-8 flex-1 flex flex-col justify-center z-10">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-sm font-bold shadow-xs">
            {errorMsg}
          </div>
        )}

        {/* Campo Opcional de Identificação para Fala */}
        <div className="card-boom p-6">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2 mb-2">
            <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Nome do Cidadão / Paciente (Opcional - para ser anunciado no painel por voz)</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Digite seu nome (Ex: João da Silva)..."
            className="w-full px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 font-medium text-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
          />
        </div>

        {/* Seleção de Prioridade (Abas Específicas por Cor) */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>1. Selecione o Tipo de Atendimento:</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {priorities.map((p) => {
              const isSelected = selectedPriority?.id === p.id
              const vis = getPriorityVisuals(p)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className={`p-5 rounded-2xl text-left transition-all ${
                    isSelected ? vis.activeClass : vis.inactiveClass
                  } active:scale-[0.98] shadow-xs cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${vis.dotClass} shadow-xs`}
                        style={{ backgroundColor: p.colorHex || undefined }}
                      />
                      <span className="font-black text-slate-900 dark:text-white text-base">{p.name}</span>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-white font-extrabold uppercase tracking-wider shadow-xs">
                        Selecionado
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider block mb-1.5 w-fit ${vis.pillClass}`}>
                    {vis.tag}
                  </span>

                  {p.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Seleção do Serviço (Botões Grandes de Toque) */}
        <div className="space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>2. Toque no Serviço para Imprimir / Emitir a Senha:</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((s) => {
              const vis = getServiceVisuals(s.name)
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={isPending || !selectedPriority}
                  onClick={() => handleIssue(s, selectedPriority!)}
                  className={`group p-6 rounded-3xl card-boom ${vis.cardClass} flex items-center justify-between text-left active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 flex items-center justify-center group-hover:scale-110 group-hover:rotate-1 transition-all shadow-xs">
                      {vis.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-black px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                          Prefixo: {s.prefix}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {s.name}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        Toque para imprimir ficha
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 group-hover:bg-gradient-to-r group-hover:from-cyan-500 group-hover:to-blue-600 group-hover:text-white group-hover:border-transparent transition-all shadow-xs">
                    <Printer className="w-6 h-6" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {/* Modal / Feedback de Senha Emitida */}
      {issuedTicket && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-fade-in relative overflow-hidden my-auto">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Senha Emitida com Sucesso
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {issuedTicket.createdAt.toLocaleTimeString('pt-BR')}
              </span>
            </div>

            {/* Template / Cupom Térmico Estilizado (Visual de Papel Térmico) */}
            <div className="bg-white text-slate-950 rounded-2xl p-5 shadow-xl border border-slate-200 text-left font-mono relative overflow-hidden">
              {/* Serrilhado superior decorativo */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-950/10 border-b border-dashed border-slate-300" />

              {/* Cabeçalho do Cupom */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 pt-1">
                {issuedTicket.unitLogoUrl && (
                  <img
                    src={issuedTicket.unitLogoUrl}
                    alt="Logo Unidade"
                    className="max-h-10 mx-auto object-contain mb-1.5 filter grayscale"
                  />
                )}
                <h4 className="font-bold text-xs uppercase text-slate-900 leading-snug">
                  {issuedTicket.unitName}
                </h4>
                {issuedTicket.unitSubtitle && (
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {issuedTicket.unitSubtitle}
                  </p>
                )}
              </div>

              {/* Senha e Prioridade */}
              <div className="text-center py-3 border-b border-dashed border-slate-300">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">
                  SENHA DE ATENDIMENTO
                </span>
                <div className="text-5xl font-black text-slate-950 tracking-tight my-1 font-mono">
                  {issuedTicket.formattedTicket}
                </div>
                <div
                  className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold uppercase text-white mt-1 shadow-sm"
                  style={{ backgroundColor: issuedTicket.priorityColor }}
                >
                  {issuedTicket.priorityName}
                </div>
              </div>

              {/* Informações da Fila e Serviço */}
              <div className="py-3 border-b border-dashed border-slate-300 text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">SERVIÇO:</span>
                  <span className="font-bold text-slate-900 text-right">{issuedTicket.serviceName}</span>
                </div>
                {issuedTicket.customerName && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">CIDADÃO:</span>
                    <span className="font-bold text-slate-900 text-right">{issuedTicket.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">NA FILA:</span>
                  <span className="font-bold text-emerald-700">{issuedTicket.peopleAhead} aguardando</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">EMISSÃO:</span>
                  <span className="font-mono text-slate-800">
                    {issuedTicket.createdAt.toLocaleDateString('pt-BR')} {issuedTicket.createdAt.toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Mensagem de Rodapé do Cupom */}
              <div className="pt-3 text-center text-[10px] text-slate-500 leading-snug">
                <p className="font-semibold">Acompanhe pelo painel eletrônico.</p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Atendimento Prioritário: Lei Federal nº 10.048/2000
                </p>
              </div>
            </div>

            {/* Ações: Imprimir Térmica e Concluir */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handlePrintTicket}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.99]"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir Senha</span>
              </button>

              <button
                type="button"
                onClick={() => setIssuedTicket(null)}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all"
              >
                Concluir / Emitir Nova Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Dedicado para Impressora Térmica (80mm / 58mm ESC/POS) */}
      {issuedTicket && (
        <div id="thermal-ticket-container" className="hidden print:block text-black bg-white font-mono">
          <div className="w-[74mm] max-w-[74mm] mx-auto text-center text-[11px] leading-tight p-2">
            {issuedTicket.unitLogoUrl && (
              <div className="flex justify-center mb-2">
                <img
                  src={issuedTicket.unitLogoUrl}
                  alt="Brasão"
                  className="max-h-12 max-w-[40mm] object-contain filter grayscale contrast-200"
                />
              </div>
            )}
            <div className="font-bold text-xs uppercase tracking-wide">
              {issuedTicket.unitName}
            </div>
            {issuedTicket.unitSubtitle && (
              <div className="text-[10px] text-gray-700 mt-0.5">
                {issuedTicket.unitSubtitle}
              </div>
            )}

            <div className="my-2 border-b border-dashed border-black"></div>

            <div className="text-[10px] uppercase font-bold tracking-widest text-gray-600">
              SENHA DE ATENDIMENTO
            </div>
            <div className="text-4xl font-black tracking-wider my-1 font-mono">
              {issuedTicket.formattedTicket}
            </div>
            <div className="text-xs font-black uppercase tracking-wider px-2 py-0.5 border border-black inline-block my-1">
              {issuedTicket.priorityName}
            </div>

            <div className="my-2 border-b border-dashed border-black"></div>

            <div className="text-center space-y-1 text-[11px] my-1">
              <div>
                <span className="font-bold">SERVIÇO: </span>
                <span>{issuedTicket.serviceName}</span>
              </div>
              {issuedTicket.customerName && (
                <div>
                  <span className="font-bold">CIDADÃO: </span>
                  <span>{issuedTicket.customerName}</span>
                </div>
              )}
              <div>
                <span className="font-bold">NA FILA: </span>
                <span>{issuedTicket.peopleAhead} pessoa(s) à frente</span>
              </div>
              <div>
                <span className="font-bold">EMISSÃO: </span>
                <span>
                  {issuedTicket.createdAt.toLocaleDateString('pt-BR')}{' '}
                  {issuedTicket.createdAt.toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </div>

            <div className="my-2 border-b border-dashed border-black"></div>

            <div className="text-[9px] text-gray-800 leading-tight space-y-1 mt-2">
              <p className="font-bold uppercase">Acompanhe pelo painel eletrônico</p>
              <p>Atendimento Prioritário assegurado pela Lei Federal nº 10.048/2000</p>
              <p className="pt-1">Obrigado pela preferência!</p>
            </div>

            {/* Margem para corte de papel da guilhotina térmica */}
            <div className="h-8"></div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <footer className="text-center text-xs text-slate-500 pt-6 border-t border-slate-900 no-print">
        Atendimento prioritário assegurado pela Lei Federal nº 10.048/2000.
      </footer>
    </div>
  )
}
