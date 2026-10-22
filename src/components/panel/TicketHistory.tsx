'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { History, MapPin } from 'lucide-react'

export interface HistoryTicketItem {
  id: string
  formattedTicket: string
  serviceName: string
  priorityName: string
  priorityColor?: string
  locationFormatted: string
  calledAt?: Date | string | null
}

interface TicketHistoryProps {
  history: HistoryTicketItem[]
  theme?: 'light' | 'dark'
  variant?: 'classic' | 'widescreen' | 'compact'
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
            ? 'bg-white/90 border-slate-200/90 shadow-sm text-slate-800'
            : 'glass-panel border-slate-800 text-slate-200'
        }`}
      >
        <div
          className={`flex items-center space-x-2 pb-3 mb-3 border-b ${
            isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-200'
          }`}
        >
          <History className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Últimas Senhas Chamadas
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <AnimatePresence initial={false}>
            {history.length === 0 ? (
              <div
                className={`col-span-full py-6 text-center text-xs ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Nenhum chamado anterior registrado
              </div>
            ) : (
              history.map((item, index) => (
                <motion.div
                  key={item.formattedTicket || item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1 - index * 0.1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-2xl border flex flex-col justify-between transition-colors ${
                    isLight
                      ? 'bg-slate-50/90 border-slate-200/80 hover:bg-slate-100'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-mono font-bold text-xl tracking-wide ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {item.formattedTicket}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.priorityColor || '#06B6D4' }}
                      title={item.priorityName}
                    />
                  </div>

                  <span
                    className={`text-[11px] block truncate mb-2 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {item.serviceName}
                  </span>

                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      isLight
                        ? 'bg-slate-200/70 text-slate-800'
                        : 'bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <MapPin className={`w-3 h-3 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                    <span className="truncate">{item.locationFormatted}</span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  if (isCompact) {
    const previousTicket = history[0]
    const olderHistory = history.slice(1, 5)

    return (
      <div className="w-full h-full flex flex-col gap-5 justify-between">
        {/* CARD SUPERIOR: Chamada Anterior (Destaque Médio / Chamada Dupla) */}
        <div
          className={`flex-1 min-h-[260px] rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
            isLight
              ? 'bg-white/95 border-cyan-200/90 shadow-sm text-slate-800'
              : 'glass-panel border-cyan-500/40 text-slate-100 shadow-[0_0_35px_rgba(6,182,212,0.18)]'
          }`}
        >
          {/* Header da Chamada Anterior */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80 z-10">
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
                  className={`hidden sm:inline px-2.5 py-1 rounded-full text-xs font-medium border ${
                    isLight
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
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
                    : 'text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
                }`}
              >
                <span className={isLight ? 'text-cyan-600' : 'text-cyan-400'}>
                  {previousTicket.formattedTicket.slice(0, 1)}
                </span>
                <span>{previousTicket.formattedTicket.slice(1)}</span>
              </div>
              <span
                className={`sm:hidden text-xs font-semibold mt-2 block truncate ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {previousTicket.serviceName}
              </span>
            </div>
          ) : (
            <div className="my-auto py-8 text-center z-10">
              <span className={`text-sm ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                Nenhuma chamada anterior registrada
              </span>
            </div>
          )}

          {/* Rodapé: Local do chamado anterior */}
          {previousTicket ? (
            <div
              className={`rounded-2xl p-4 border flex items-center justify-between z-10 ${
                isLight
                  ? 'bg-slate-50 border-slate-200/90 text-slate-900'
                  : 'bg-slate-900/80 border-slate-700/60 text-white'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
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
                  <span className="text-base font-bold">{previousTicket.locationFormatted}</span>
                </div>
              </div>

              <span
                className={`text-2xl font-mono font-black ${
                  isLight ? 'text-cyan-600' : 'text-cyan-400'
                }`}
              >
                {previousTicket.locationFormatted.replace(/[^0-9]/g, '') ? previousTicket.locationFormatted.replace(/[^0-9]/g, '').padStart(2, '0') : ''}
              </span>
            </div>
          ) : (
            <div className="h-6" />
          )}
        </div>

        {/* CARD INFERIOR: Histórico Recente (Demais chamadas em grade) */}
        <div
          className={`rounded-3xl p-5 border transition-all duration-300 ${
            isLight
              ? 'bg-white/90 border-slate-200/90 shadow-sm text-slate-800'
              : 'glass-panel border-slate-800 text-slate-200'
          }`}
        >
          <div
            className={`flex items-center space-x-2 pb-3 mb-3 border-b ${
              isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-200'
            }`}
          >
            <History className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Outras Chamadas Recentes
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {olderHistory.length === 0 ? (
              <div
                className={`col-span-2 py-4 text-center text-xs ${
                  isLight ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Aguardando chamadas adicionais no histórico
              </div>
            ) : (
              olderHistory.map((item) => (
                <div
                  key={item.formattedTicket || item.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                    isLight
                      ? 'bg-slate-50/90 border-slate-200 hover:bg-slate-100'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`font-mono font-bold text-lg leading-tight ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {item.formattedTicket}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.priorityColor || '#06B6D4' }}
                        title={item.priorityName}
                      />
                    </div>
                    <span
                      className={`text-[10px] block truncate max-w-[100px] ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {item.serviceName}
                    </span>
                  </div>

                  <div
                    className={`text-right text-[11px] font-bold px-2 py-1 rounded-lg border ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-700 shadow-xs'
                        : 'bg-slate-800 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    {item.locationFormatted}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  // Layout Classic (coluna lateral)
  return (
    <div
      className={`w-full lg:w-80 xl:w-96 flex flex-col rounded-3xl p-6 border transition-all duration-300 ${
        isLight
          ? 'bg-white/90 border-slate-200/90 shadow-sm text-slate-800'
          : 'glass-panel border-slate-800 text-slate-200'
      }`}
    >
      <div
        className={`flex items-center space-x-2 pb-4 mb-4 border-b ${
          isLight ? 'border-slate-200 text-slate-800' : 'border-slate-800 text-slate-200'
        }`}
      >
        <History className={`w-5 h-5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
        <h3 className="text-base font-bold uppercase tracking-wider">
          Últimas Chamadas
        </h3>
      </div>

      <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <div
              className={`flex-1 flex flex-col items-center justify-center text-center p-6 ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              <span className="text-sm">Nenhum chamado anterior registrado</span>
            </div>
          ) : (
            history.map((item, index) => {
              return (
                <motion.div
                  key={item.formattedTicket || item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1 - index * 0.12, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35 }}
                  className={`rounded-2xl border flex items-center justify-between transition-colors ${
                    isLight
                      ? 'p-3.5 bg-slate-50/90 border-slate-200 hover:bg-slate-100'
                      : 'p-4 bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-mono font-bold tracking-wide ${
                          isLight ? 'text-2xl text-slate-900' : 'text-2xl text-white'
                        }`}
                      >
                        {item.formattedTicket}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.priorityColor || '#06B6D4' }}
                        title={item.priorityName}
                      />
                    </div>
                    <span
                      className={`text-xs block truncate max-w-[150px] ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {item.serviceName}
                    </span>
                  </div>

                  <div
                    className={`flex items-center space-x-1.5 text-right px-3 py-1.5 rounded-xl border ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
                        : 'bg-slate-800/80 border-slate-700/50 text-slate-200'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
                    <span className="text-sm font-semibold">{item.locationFormatted}</span>
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
