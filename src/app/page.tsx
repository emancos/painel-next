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
} from 'lucide-react'
import { getUnitData } from '@/actions/tickets'

export default function HomePage() {
  const [unitId, setUnitId] = useState<string>('baa07eef-927f-4e15-9e0f-626885b6b1c8')
  const [unitName, setUnitName] = useState<string>('Unidade de Atendimento')
  const [unitSubtitle, setUnitSubtitle] = useState<string | null>(null)
  const [unitLogoUrl, setUnitLogoUrl] = useState<string | null>(null)
  const [waitingCount, setWaitingCount] = useState<number>(0)

  useEffect(() => {
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
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      {/* Navbar Superior com Logo, Nome e Subtítulo da Unidade */}
      <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          {unitLogoUrl ? (
            <img
              src={unitLogoUrl}
              alt="Brasão da Unidade"
              className="w-12 h-12 object-contain rounded-2xl bg-white/10 p-1.5 border border-slate-700/80 shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/20">
              {unitName ? unitName.charAt(0) : 'U'}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {unitName}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold uppercase tracking-wider">
                Unidade Ativa
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {unitSubtitle || 'Painel de Chamados Inteligente • Atendimento e Triagem'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/login"
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition-all"
          >
            <LogInIcon className="w-4 h-4 text-cyan-400" />
            <span>Login</span>
          </Link>

          <Link
            href={`/painel/${unitId}`}
            target="_blank"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)]"
          >
            <Tv className="w-4 h-4" />
            <span>Painel TV Fullscreen</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Banner de Destaque */}
        <div className="rounded-3xl p-8 bg-gradient-to-r from-slate-900/90 via-[#0D1829] to-slate-900/90 border border-cyan-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-4 relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Painel de Atendimento Unificado em Tempo Real</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Sistema Operacional de Atendimento e Chamadas
            </h2>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Gestão ágil de filas, autoatendimento no totem de triagem, postos de trabalho e exibição audiovisual em tempo real na TV da sala de espera.
            </p>
          </div>
        </div>

        {/* 3 Módulos Principais do Sistema */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Módulos Operacionais ({unitName}):
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Totem de Autoatendimento / Emissão */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between space-y-6 group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Ticket className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Triagem - Emissão de Fichas</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interface de autoatendimento onde o cidadão escolhe o serviço e prioridade (Normal, 60+, 80+/PCD) para emitir sua senha.
                </p>
              </div>

              <Link
                href="/triagem"
                className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-500/20"
              >
                <span>Acessar Emissão de Senhas</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 2: Painel do Atendente / Guichê */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-6 group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Headphones className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl font-bold text-white">Módulo Atendente</h4>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                    {waitingCount} na fila
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Posto de trabalho do atendente. Seleciona o Guichê ou Mesa, visualiza a fila em espera ordenada por prioridade e chama a próxima senha.
                </p>
              </div>

              <Link
                href="/atendimento"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-500/20"
              >
                <span>Acessar Módulo Guichê</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 3: Painel TV da Sala de Espera */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-6 group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Tv className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Painel TV Sala de Espera</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tela grande exibida nas TVs dos clientes. Toca o chime harmônico, sintetiza a chamada por voz neural configurada e exibe o histórico.
                </p>
              </div>

              <Link
                href={`/painel/${unitId}`}
                target="_blank"
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center space-x-2 border border-slate-700 transition-all"
              >
                <Tv className="w-4 h-4 text-cyan-400" />
                <span>Abrir Painel TV Fullscreen</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card Operacional Conectado em Tempo Real (Limpo e Sem Informações Técnicas ou de Admin) */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block">Sistema Operacional e Conectado em Tempo Real</span>
              <span className="text-slate-400">
                Serviços de atendimento, chamadas e sincronização de painéis em pleno funcionamento via rede local.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-950/40 px-3.5 py-2 rounded-full border border-emerald-500/30 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-400 text-xs">Status: Operação Normal</span>
          </div>
        </div>
      </main>
    </div>
  )
}
