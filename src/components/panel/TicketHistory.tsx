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
}

export function TicketHistory({ history }: TicketHistoryProps) {
  return (
    <div className="w-full lg:w-80 xl:w-96 flex flex-col rounded-3xl glass-panel p-6 border border-slate-800">
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-slate-800">
        <History className="w-5 h-5 text-cyan-400" />
        <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider">
          Últimas Chamadas
        </h3>
      </div>

      <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
        <AnimatePresence initial={false}>
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <span className="text-sm">Nenhum chamado anterior registrado</span>
            </div>
          ) : (
            history.map((item, index) => (
              <motion.div
                key={item.formattedTicket || item.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1 - index * 0.12, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35 }}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-2xl text-white tracking-wide">
                      {item.formattedTicket}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.priorityColor || '#06B6D4' }}
                      title={item.priorityName}
                    />
                  </div>
                  <span className="text-xs text-slate-400 block truncate max-w-[150px]">
                    {item.serviceName}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 text-right bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-sm font-semibold text-slate-200">
                    {item.locationFormatted}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
