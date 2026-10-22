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
  theme?: 'light' | 'dark'
  variant?: 'classic' | 'widescreen' | 'compact'
}

export function FeaturedTicket({
  ticket,
  isFlashing,
  theme = 'light',
  variant = 'classic',
}: FeaturedTicketProps) {
  const isLight = theme === 'light'

  if (!ticket) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-8 text-center rounded-3xl min-h-[480px] transition-all duration-300 ${
          isLight
            ? 'bg-white/90 border border-slate-200/90 shadow-sm'
            : 'glass-panel border border-slate-800/80'
        }`}
      >
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 animate-pulse ${
            isLight ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-800/60 text-cyan-400/60'
          }`}
        >
          <Tag className="w-10 h-10" />
        </div>
        <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
          Aguardando Próxima Chamada
        </h3>
        <p className={`text-sm mt-2 max-w-sm ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
          O painel está conectado e pronto para exibir as senhas emitidas e chamadas pelos atendentes.
        </p>
      </div>
    )
  }

  const isPriority = ticket.priorityName.toLowerCase().includes('priorit')

  // Classes do container de acordo com o tema e status (flash / prioridade)
  const getContainerClasses = () => {
    if (isLight) {
      if (isFlashing) {
        return 'border-2 border-emerald-500 bg-emerald-50/90 shadow-[0_0_50px_rgba(16,185,129,0.35)]'
      }
      if (isPriority) {
        return 'bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/30 border border-emerald-300 shadow-[0_15px_45px_rgba(16,185,129,0.12)]'
      }
      return 'bg-white/95 border border-slate-200 shadow-[0_15px_45px_rgba(0,0,0,0.06)]'
    }

    // Modo Escuro
    if (isFlashing) {
      return 'border-2 border-emerald-400 bg-emerald-950/30 shadow-[0_0_60px_rgba(52,211,153,0.35)]'
    }
    if (isPriority) {
      return 'glass-panel-accent shadow-[0_0_40px_rgba(16,185,129,0.2)]'
    }
    return 'glass-panel border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.25)]'
  }

  const isWidescreen = variant === 'widescreen'
  const isCompact = variant === 'compact'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={ticket.id + '-' + ticket.formattedTicket}
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: -15 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`flex-1 flex flex-col justify-between ${
          isCompact ? 'p-6 lg:p-8' : 'p-8 lg:p-10'
        } rounded-3xl relative overflow-hidden transition-all duration-700 ${getContainerClasses()}`}
      >
        {/* Glow corner accent */}
        <div
          className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl ${
            isLight ? 'from-cyan-500/5' : 'from-cyan-500/10'
          } via-transparent to-transparent rounded-full pointer-events-none`}
        />

        {/* Header: Prioridade e Serviço */}
        <div className="flex items-center justify-between flex-wrap gap-3 z-10">
          <div className="flex items-center space-x-2">
            <span
              className="px-4 py-1.5 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider text-white shadow-sm"
              style={{ backgroundColor: ticket.priorityColor || '#06B6D4' }}
            >
              {ticket.priorityName}
            </span>
            <span
              className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold border ${
                isLight
                  ? 'bg-slate-100/90 text-slate-700 border-slate-200'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}
            >
              {ticket.serviceName}
            </span>
          </div>

          {ticket.customerName && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full border text-sm font-medium ${
                isLight
                  ? 'bg-slate-100 text-slate-800 border-slate-200'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-200'
              }`}
            >
              <User className={`w-4 h-4 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />
              <span className="capitalize">{ticket.customerName}</span>
            </motion.div>
          )}
        </div>

        {/* Miolo Central: Número Gigante da Senha */}
        <div className={`text-center z-10 ${isWidescreen || isCompact ? 'my-4 lg:my-6' : 'my-8 lg:my-12'}`}>
          <span
            className={`text-xs md:text-sm font-bold tracking-widest uppercase block mb-1 ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Senha Chamada
          </span>
          <div
            className={`font-mono font-black tracking-tight leading-none ${
              isWidescreen
                ? 'text-7xl sm:text-8xl md:text-9xl lg:text-[10rem]'
                : isCompact
                ? 'text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] xl:text-[8.5rem]'
                : 'text-7xl sm:text-8xl md:text-9xl lg:text-[10rem]'
            } ${
              isLight
                ? 'text-slate-900 drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)]'
                : 'text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]'
            }`}
          >
            <span className={isLight ? 'text-cyan-600' : 'text-cyan-400'}>
              {ticket.ticketPrefix}
            </span>
            <span>{ticket.ticketNumber.toString().padStart(3, '0')}</span>
          </div>
        </div>

        {/* Rodapé: Local e Destino (Guichê / Sala) */}
        <div
          className={`z-10 rounded-2xl p-5 md:p-6 border flex items-center justify-between backdrop-blur-md ${
            isLight
              ? 'bg-slate-50 border-slate-200/90 text-slate-900 shadow-sm'
              : 'bg-slate-900/80 border-slate-700/60 text-white'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span
                className={`text-xs font-semibold uppercase tracking-wider block ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Local de Atendimento
              </span>
              <span className={`text-xl md:text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {ticket.locationFormatted}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`text-4xl md:text-5xl font-mono font-black ${
                isLight
                  ? 'text-cyan-600'
                  : 'text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]'
              }`}
            >
              {ticket.locationShort}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
