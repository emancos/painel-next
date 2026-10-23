'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { History, MapPin, Sparkles } from 'lucide-react'

export interface HistoryTicketItem {
  id: string
  formattedTicket: string
  serviceName: string
  priorityName: string
  priorityColor?: string
  locationFormatted: string
  locationPlace?: string
  locationShort?: string
  floorName?: string | null
  roomName?: string | null
  calledAt?: Date | string | null
}

interface TicketHistoryProps {
  history: HistoryTicketItem[]
  theme?: 'light' | 'dark'
  variant?: 'classic' | 'widescreen' | 'compact'
}

/**
 * Extrai o posto (Mesa/Guichê) para ficar à frente da senha
 * e a localização em cascata (Andar e Sala) para ficar abaixo do serviço.
 */
function parseLocation(item: HistoryTicketItem): { place: string; cascade: string } {
  const parts = (item.locationFormatted || '')
    .split('•')
    .map((s) => s.trim())
    .filter(Boolean)

  const place = item.locationPlace || (parts.length > 0 ? parts[parts.length - 1] : item.locationFormatted)

  let cascade = ''
  if (item.floorName || item.roomName) {
    cascade = [item.floorName, item.roomName].filter(Boolean).join(' • ')
  } else if (parts.length > 1) {
    cascade = parts.slice(0, -1).join(' • ')
  }

  return { place, cascade }
}

function getPriorityTheme(priorityName: string) {
  const p = (priorityName || '').toLowerCase()
  if (p.includes('especial') || p.includes('pcd') || p.includes('80') || p.includes('autista')) {
    return {
      border: 'border-l-purple-500',
      badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-500/40',
      glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
      color: '#8b5cf6',
    }
  }
  if (p.includes('priorit') || p.includes('pref') || p.includes('60') || p.includes('gestan')) {
    return {
      border: 'border-l-amber-500',
      badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-500/40',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      color: '#f59e0b',
    }
  }
  return {
    border: 'border-l-cyan-500',
    badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-500/40',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    color: '#06b6d4',
  }
}

export function TicketHistory({
  history,
  theme = 'light',
  variant = 'classic',
}: TicketHistoryProps) {
  const isLight = theme === 'light'
  const isWidescreen = variant === 'widescreen'
  const isCompact = variant === 'compact'

  if (isWidescreen) {
    return (
      <div
        className={`w-full flex flex-col rounded-3xl p-5 border transition-all duration-300 ${
          isLight
            ? 'bg-white/95 border-2 border-slate-200/90 shadow-md text-slate-800'
            : 'bg-[#0c1322]/90 border border-slate-800 text-slate-200 backdrop-blur-xl'
        }`}
      >
        <div
          className={`flex items-center space-x-2 pb-3 mb-3 border-b ${
            isLight ? 'border-slate-200/80 text-slate-800' : 'border-slate-800 text-slate-200'
          }`}
        >
          <div className={`p-1.5 rounded-lg ${isLight ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'}`}>
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            Últimas Senhas Chamadas
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <AnimatePresence initial={false}>
            {history.length === 0 ? (
              <div
                className={`col-span-full py-8 text-center text-xs font-semibold ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Nenhum chamado anterior registrado nesta sessão
              </div>
            ) : (
              history.map((item, index) => {
                const pTheme = getPriorityTheme(item.priorityName)
                const { place, cascade } = parseLocation(item)
                return (
                  <motion.div
                    key={item.formattedTicket || item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1 - index * 0.08, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className={`p-3.5 rounded-2xl border border-l-4 ${pTheme.border} flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 ${
                      isLight
                        ? 'bg-slate-50/90 border-slate-200/80 hover:bg-white hover:shadow-md'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`font-mono font-black text-2xl tracking-tight leading-none ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {item.formattedTicket}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                            isLight
                              ? 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                              : 'bg-slate-800 border-slate-700 text-slate-100'
                          }`}
                        >
                          {place}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shadow-xs ring-2 ring-white/20 shrink-0"
                          style={{ backgroundColor: item.priorityColor || pTheme.color }}
                          title={item.priorityName}
                        />
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold block truncate ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {item.serviceName}
                    </span>

                    {cascade && (
                      <span
                        className={`text-[11px] font-bold block truncate mt-1 ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}
                      >
                        {cascade}
                      </span>
                    )}
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  if (isCompact) {
    const previousTicket = history[0]
    const olderHistory = history.slice(1, 8)

    return (
      <div className="w-full h-full flex flex-col gap-5 justify-between">
        {/* CARD SUPERIOR: Chamada Anterior (Destaque Médio) */}
        <div
          className={`flex-1 min-h-[260px] rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
            isLight
              ? 'bg-white/95 border-2 border-slate-200/90 shadow-md text-slate-800'
              : 'bg-[#0c1322]/90 border border-slate-800 text-slate-100 backdrop-blur-xl shadow-xl'
          }`}
        >
          {/* Header da Chamada Anterior */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80 z-10">
            <div className="flex items-center space-x-2">
              <span
                className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  isLight
                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                Chamada Anterior
              </span>
            </div>

            {previousTicket && (
              <div className="flex items-center space-x-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-xs"
                  style={{ backgroundColor: previousTicket.priorityColor || '#06B6D4' }}
                >
                  {previousTicket.priorityName}
                </span>
                <span
                  className={`hidden sm:inline px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    isLight
                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {previousTicket.serviceName}
                </span>
              </div>
            )}
          </div>

          {/* Miolo com a Senha Anterior em destaque */}
          {previousTicket ? (
            <div className="my-auto py-4 text-center z-10">
              <span
                className={`text-xs font-bold tracking-widest uppercase block mb-1 ${
                  isLight ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                Senha
              </span>
              <div
                className={`font-mono font-black tracking-tight leading-none text-6xl sm:text-7xl xl:text-8xl ${
                  isLight
                    ? 'text-slate-900 drop-shadow-xs'
                    : 'text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]'
                }`}
              >
                <span className={isLight ? 'text-cyan-600' : 'text-cyan-400'}>
                  {previousTicket.formattedTicket.slice(0, 1)}
                </span>
                <span>{previousTicket.formattedTicket.slice(1)}</span>
              </div>
              <span
                className={`sm:hidden text-xs font-bold mt-2 block truncate ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {previousTicket.serviceName}
              </span>
            </div>
          ) : (
            <div className="my-auto py-8 text-center z-10">
              <span className={`text-sm font-semibold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                Nenhuma chamada anterior registrada
              </span>
            </div>
          )}

          {/* Rodapé: Local do chamado anterior */}
          {previousTicket ? (
            (() => {
              const { place: prevPlace, cascade: prevCascade } = parseLocation(previousTicket)
              return (
                <div
                  className={`rounded-2xl p-4 border flex items-center justify-between z-10 ${
                    isLight
                      ? 'bg-slate-50 border-slate-200/90 text-slate-900 shadow-xs'
                      : 'bg-slate-900/90 border-slate-700/80 text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider block ${
                          isLight ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        Local
                      </span>
                      <span className="text-base font-black">
                        {prevCascade || previousTicket.locationFormatted}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-2xl font-mono font-black ${
                      isLight ? 'text-cyan-600' : 'text-cyan-400'
                    }`}
                  >
                    {prevPlace}
                  </span>
                </div>
              )
            })()
          ) : (
            <div className="h-6" />
          )}
        </div>

        {/* CARD INFERIOR: Histórico Recente */}
        <div
          className={`rounded-3xl p-5 border transition-all duration-300 ${
            isLight
              ? 'bg-white/95 border-2 border-slate-200/90 shadow-md text-slate-800'
              : 'bg-[#0c1322]/90 border border-slate-800 text-slate-200 backdrop-blur-xl'
          }`}
        >
          <div
            className={`flex items-center space-x-2 pb-3 mb-3 border-b ${
              isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-200'
            }`}
          >
            <History className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <h4 className="text-xs font-black uppercase tracking-wider">
              Outras Chamadas Recentes
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {olderHistory.length === 0 ? (
              <div
                className={`col-span-full py-4 text-center text-xs font-semibold ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Aguardando chamadas adicionais no histórico
              </div>
            ) : (
              olderHistory.map((item) => {
                const pTheme = getPriorityTheme(item.priorityName)
                const { place, cascade } = parseLocation(item)
                return (
                  <div
                    key={item.formattedTicket || item.id}
                    className={`p-3 rounded-2xl border border-l-4 ${pTheme.border} flex flex-col justify-between transition-colors ${
                      isLight
                        ? 'bg-slate-50/90 border-slate-200/80 hover:bg-white'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span
                          className={`font-mono font-black text-lg leading-tight ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {item.formattedTicket}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.priorityColor || pTheme.color }}
                          title={item.priorityName}
                        />
                      </div>

                      <span
                        className={`text-right text-[11px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                            : 'bg-slate-800 border-slate-700/60 text-slate-200'
                        }`}
                      >
                        {place}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold block truncate ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {item.serviceName}
                    </span>

                    {cascade && (
                      <span
                        className={`text-[9px] font-bold block truncate mt-0.5 ${
                          isLight ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {cascade}
                      </span>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    )
  }

  // Layout Classic (coluna lateral)
  return (
    <div
      className={`w-full lg:w-80 xl:w-96 flex flex-col rounded-3xl p-5 sm:p-6 border transition-all duration-300 ${
        isLight
          ? 'bg-white/95 border-2 border-slate-200/90 shadow-md text-slate-800'
          : 'bg-[#0c1322]/90 border border-slate-800 text-slate-200 backdrop-blur-xl'
      }`}
    >
      <div
        className={`flex items-center justify-between pb-3.5 mb-3.5 border-b ${
          isLight ? 'border-slate-200/80 text-slate-800' : 'border-slate-800 text-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-xl ${isLight ? 'bg-cyan-50 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'}`}>
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black uppercase tracking-wider">
            Últimas Chamadas
          </h3>
        </div>

        {history.length > 0 && (
          <span
            className={`text-xs font-black px-2 py-0.5 rounded-full ${
              isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {history.length}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto pr-0.5">
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <div
              className={`flex-1 flex flex-col items-center justify-center text-center p-6 ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <span className="text-sm font-semibold">Nenhum chamado anterior registrado</span>
            </div>
          ) : (
            history.map((item, index) => {
              const pTheme = getPriorityTheme(item.priorityName)
              const { place, cascade } = parseLocation(item)
              return (
                <motion.div
                  key={item.formattedTicket || item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1 - index * 0.06, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-2xl border border-l-4 ${pTheme.border} p-3 transition-all duration-200 hover:-translate-x-1 flex flex-col justify-between ${
                    isLight
                      ? 'bg-slate-50/90 border-slate-200/80 hover:bg-white hover:shadow-md'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Linha superior: Senha e a Mesa à frente da senha */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span
                        className={`font-mono font-black tracking-tight text-2xl leading-none ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {item.formattedTicket}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: item.priorityColor || pTheme.color }}
                        title={item.priorityName}
                      />
                    </div>

                    <div
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl border shrink-0 ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-900 shadow-2xs font-black'
                          : 'bg-slate-800/90 border-slate-700/70 text-slate-100 font-black'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                      <span className="text-sm font-black whitespace-nowrap">{place}</span>
                    </div>
                  </div>

                  {/* Abaixo: Serviço e Localização (Andar e Sala) abaixo do serviço */}
                  <div className="mt-1.5 min-w-0">
                    <span
                      className={`text-xs font-semibold block truncate leading-tight ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      {item.serviceName}
                    </span>

                    {cascade && (
                      <span
                        className={`text-[11px] font-bold block truncate mt-0.5 leading-tight ${
                          isLight ? 'text-slate-700' : 'text-slate-300'
                        }`}
                      >
                        {cascade}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

