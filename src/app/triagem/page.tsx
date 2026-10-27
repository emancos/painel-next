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
  CreditCard,
  FileText,
  LogOut,
  Tv,
  UserCheck,
  Loader2,
  Building,
  DoorOpen,
  ChevronRight,
  MapPin,
} from 'lucide-react'
import Link from 'next/link'
import { AdminThemeToggle } from '@/components/theme/AdminThemeToggle'
import { UserNavbarBadge } from '@/components/UserNavbarBadge'
import { setDocumentFavicon } from '@/lib/favicon'

interface ServiceItem {
  id: string
  name: string
  prefix: string
  roomId?: string | null
  userId?: string | null
  attendantName?: string | null
  locationName?: string | null
  roomName?: string | null
}

interface PriorityItem {
  id: number
  name: string
  description: string | null
  colorHex: string
}

interface FloorItem {
  id: string
  name: string
  number: number
}

interface RoomItem {
  id: string
  floorId?: string | null
  name: string
  number?: string | null
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
  roomName?: string | null
  floorName?: string | null
}

export default function TriagemTotemPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; avatarUrl?: string | null } | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [unit, setUnit] = useState<{ id: string; name: string; subtitle?: string | null; logoUrl?: string | null } | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [priorities, setPriorities] = useState<PriorityItem[]>([])
  const [floors, setFloors] = useState<FloorItem[]>([])
  const [rooms, setRooms] = useState<RoomItem[]>([])

  // Estado da seleção hierárquica (Andar -> Sala -> Serviço)
  const [selectedFloorId, setSelectedFloorId] = useState<string | 'ALL'>('ALL')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
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

  // 2. Carrega dados da unidade, serviços, prioridades, andares e salas
  useEffect(() => {
    getUnitData()
      .then((data: any) => {
        if (!data) return
        setUnit(data.unit)
        if (data.unit?.logoUrl) {
          setDocumentFavicon(data.unit.logoUrl)
        }
        setServices(data.services || [])
        setPriorities(data.priorities || [])
        if (data.floors) setFloors(data.floors)
        if (data.rooms) setRooms(data.rooms)
        if (data.priorities && data.priorities.length > 0) {
          setSelectedPriority(data.priorities[0])
        }
      })
      .catch((err) => console.error('Erro ao carregar dados da unidade:', err))
  }, [])

  const handleLogout = async () => {
    await logoutAction()
    router.push('/login')
  }

  // Identificação da sala e andar atualmente selecionados
  const hasRooms = rooms.length > 0
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null
  const selectedRoomFloor = selectedRoom ? floors.find((f) => f.id === selectedRoom.floorId) || null : null

  // Filtra as salas pelo andar selecionado na etapa 1
  const filteredRooms = rooms.filter((r) => {
    if (selectedFloorId === 'ALL') return true
    return r.floorId === selectedFloorId
  })

  // Filtra os serviços correspondentes à sala selecionada
  const eligibleServices = selectedRoomId
    ? (() => {
        if (selectedRoomId === 'GENERAL') {
          const generalOnly = services.filter((s) => !s.roomId)
          return generalOnly.length > 0 ? generalOnly : services
        }
        const linked = services.filter((s) => s.roomId === selectedRoomId)
        return linked.length > 0 ? linked : services
      })()
    : services

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
          roomName: selectedRoom ? selectedRoom.name : (service.roomName || null),
          floorName: selectedRoomFloor ? selectedRoomFloor.name : null,
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
        badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-bold',
        cardClass: 'card-boom-amber',
        accentGradient: 'from-amber-500 to-orange-500',
      }
    }
    if (n.includes('triagem') || n.includes('doc')) {
      return {
        icon: <FileText className="w-8 h-8 text-emerald-500" />,
        badgeClass: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 font-bold',
        cardClass: 'card-boom-emerald',
        accentGradient: 'from-emerald-500 to-teal-500',
      }
    }
    if (n.includes('priorit')) {
      return {
        icon: <Sparkles className="w-8 h-8 text-purple-500" />,
        badgeClass: 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 font-bold',
        cardClass: 'card-boom-purple',
        accentGradient: 'from-purple-500 to-indigo-500',
      }
    }
    return {
      icon: <Layers className="w-8 h-8 text-cyan-500" />,
      badgeClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-bold',
      cardClass: 'card-boom-cyan',
      accentGradient: 'from-cyan-500 to-blue-600',
    }
  }

  const getPriorityVisuals = (p: PriorityItem) => {
    const n = p.name.toLowerCase()
    if (n.includes('especial') || n.includes('pcd') || n.includes('80')) {
      return {
        tag: '80+ • PCD • Mobilidade Reduzida',
        activeClass: 'border-2 border-purple-500 bg-purple-50/90 dark:bg-purple-500/20 text-purple-950 dark:text-purple-200 shadow-md ring-2 ring-purple-500/30',
        inactiveClass: 'border border-slate-200 dark:border-purple-900/40 bg-white dark:bg-slate-900/40 hover:border-purple-400',
        dotClass: 'bg-purple-500',
        pillClass: 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 font-bold',
      }
    }
    if (n.includes('priorit') || n.includes('60')) {
      return {
        tag: '60+ • Gestantes • Lactantes',
        activeClass: 'border-2 border-amber-500 bg-amber-50/90 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 shadow-md ring-2 ring-amber-500/30',
        inactiveClass: 'border border-slate-200 dark:border-amber-900/40 bg-white dark:bg-slate-900/40 hover:border-amber-400',
        dotClass: 'bg-amber-500',
        pillClass: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 font-bold',
      }
    }
    return {
      tag: 'Ordem de Chegada',
      activeClass: 'border-2 border-cyan-500 bg-cyan-50/90 dark:bg-cyan-500/20 text-cyan-950 dark:text-cyan-200 shadow-md ring-2 ring-cyan-500/30',
      inactiveClass: 'border border-slate-200 dark:border-cyan-900/40 bg-white dark:bg-slate-900/40 hover:border-cyan-400',
      dotClass: 'bg-cyan-500',
      pillClass: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-bold',
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
            <UserNavbarBadge user={currentUser} showLogout={false} />
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
            className="h-11 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0 active:scale-95 cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-5xl w-full mx-auto my-6 space-y-6 flex-1 flex flex-col justify-center z-10">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 text-sm font-bold shadow-xs">
            {errorMsg}
          </div>
        )}

        {/* Indicador de Etapas quando a unidade possui salas configuradas */}
        {hasRooms && (
          <div className="flex items-center justify-center space-x-3 pb-2">
            <button
              type="button"
              onClick={() => setSelectedRoomId(null)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                !selectedRoomId
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 ring-2 ring-cyan-500/40'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-black">1</span>
              <span>1. Andar & Sala</span>
            </button>

            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />

            <div
              className={`flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                selectedRoomId
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 ring-2 ring-cyan-500/40'
                  : 'bg-slate-100/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800/40'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-black">2</span>
              <span>2. Serviços da Sala</span>
            </div>
          </div>
        )}

        {/* ========================================================
            ETAPA 1: SELEÇÃO DE ANDAR E SALA (quando há salas)
        ======================================================== */}
        {hasRooms && !selectedRoomId ? (
          <div className="space-y-5 animate-fade-in">
            {/* Filtro de Andares (quando houver andares cadastrados) */}
            {floors.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-cyan-500" />
                  <span>Filtre pelo Andar:</span>
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setSelectedFloorId('ALL')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                      selectedFloorId === 'ALL'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                        : 'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                    }`}
                  >
                    Todos os Andares ({rooms.length})
                  </button>
                  {floors.map((f) => {
                    const count = rooms.filter((r) => r.floorId === f.id).length
                    const isSel = selectedFloorId === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFloorId(f.id)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSel
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                            : 'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        <Building className="w-3.5 h-3.5" />
                        <span>{f.name}</span>
                        <span className="text-[10px] opacity-75">({count})</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Grade de Salas Disponíveis */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-cyan-500" />
                <span>Toque na Sala ou Consultório para selecionar:</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => {
                  const floor = floors.find((f) => f.id === room.floorId)
                  const linkedServices = services.filter((s) => s.roomId === room.id)
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className="group p-6 rounded-3xl card-boom text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-slate-300 dark:border-slate-800/80 hover:border-cyan-500/60 flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all shadow-xs">
                            <DoorOpen className="w-6 h-6" />
                          </div>
                          {floor && (
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 flex items-center gap-1 shadow-2xs">
                              <Building className="w-3 h-3" />
                              <span>{floor.name}</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                          {room.name}
                        </h3>
                        {room.number && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1 font-mono font-semibold">
                            Identificação: {room.number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-200 dark:border-slate-800/80">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {linkedServices.length > 0
                            ? `${linkedServices.length} serviço${linkedServices.length > 1 ? 's' : ''} nesta sala`
                            : 'Serviços gerais'}
                        </span>
                        <div className="text-cyan-600 dark:text-cyan-400 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Acessar</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </button>
                  )
                })}

                {/* Opção para Serviços Gerais da Unidade */}
                <button
                  type="button"
                  onClick={() => setSelectedRoomId('GENERAL')}
                  className="group p-6 rounded-3xl card-boom text-left hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500/60 flex flex-col justify-between min-h-[150px] shadow-sm hover:shadow-lg"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:scale-110 group-hover:bg-gradient-to-tr group-hover:from-cyan-500 group-hover:to-blue-600 group-hover:text-white transition-all shadow-xs mb-3">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                      Atendimento Geral
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1">
                      Serviços de recepção ou não vinculados a salas
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Balcão principal
                    </span>
                    <div className="text-cyan-600 dark:text-cyan-400 font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Acessar</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================
              ETAPA 2: SERVIÇOS DA SALA SELECIONADA + EMISSÃO
          ======================================================== */
          <div className="space-y-6 animate-fade-in">
            {/* Breadcrumb e Controle de Sala Selecionada */}
            {hasRooms && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 shadow-sm">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRoomId(null)}
                    className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                    title="Voltar à seleção de salas"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Trocar Sala</span>
                  </button>

                  <div className="text-left leading-tight">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Sala Selecionada:
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {selectedRoomFloor && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span>{selectedRoomFloor.name}</span>
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 flex items-center gap-1">
                        <DoorOpen className="w-3 h-3" />
                        <span>{selectedRoom ? selectedRoom.name : 'Atendimento Geral'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRoomId(null)}
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer self-end sm:self-auto"
                >
                  Ver todas as salas →
                </button>
              </div>
            )}

            {/* Campo Opcional de Identificação para Fala */}
            <div className="card-boom p-6">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>Nome do Cidadão / Paciente (Opcional - anunciado no painel por voz)</span>
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
                <span>{hasRooms ? '2.1' : '1'}. Selecione o Tipo de Atendimento:</span>
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
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-black uppercase tracking-wider shadow-xs badge-selected">
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
                <span>
                  {hasRooms ? '2.2' : '2'}. Toque no Serviço para Imprimir / Emitir a Senha:
                </span>
              </span>

              {eligibleServices.length === 0 ? (
                <div className="p-8 text-center rounded-3xl bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 space-y-3">
                  <Layers className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nenhum serviço disponível no momento para esta sala.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomId(null)}
                    className="px-4 py-2 rounded-2xl bg-cyan-500 text-slate-950 text-xs font-black cursor-pointer shadow-md"
                  >
                    Voltar e escolher outra sala
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {eligibleServices.map((s) => {
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
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs font-mono text-cyan-800 dark:text-cyan-400 font-black px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/20">
                                Prefixo: {s.prefix}
                              </span>
                              {s.attendantName && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 flex items-center gap-1 shadow-2xs">
                                  <User className="w-3 h-3" />
                                  <span>{s.attendantName}</span>
                                  {s.locationName && <span className="opacity-75">({s.locationName})</span>}
                                </span>
                              )}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                              {s.name}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                              Toque para emitir ficha
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
              )}
            </div>
          </div>
        )}
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

              {/* Informações da Fila, Serviço e Localização */}
              <div className="py-3 border-b border-dashed border-slate-300 text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">SERVIÇO:</span>
                  <span className="font-bold text-slate-900 text-right">{issuedTicket.serviceName}</span>
                </div>

                {/* Destino em Cascata no Cupom (Andar e Sala) */}
                {(issuedTicket.roomName || issuedTicket.floorName) && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">DESTINO:</span>
                    <span className="font-bold text-indigo-900 text-right">
                      {issuedTicket.floorName ? `${issuedTicket.floorName} • ` : ''}
                      {issuedTicket.roomName}
                    </span>
                  </div>
                )}

                {issuedTicket.customerName && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">CIDADÃO:</span>
                    <span className="font-bold text-slate-900 text-right">{issuedTicket.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">NA FILA:</span>
                  <span className="font-bold text-emerald-700">{issuedTicket.peopleAhead} pessoa(s) à frente</span>
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
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Imprimir Senha</span>
              </button>

              <button
                type="button"
                onClick={() => setIssuedTicket(null)}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
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
              {(issuedTicket.roomName || issuedTicket.floorName) && (
                <div>
                  <span className="font-bold">DESTINO: </span>
                  <span>
                    {issuedTicket.floorName ? `${issuedTicket.floorName} - ` : ''}
                    {issuedTicket.roomName}
                  </span>
                </div>
              )}
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
