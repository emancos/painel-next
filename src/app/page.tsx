'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Tv, 
  CheckCircle2, 
  ShieldCheck, 
  Ticket, 
  Headphones, 
  ArrowRight,
  LogInIcon,
  Sparkles,
  Volume2,
  Layers,
  Activity,
  Radio
} from 'lucide-react'
import { getUnitData } from '@/actions/tickets'
import { getSessionAction, logoutAction } from '@/actions/auth'
import { AdminThemeToggle } from '@/components/theme/AdminThemeToggle'
import { UserNavbarBadge } from '@/components/UserNavbarBadge'

export default function HomePage() {
  const [unitId, setUnitId] = useState<string>('baa07eef-927f-4e15-9e0f-626885b6b1c8')
  const [unitName, setUnitName] = useState<string>('Unidade de Atendimento')
  const [unitSubtitle, setUnitSubtitle] = useState<string | null>(null)
  const [unitLogoUrl, setUnitLogoUrl] = useState<string | null>(null)
  const [waitingCount, setWaitingCount] = useState<number>(0)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; avatarUrl?: string | null } | null>(null)

  useEffect(() => {
    getSessionAction().then((u) => {
      if (u) setCurrentUser(u)
    })
    getUnitData().then((data) => {
      if (data && data.unit) {
        setUnitId(data.unit.id)
        setUnitName(data.unit.name)
        setUnitSubtitle(data.unit.subtitle || null)
        setUnitLogoUrl(data.unit.logoUrl || null)
        setWaitingCount(data.waitingCount)
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col admin-page-container transition-colors duration-200 relative overflow-hidden">
      {/* Luzes de Fundo Ambientais (Mesh Lighting) */}
      <div className="mesh-orb-cyan -top-24 -left-24 w-96 h-96 opacity-60 dark:opacity-40" />
      <div className="mesh-orb-indigo top-1/3 -right-28 w-[450px] h-[450px] opacity-50 dark:opacity-30" />
      <div className="mesh-orb-emerald -bottom-24 left-1/3 w-[500px] h-[500px] opacity-40 dark:opacity-20" />

      {/* Navbar Superior com Logo, Nome e Subtítulo da Unidade */}
      <header data-navbar="root" className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-20">
        <div className="flex items-center space-x-3.5">
          {unitLogoUrl ? (
            <img
              src={unitLogoUrl}
              alt="Brasão da Unidade"
              className="w-12 h-12 object-contain rounded-2xl bg-white/10 dark:bg-white/10 p-1.5 border border-slate-700/80 shadow-md transition-transform hover:scale-105"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/30">
              {unitName ? unitName.charAt(0) : 'U'}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                {unitName}
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-wider shadow-xs">
                Unidade Ativa
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {unitSubtitle || 'Painel de Chamados Inteligente • Atendimento e Triagem'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <AdminThemeToggle />
          {currentUser ? (
            <UserNavbarBadge
              user={currentUser}
              onLogout={async () => {
                await logoutAction()
                setCurrentUser(null)
              }}
            />
          ) : (
            <Link
              href="/login"
              className="h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-700/80 text-xs font-bold transition-all flex items-center space-x-2 shrink-0 shadow-xs active:scale-95"
            >
              <LogInIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Login Operador</span>
            </Link>
          )}

          <Link
            href={`/painel/${unitId}`}
            target="_blank"
            className="h-11 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs transition-all shadow-[0_4px_20px_rgba(6,182,212,0.35)] hover:shadow-[0_6px_25px_rgba(6,182,212,0.45)] flex items-center space-x-2 shrink-0 active:scale-95"
          >
            <Tv className="w-4 h-4" />
            <span>Painel TV Fullscreen</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        {/* Banner de Destaque com "Boom Visual" */}
        <div className="hero-banner-boom rounded-3xl p-8 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-5 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Painel de Atendimento Unificado em Tempo Real</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Sistema Operacional de{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-sky-500 to-emerald-500 dark:from-cyan-400 dark:via-sky-300 dark:to-emerald-400">
                Atendimento & Chamadas
              </span>
            </h2>

            <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
              Gestão ágil de filas, autoatendimento no totem de triagem com impressão térmica, postos de trabalho dedicados e transmissão audiovisual em alta definição na TV da sala de espera.
            </p>

            {/* Chips de Destaque Tecnológico */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                <Radio className="w-3.5 h-3.5 text-cyan-500" />
                <span>Sincronização SSE Local</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Voz Neural Edge-TTS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
                <Ticket className="w-3.5 h-3.5 text-purple-500" />
                <span>Impressão Térmica ESC/POS</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3 Módulos Principais do Sistema */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>Módulos Operacionais ({unitName}):</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Selecione uma estação</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Totem de Autoatendimento / Emissão */}
            <div className="card-boom card-boom-cyan p-7 flex flex-col justify-between space-y-6 group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-110 group-hover:rotate-2 transition-all">
                    <Ticket className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    Autoatendimento
                  </span>
                </div>

                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                  Triagem - Emissão de Fichas
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Interface touchscreen para o cidadão escolher o serviço e prioridade (Normal, 60+, 80+/PCD) e retirar sua senha impressa.
                </p>

                {/* Tags de Recursos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                    3 Níveis de Prioridade
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                    Impressão Direta
                  </span>
                </div>
              </div>

              <Link
                href="/triagem"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98]"
              >
                <span>Acessar Emissão de Senhas</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Card 2: Painel do Atendente / Guichê */}
            <div className="card-boom card-boom-emerald p-7 flex flex-col justify-between space-y-6 group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-2 transition-all">
                    <Headphones className="w-7 h-7" />
                  </div>
                  <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 font-extrabold text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-mono">{waitingCount}</span>
                    <span>na fila</span>
                  </div>
                </div>

                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                  Módulo Atendente
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Posto de trabalho do operador. Seleção de Guichê ou Mesa, visualização da fila prioritária em tempo real e controle de chamadas.
                </p>

                {/* Tags de Recursos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                    Rechamar & Pausar
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                    Redirecionamento
                  </span>
                </div>
              </div>

              <Link
                href="/atendimento"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
              >
                <span>Acessar Módulo Guichê</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Card 3: Painel TV da Sala de Espera */}
            <div className="card-boom card-boom-indigo p-7 flex flex-col justify-between space-y-6 group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-2 transition-all">
                    <Tv className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                    Audiovisual
                  </span>
                </div>

                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  Painel TV Sala de Espera
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  Exibição em tela cheia na TV dos clientes com toque de chime harmônico, chamada com voz neural sintética e histórico visual.
                </p>

                {/* Tags de Recursos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                    3 Layouts Dinâmicos
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                    Foco Dividido & Widescreen
                  </span>
                </div>
              </div>

              <Link
                href={`/painel/${unitId}`}
                target="_blank"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
              >
                <Tv className="w-4 h-4 text-cyan-300" />
                <span>Abrir Painel TV Fullscreen</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card Operacional Conectado em Tempo Real */}
        <div className="card-boom p-6 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4 border border-emerald-500/30 shadow-md">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                Sistema Operacional e Conectado em Tempo Real
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                Serviços de atendimento, chamadas simultâneas e sincronização de painéis em pleno funcionamento.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-500/15 px-4 py-2 rounded-full border border-emerald-500/30 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-xs">
              Status: Operação Normal
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
