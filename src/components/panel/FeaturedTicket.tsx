'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, Tag } from 'lucide-react'

export interface FeaturedTicketData {
  id: string
  formattedTicket: string
  ticketPrefix: string
  ticketNumber: number
  customerName?: string | null
  serviceName: string
  priorityName: string
  priorityColor?: string
  locationFormatted: string
  locationShort: string
}

interface FeaturedTicketProps {
  ticket: FeaturedTicketData | null
  isFlashing?: boolean
}

export function FeaturedTicket({ ticket, isFlashing }: FeaturedTicketProps) {
  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center rounded-3xl glass-panel border border-slate-800/80 min-h-[480px]">
        <div className="w-20 h-20 rounded-full bg-slate-800/60 flex items-center justify-center mb-4 text-cyan-400/60 animate-pulse">
          <Tag className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-bold text-slate-300">Aguardando Próxima Chamada</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          O painel está conectado e pronto para exibir as senhas emitidas e chamadas pelos atendentes.
        </p>
      </div>
    )
  }

  const isPriority = ticket.priorityName.toLowerCase().includes('priorit')

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={ticket.id + '-' + ticket.formattedTicket}
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: -15 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`flex-1 flex flex-col justify-between p-8 lg:p-10 rounded-3xl relative overflow-hidden transition-all duration-700 ${
          isFlashing
            ? 'border-2 border-emerald-400 bg-emerald-950/30 shadow-[0_0_60px_rgba(52,211,153,0.35)]'
            : isPriority
            ? 'glass-panel-accent shadow-[0_0_40px_rgba(16,185,129,0.2)]'
            : 'glass-panel border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.25)]'
        }`}
      >
        {/* Glow corner accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-transparent to-transparent rounded-full pointer-events-none" />

        {/* Header: Prioridade e Serviço */}
        <div className="flex items-center justify-between flex-wrap gap-3 z-10">
          <div className="flex items-center space-x-2">
            <span
              className="px-4 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider text-white shadow-sm"
              style={{ backgroundColor: ticket.priorityColor || '#06B6D4' }}
            >
              {ticket.priorityName}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
              {ticket.serviceName}
            </span>
          </div>

          {ticket.customerName && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-200 text-sm font-medium"
            >
              <User className="w-4 h-4 text-cyan-400" />
              <span className="capitalize">{ticket.customerName}</span>
            </motion.div>
          )}
        </div>

        {/* Miolo Central: Número Gigante da Senha */}
        <div className="my-8 lg:my-12 text-center z-10">
          <span className="text-xs md:text-sm font-bold tracking-widest text-slate-400 uppercase block mb-1">
            Senha Chamada
          </span>
          <div className="font-mono font-black text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] tracking-tight leading-none text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
            <span className="text-cyan-400">{ticket.ticketPrefix}</span>
            <span>{ticket.ticketNumber.toString().padStart(3, '0')}</span>
          </div>
        </div>

        {/* Rodapé: Local e Destino (Guichê / Sala) */}
        <div className="z-10 bg-slate-900/80 rounded-2xl p-5 md:p-6 border border-slate-700/60 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Local de Atendimento
              </span>
              <span className="text-xl md:text-2xl font-bold text-white">
                {ticket.locationFormatted}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-4xl md:text-5xl font-mono font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              {ticket.locationShort}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
