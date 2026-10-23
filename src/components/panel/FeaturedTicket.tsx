'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, Tag, Sparkles, Building2, DoorOpen } from 'lucide-react'

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
  locationPlace?: string
  floorName?: string | null
  roomName?: string | null
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
        className={`flex-1 flex flex-col items-center justify-center p-8 text-center rounded-3xl min-h-[480px] transition-all duration-300 relative overflow-hidden ${
          isLight
            ? 'bg-white/95 border-2 border-slate-200/90 shadow-lg'
            : 'bg-[#0c1322]/90 border border-slate-800 shadow-2xl backdrop-blur-xl'
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-96 h-96 rounded-full blur-3xl opacity-20 ${isLight ? 'bg-cyan-400' : 'bg-cyan-600'}`} />
        </div>
        <div
          className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-5 border shadow-inner ${
            isLight
              ? 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 text-cyan-600'
              : 'bg-gradient-to-br from-cyan-950/60 to-slate-900 border-cyan-500/30 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]'
          }`}
        >
          <Tag className="w-12 h-12" />
        </div>
        <h3 className={`text-2xl md:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Aguardando Próxima Chamada
        </h3>
        <p className={`text-sm md:text-base mt-2 max-w-md ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          O painel está conectado e pronto para anunciar a próxima senha emitida.
        </p>
      </div>
    )
  }

  const pLower = ticket.priorityName.toLowerCase()
  const isSpecial = pLower.includes('especial') || pLower.includes('pcd') || pLower.includes('80') || pLower.includes('autista')
  const isPriority = !isSpecial && (pLower.includes('priorit') || pLower.includes('pref') || pLower.includes('60') || pLower.includes('gestan'))

  // Classes do container de acordo com o tema e status
  const getContainerClasses = () => {
    if (isLight) {
      if (isFlashing) {
        return 'border-4 border-emerald-500 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/60 shadow-[0_0_70px_rgba(16,185,129,0.45)] ring-4 ring-emerald-400/30'
      }
      if (isSpecial) {
        return 'border-2 border-purple-300 bg-gradient-to-br from-white via-purple-50/40 to-indigo-50/30 shadow-[0_20px_50px_rgba(139,92,246,0.14)]'
      }
      if (isPriority) {
        return 'border-2 border-amber-300 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 shadow-[0_20px_50px_rgba(245,158,11,0.14)]'
      }
      return 'border-2 border-slate-200/90 bg-gradient-to-br from-white via-sky-50/20 to-slate-50/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)]'
    }

    // Modo Escuro
    if (isFlashing) {
      return 'border-4 border-emerald-400 bg-gradient-to-br from-[#0c1f18] to-[#090D16] shadow-[0_0_80px_rgba(52,211,153,0.5)] ring-4 ring-emerald-400/40'
    }
    if (isSpecial) {
      return 'border-2 border-purple-500/50 bg-gradient-to-br from-[#120f29] via-[#0d1024] to-[#090D16] shadow-[0_0_60px_rgba(139,92,246,0.25)]'
    }
    if (isPriority) {
      return 'border-2 border-amber-500/50 bg-gradient-to-br from-[#1f160a] via-[#14121a] to-[#090D16] shadow-[0_0_60px_rgba(245,158,11,0.25)]'
    }
    return 'border-2 border-cyan-500/40 bg-gradient-to-br from-[#0b172a] via-[#0c1322] to-[#090D16] shadow-[0_0_60px_rgba(6,182,212,0.25)]'
  }

  // Cores de destaque
  const accentGradient = isSpecial
    ? 'from-purple-500 to-indigo-600'
    : isPriority
    ? 'from-amber-500 to-orange-500'
    : 'from-cyan-500 to-blue-600'

  const accentText = isSpecial
    ? isLight ? 'text-purple-600' : 'text-purple-400'
    : isPriority
    ? isLight ? 'text-amber-600' : 'text-amber-400'
    : isLight ? 'text-cyan-600' : 'text-cyan-400'

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
        } rounded-3xl relative overflow-hidden transition-all duration-700 backdrop-blur-xl ${getContainerClasses()}`}
      >
        {/* Radial ambient lighting aura directly behind the ticket */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div
            className={`w-[560px] h-[340px] rounded-full blur-3xl transition-all duration-700 ${
              isFlashing
                ? 'bg-emerald-500/35 scale-125 animate-pulse'
                : isSpecial
                ? isLight ? 'bg-purple-500/18' : 'bg-purple-500/30'
                : isPriority
                ? isLight ? 'bg-amber-500/18' : 'bg-amber-500/30'
                : isLight ? 'bg-cyan-500/18' : 'bg-cyan-500/30'
            }`}
          />
        </div>

        {/* Header: Prioridade e Serviço */}
        <div className="flex items-center justify-between flex-wrap gap-3 z-10">
          <div className="flex items-center space-x-2.5">
            <span
              className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider text-white shadow-md flex items-center space-x-1.5 bg-gradient-to-r ${accentGradient}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{ticket.priorityName}</span>
            </span>
            <span
              className={`px-3.5 py-2 rounded-2xl text-xs md:text-sm font-bold border ${
                isLight
                  ? 'bg-white/90 text-slate-800 border-slate-300/80 shadow-xs'
                  : 'bg-slate-900/80 text-slate-200 border-slate-700/80'
              }`}
            >
              {ticket.serviceName}
            </span>
          </div>

          {ticket.customerName && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border text-sm font-bold ${
                isLight
                  ? 'bg-white/90 text-slate-900 border-slate-300/80 shadow-xs'
                  : 'bg-slate-900/80 border-slate-700/80 text-white'
              }`}
            >
              <User className={`w-4 h-4 ${accentText}`} />
              <span className="capitalize">{ticket.customerName}</span>
            </motion.div>
          )}
        </div>

        {/* Miolo Central: Número Gigante da Senha com Aura */}
        <div className={`text-center z-10 ${isWidescreen || isCompact ? 'my-4 lg:my-6' : 'my-8 lg:my-12'}`}>
          <div className="inline-flex items-center space-x-2 mb-2 px-3 py-1 rounded-full text-xs md:text-sm font-black tracking-widest uppercase border border-current opacity-75">
            <span className={`w-2 h-2 rounded-full animate-ping ${isLight ? 'bg-cyan-600' : 'bg-cyan-400'}`} />
            <span className={accentText}>Senha Chamada</span>
          </div>

          <div
            className={`font-mono font-black tracking-tight leading-none ${
              isWidescreen
                ? 'text-7xl sm:text-8xl md:text-9xl lg:text-[10rem]'
                : isCompact
                ? 'text-6xl sm:text-7xl md:text-8xl lg:text-[7.5rem] xl:text-[8.5rem]'
                : 'text-7xl sm:text-8xl md:text-9xl lg:text-[10rem]'
            } ${
              isLight
                ? 'text-slate-900 drop-shadow-[0_8px_20px_rgba(0,0,0,0.12)]'
                : 'text-white drop-shadow-[0_12px_40px_rgba(0,0,0,0.95)]'
            }`}
          >
            <span className={accentText}>
              {ticket.ticketPrefix}
            </span>
            <span>{ticket.ticketNumber.toString().padStart(3, '0')}</span>
          </div>
        </div>

        {/* Rodapé: Local e Destino (Guichê / Sala) com Tile em Destaque */}
        <div
          className={`z-10 rounded-2xl p-5 md:p-6 border flex items-center justify-between backdrop-blur-md transition-colors ${
            isLight
              ? 'bg-white/95 border-slate-300/80 text-slate-900 shadow-md'
              : 'bg-slate-900/90 border-slate-700/80 text-white shadow-xl'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xs ${
                isLight
                  ? 'bg-cyan-100/80 border-cyan-200 text-cyan-700'
                  : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
              }`}
            >
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Local de Atendimento
                </span>
                {ticket.floorName && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold transition-all shadow-xs ${
                      isLight
                        ? 'bg-sky-50 text-sky-950 border border-sky-300'
                        : 'bg-sky-500/20 text-sky-200 border border-sky-500/35'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-sky-700' : 'text-sky-400'}`} />
                    <span>{ticket.floorName}</span>
                  </span>
                )}
                {ticket.roomName && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold transition-all shadow-xs ${
                      isLight
                        ? 'bg-purple-50 text-purple-950 border border-purple-300'
                        : 'bg-purple-500/20 text-purple-200 border border-purple-500/35'
                    }`}
                  >
                    <DoorOpen className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-purple-700' : 'text-purple-400'}`} />
                    <span>{ticket.roomName}</span>
                  </span>
                )}
              </div>
              <span className={`text-2xl md:text-3xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {ticket.locationPlace || ticket.locationFormatted}
              </span>
            </div>
          </div>

          {/* Badge Numérico em Destaque */}
          <div
            className={`px-6 py-2.5 rounded-2xl border flex items-center space-x-2 font-mono font-black ${
              isLight
                ? 'bg-cyan-50 border-cyan-300 text-cyan-900 shadow-xs'
                : 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
            }`}
          >
            <span className="text-4xl md:text-6xl tracking-tight leading-none">
              {ticket.locationShort}
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
