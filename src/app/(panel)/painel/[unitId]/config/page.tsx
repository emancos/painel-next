'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Sun,
  Moon,
  Tv,
  LayoutGrid,
  Columns,
  SplitSquareVertical,
  Check,
  CheckCheck,
  Copy,
  SlidersHorizontal,
  Layers,
  Filter,
  Sparkles,
  Info,
} from 'lucide-react'

interface ServiceOption {
  id: string
  name: string
  prefix: string
}

interface PageProps {
  params: Promise<{ unitId: string }>
}

export default function PanelConfigPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const unitId = resolvedParams.unitId

  // Estado das configurações
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [layout, setLayout] = useState<'classic' | 'widescreen' | 'compact'>('classic')
  const [filterMode, setFilterMode] = useState<'ALL' | 'SPECIFIC'>('ALL')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  // Dados da unidade
  const [unitName, setUnitName] = useState('Unidade de Atendimento')
  const [unitSubtitle, setUnitSubtitle] = useState<string | null>(null)
  const [allServices, setAllServices] = useState<ServiceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Carrega configurações salvas no localStorage desta TV/máquina
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Tema (padrão: light)
    const storedTheme = localStorage.getItem(`panel_theme_${unitId}`)
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme)
    } else {
      setTheme('light') // Padrão claro exigido
    }

    // 2. Layout (padrão: classic)
    const storedLayout = localStorage.getItem(`panel_layout_${unitId}`)
    if (storedLayout === 'classic' || storedLayout === 'widescreen' || storedLayout === 'compact') {
      setLayout(storedLayout)
    } else {
      setLayout('classic')
    }

    // 3. Serviços / Setores
    try {
      const storedServices = localStorage.getItem(`panel_services_${unitId}`)
      if (storedServices) {
        const parsed = JSON.parse(storedServices)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFilterMode('SPECIFIC')
          setSelectedServiceIds(parsed)
        } else {
          setFilterMode('ALL')
          setSelectedServiceIds([])
        }
      }
    } catch (e) {}

    // 4. Carrega lista de serviços da unidade via API
    fetch(`/api/panel-init?unitId=${encodeURIComponent(unitId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        if (data.unit?.name) setUnitName(data.unit.name)
        if (data.unit?.subtitle) setUnitSubtitle(data.unit.subtitle)
        if (data.allServices && Array.isArray(data.allServices)) {
          setAllServices(data.allServices)
        }
      })
      .finally(() => setIsLoading(false))
  }, [unitId])

  // Alterna checkbox de serviço
  const handleToggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  // Gera o link completo parametrizado para TV Box / Smart TV Kiosk
  const getKioskUrl = () => {
    if (typeof window === 'undefined') return ''
    const url = new URL(`${window.location.origin}/painel/${unitId}`)
    url.searchParams.set('theme', theme)
    url.searchParams.set('layout', layout)
    if (filterMode === 'SPECIFIC' && selectedServiceIds.length > 0) {
      url.searchParams.set('services', selectedServiceIds.join(','))
    }
    return url.toString()
  }

  const handleCopyKioskUrl = () => {
    const url = getKioskUrl()
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2500)
    })
  }

  // Salva no localStorage e volta para a tela do painel
  const handleSaveAndReturn = () => {
    try {
      localStorage.setItem(`panel_theme_${unitId}`, theme)
      localStorage.setItem(`panel_layout_${unitId}`, layout)

      if (filterMode === 'SPECIFIC' && selectedServiceIds.length > 0) {
        localStorage.setItem(`panel_services_${unitId}`, JSON.stringify(selectedServiceIds))
      } else {
        localStorage.removeItem(`panel_services_${unitId}`)
      }
    } catch (e) {}

    setSavedSuccess(true)
    setTimeout(() => {
      router.push(`/painel/${unitId}`)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Header com Navegação */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 px-4 md:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/painel/${unitId}`}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/80 flex items-center space-x-2 text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Painel</span>
            </Link>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg md:text-xl font-black text-white tracking-wide">
                  Configurações Desta Tela
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {unitName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Personalize tema, layout e setor para este dispositivo físico (Smart TV ou monitor).
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveAndReturn}
            disabled={savedSuccess}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            {savedSuccess ? (
              <>
                <CheckCheck className="w-4 h-4 text-slate-950" />
                <span>Salvo! Redirecionando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Salvar e Ir ao Painel</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-8 flex-1">
        {/* SEÇÃO 1: TEMA DO PAINEL */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <Sun className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">1. Tema de Cores do Painel</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              O tema é específico desta tela de TV e não altera o sistema administrativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Tema Claro (Padrão) */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                theme === 'light'
                  ? 'bg-slate-800/80 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-base block">Tema Claro</span>
                    <span className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider">
                      (Padrão do Painel)
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    theme === 'light'
                      ? 'border-cyan-400 bg-cyan-500'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {theme === 'light' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                </div>
              </div>

              {/* Prévia do Tema Claro */}
              <div className="w-full h-24 rounded-xl bg-slate-100 border border-slate-300 p-2.5 flex space-x-2">
                <div className="flex-1 bg-white rounded-lg border border-slate-200 p-2 flex flex-col justify-between shadow-xs">
                  <div className="w-12 h-2 rounded-full bg-cyan-600" />
                  <div className="text-center font-mono font-black text-slate-900 text-lg leading-none">
                    A042
                  </div>
                  <div className="h-2 rounded bg-slate-200 w-full" />
                </div>
                <div className="w-16 bg-white/80 rounded-lg border border-slate-200 p-1.5 flex flex-col space-y-1">
                  <div className="h-1.5 rounded bg-slate-300 w-full" />
                  <div className="h-3 rounded bg-slate-100 w-full" />
                  <div className="h-3 rounded bg-slate-100 w-full" />
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Ideal para televisores em recepções e salas de espera com iluminação ambiente padrão.
              </p>
            </button>

            {/* Tema Escuro */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                theme === 'dark'
                  ? 'bg-slate-800/80 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-base block">Tema Escuro</span>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                      Noturno / Obsidian
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    theme === 'dark'
                      ? 'border-cyan-400 bg-cyan-500'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {theme === 'dark' && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                </div>
              </div>

              {/* Prévia do Tema Escuro */}
              <div className="w-full h-24 rounded-xl bg-[#090D16] border border-slate-800 p-2.5 flex space-x-2">
                <div className="flex-1 bg-slate-900/90 rounded-lg border border-cyan-500/30 p-2 flex flex-col justify-between">
                  <div className="w-12 h-2 rounded-full bg-cyan-400" />
                  <div className="text-center font-mono font-black text-white text-lg leading-none">
                    A042
                  </div>
                  <div className="h-2 rounded bg-slate-800 w-full" />
                </div>
                <div className="w-16 bg-slate-900/60 rounded-lg border border-slate-800 p-1.5 flex flex-col space-y-1">
                  <div className="h-1.5 rounded bg-slate-700 w-full" />
                  <div className="h-3 rounded bg-slate-800 w-full" />
                  <div className="h-3 rounded bg-slate-800 w-full" />
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Visual moderno de alto contraste em preto ônix e ciano, ideal para ambientes de meia luz.
              </p>
            </button>
          </div>
        </section>

        {/* SEÇÃO 2: 3 LAYOUTS DO PAINEL COM PRÉVIA VISUAL TIPO RADIO BUTTON */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <Tv className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">2. Layout de Exibição da Tela</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Escolha entre 3 modelos de disposição visual para melhor se adequar ao formato e distância da TV.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            {/* Modelo 1: Destaque Lateral (Clássico) */}
            <button
              type="button"
              onClick={() => setLayout('classic')}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between relative group ${
                layout === 'classic'
                  ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              {/* Radio Indicator & Header */}
              <div className="flex items-start justify-between mb-3 w-full">
                <div className="flex items-center space-x-2">
                  <Columns className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">Destaque Lateral</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    layout === 'classic'
                      ? 'border-cyan-400 bg-cyan-500'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {layout === 'classic' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
              </div>

              {/* Mockup Esquemático TV - Layout 1 */}
              <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex flex-col justify-between mb-4 shadow-inner">
                {/* Mini Topbar */}
                <div className="h-2 rounded bg-slate-800 w-full flex items-center justify-between px-1">
                  <div className="w-8 h-1 rounded-full bg-cyan-500/80" />
                  <div className="w-6 h-1 rounded-full bg-slate-700" />
                </div>

                {/* Corpo do Layout 1: Caixa Principal à Esquerda + Coluna Vertical à Direita */}
                <div className="flex-1 flex space-x-2 my-1.5">
                  {/* Senha Grande Esquerda */}
                  <div className="flex-[2] rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-2 flex flex-col justify-between">
                    <div className="w-8 h-1 rounded bg-cyan-400" />
                    <div className="text-center font-mono font-black text-cyan-300 text-xs">
                      A001
                    </div>
                    <div className="h-1.5 rounded bg-slate-800 w-full" />
                  </div>

                  {/* Histórico Lateral Vertical */}
                  <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/70 p-1 flex flex-col space-y-1 justify-center">
                    <div className="h-1.5 rounded bg-slate-700 w-full" />
                    <div className="h-2 rounded bg-slate-800 w-full" />
                    <div className="h-2 rounded bg-slate-800 w-full" />
                    <div className="h-2 rounded bg-slate-800 w-full" />
                  </div>
                </div>

                {/* Mini Rodapé */}
                <div className="h-1 rounded bg-slate-800/80 w-2/3" />
              </div>

              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-1">
                  Padrão Hospitalar
                </span>
                <p className="text-xs text-slate-400">
                  Senha atual em destaque na esquerda e coluna vertical com histórico das últimas chamadas na lateral.
                </p>
              </div>
            </button>

            {/* Modelo 2: Widescreen / Grade Inferior (Horizontal) */}
            <button
              type="button"
              onClick={() => setLayout('widescreen')}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between relative group ${
                layout === 'widescreen'
                  ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              {/* Radio Indicator & Header */}
              <div className="flex items-start justify-between mb-3 w-full">
                <div className="flex items-center space-x-2">
                  <LayoutGrid className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">Widescreen Horizontal</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    layout === 'widescreen'
                      ? 'border-cyan-400 bg-cyan-500'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {layout === 'widescreen' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
              </div>

              {/* Mockup Esquemático TV - Layout 2 */}
              <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex flex-col justify-between mb-4 shadow-inner">
                {/* Mini Topbar */}
                <div className="h-2 rounded bg-slate-800 w-full flex items-center justify-between px-1">
                  <div className="w-8 h-1 rounded-full bg-cyan-500/80" />
                  <div className="w-6 h-1 rounded-full bg-slate-700" />
                </div>

                {/* Corpo do Layout 2: Senha Grande Centralizada no Topo */}
                <div className="h-12 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-1.5 flex flex-col justify-between my-1">
                  <div className="flex justify-between items-center">
                    <div className="w-8 h-1 rounded bg-cyan-400" />
                    <div className="w-10 h-1 rounded bg-slate-800" />
                  </div>
                  <div className="text-center font-mono font-black text-cyan-300 text-sm leading-none">
                    A001
                  </div>
                  <div className="h-1.5 rounded bg-slate-800 w-1/3 mx-auto" />
                </div>

                {/* Grade Horizontal de Histórico na Base */}
                <div className="grid grid-cols-4 gap-1">
                  <div className="h-5 rounded bg-slate-900 border border-slate-800 p-0.5 flex flex-col justify-center items-center">
                    <div className="text-[8px] font-mono font-bold text-slate-300">P01</div>
                  </div>
                  <div className="h-5 rounded bg-slate-900 border border-slate-800 p-0.5 flex flex-col justify-center items-center">
                    <div className="text-[8px] font-mono font-bold text-slate-300">CX02</div>
                  </div>
                  <div className="h-5 rounded bg-slate-900 border border-slate-800 p-0.5 flex flex-col justify-center items-center">
                    <div className="text-[8px] font-mono font-bold text-slate-300">A009</div>
                  </div>
                  <div className="h-5 rounded bg-slate-900 border border-slate-800 p-0.5 flex flex-col justify-center items-center">
                    <div className="text-[8px] font-mono font-bold text-slate-300">A008</div>
                  </div>
                </div>
              </div>

              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                  Ideal para TVs 16:9 / 4K
                </span>
                <p className="text-xs text-slate-400">
                  Senha atual em destaque centralizado no topo com grade horizontal de últimas chamadas na base.
                </p>
              </div>
            </button>

            {/* Modelo 3: Foco Dividido / Chamada Dupla */}
            <button
              type="button"
              onClick={() => setLayout('compact')}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between relative group ${
                layout === 'compact'
                  ? 'bg-slate-800/90 border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              {/* Radio Indicator & Header */}
              <div className="flex items-start justify-between mb-3 w-full">
                <div className="flex items-center space-x-2">
                  <SplitSquareVertical className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-sm">Foco Dividido</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    layout === 'compact'
                      ? 'border-cyan-400 bg-cyan-500'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {layout === 'compact' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>
              </div>

              {/* Mockup Esquemático TV - Layout 3 */}
              <div className="w-full aspect-video rounded-xl bg-slate-950 border border-slate-800 p-2.5 flex flex-col justify-between mb-4 shadow-inner">
                {/* Mini Topbar */}
                <div className="h-2 rounded bg-slate-800 w-full flex items-center justify-between px-1">
                  <div className="w-8 h-1 rounded-full bg-cyan-500/80" />
                  <div className="w-6 h-1 rounded-full bg-slate-700" />
                </div>

                {/* Corpo do Layout 3: Foco Atual (Esquerda) + Última Chamada em Destaque Médio (Direita) */}
                <div className="flex-1 flex space-x-2 my-1.5">
                  <div className="flex-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-2 flex flex-col justify-between">
                    <div className="w-10 h-1 rounded bg-cyan-400" />
                    <div className="text-center font-mono font-black text-cyan-300 text-xs">
                      A001
                    </div>
                    <div className="h-1.5 rounded bg-slate-800 w-full" />
                  </div>

                  <div className="flex-1 flex flex-col space-y-1">
                    {/* Card Destacado da Chamada Anterior */}
                    <div className="h-10 rounded-lg border border-cyan-500/30 bg-slate-900 p-1 flex flex-col justify-between">
                      <div className="w-12 h-1 rounded bg-slate-600" />
                      <div className="text-center font-mono font-bold text-white text-[10px]">
                        P001
                      </div>
                      <div className="h-1 rounded bg-slate-800 w-full" />
                    </div>
                    {/* Cards Menores */}
                    <div className="flex space-x-1">
                      <div className="h-4 rounded bg-slate-900/60 border border-slate-800 flex-1" />
                      <div className="h-4 rounded bg-slate-900/60 border border-slate-800 flex-1" />
                    </div>
                  </div>
                </div>

                {/* Mini Rodapé */}
                <div className="h-1 rounded bg-slate-800/80 w-2/3" />
              </div>

              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1">
                  Alta Rotatividade
                </span>
                <p className="text-xs text-slate-400">
                  Dá foco à senha atual e à chamada imediatamente anterior, permitindo que pacientes que se distraíram confiram com facilidade.
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* SEÇÃO 3: SERVIÇOS / SETORES DESTA TELA */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">3. Serviços Chamados Nesta Tela (Setor)</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Especifique se esta TV chamará senhas de todos os serviços ou apenas de um setor específico.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  filterMode === 'ALL'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-sm">Todos os Serviços da Unidade</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Chama senhas de qualquer guichê ou setor da unidade.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('SPECIFIC')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  filterMode === 'SPECIFIC'
                    ? 'bg-cyan-500/15 border-cyan-500 text-white'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-sm">Serviços Específicos do Setor</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Chama apenas serviços selecionados (Ex: Triagem, Laboratório, Consultório).
                </div>
              </button>
            </div>

            {filterMode === 'SPECIFIC' && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Selecione os serviços que esta tela irá chamar:
                  </span>
                  <div className="flex space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedServiceIds(allServices.map((s) => s.id))}
                      className="text-cyan-400 hover:underline"
                    >
                      Marcar todos
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedServiceIds([])}
                      className="text-slate-400 hover:underline"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                {allServices.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Carregando serviços da unidade...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {allServices.map((svc) => {
                      const isChecked = selectedServiceIds.includes(svc.id)
                      return (
                        <label
                          key={svc.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleService(svc.id)}
                              className="w-4 h-4 rounded text-cyan-500 bg-slate-950 border-slate-700 focus:ring-cyan-400"
                            />
                            <span className="text-xs font-medium">{svc.name}</span>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-300">
                            {svc.prefix}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SEÇÃO 4: LINK KIOSK / SMART TV */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <Tv className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">4. Link Direto para Smart TV / Kiosk Box</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Ao clicar em "Salvar e Ir ao Painel", as configurações acima são salvas neste navegador. Para configurar novas TVs sem precisar clicar, use este link:
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={getKioskUrl()}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-300 font-mono focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyKioskUrl}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              {copiedUrl ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
          </div>
        </section>
      </main>

      {/* Footer com botão Salvar */}
      <footer className="border-t border-slate-800 bg-slate-900/90 py-4 px-4 md:px-8 mt-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href={`/painel/${unitId}`}
            className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar e Voltar
          </Link>

          <button
            onClick={handleSaveAndReturn}
            disabled={savedSuccess}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-md active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Configurações e Abrir Painel</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
