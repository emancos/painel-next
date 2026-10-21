'use client'

import { useEffect, useState, useTransition } from 'react'
import { getUnitData, issueTicket } from '@/actions/tickets'
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
  FileText
} from 'lucide-react'
import Link from 'next/link'

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
  const [unit, setUnit] = useState<{ id: string; name: string; subtitle?: string | null; logoUrl?: string | null } | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [priorities, setPriorities] = useState<PriorityItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<PriorityItem | null>(null)
  const [issuedTicket, setIssuedTicket] = useState<IssuedTicketModalData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('caixa') || n.includes('pagamento')) return <CreditCard className="w-8 h-8 text-amber-400" />
    if (n.includes('triagem') || n.includes('doc')) return <FileText className="w-8 h-8 text-emerald-400" />
    return <Layers className="w-8 h-8 text-cyan-400" />
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between p-6 md:p-10">
      {/* Topo do Totem com Identidade Institucional da Unidade */}
      <header className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Voltar ao Início"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {unit?.logoUrl ? (
            <img
              src={unit.logoUrl}
              alt="Logo"
              className="w-12 h-12 object-contain rounded-2xl bg-white/10 p-1.5 border border-slate-700 shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
              {unit?.name?.charAt(0) || 'U'}
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {unit?.name || 'Unidade de Atendimento'}
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold uppercase">
                Totem de Emissão
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {unit?.subtitle || 'Toque no serviço desejado para emitir sua senha'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold text-slate-400 bg-slate-900/60 px-4 py-2 rounded-xl border border-slate-800">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Voz Neural & Alta Disponibilidade</span>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-5xl w-full mx-auto my-8 space-y-8 flex-1 flex flex-col justify-center">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Campo Opcional de Identificação para Fala */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Nome do Cidadão / Paciente (Opcional - para ser anunciado no painel)</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Digite seu nome (Ex: João da Silva)..."
            className="w-full px-5 py-4 rounded-2xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-600 font-medium text-lg focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Seleção de Prioridade (Abas) */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Selecione o Tipo de Atendimento:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {priorities.map((p) => {
              const isSelected = selectedPriority?.id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className={`p-4 rounded-2xl border text-left transition-all ${isSelected
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: p.colorHex }}
                    />
                    <span className="font-bold text-white text-sm">{p.name}</span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            2. Toque no Serviço para Imprimir / Emitir a Senha:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={isPending || !selectedPriority}
                onClick={() => handleIssue(s, selectedPriority!)}
                className="group p-6 rounded-3xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/60 transition-all shadow-xl hover:shadow-cyan-500/10 flex items-center justify-between text-left active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                    {getServiceIcon(s.name)}
                  </div>
                  <div>
                    <span className="text-xs font-mono text-cyan-400 font-bold block mb-0.5">
                      Prefixo: {s.prefix}
                    </span>
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {s.name}
                    </h3>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  <Printer className="w-6 h-6" />
                </div>
              </button>
            ))}
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
