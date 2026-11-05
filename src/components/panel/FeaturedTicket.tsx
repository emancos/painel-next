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
  roomNumber?: string | null
}

export type LocationTextSize = 'sm' | 'md' | 'lg' | 'xl'

interface FeaturedTicketProps {
  ticket: FeaturedTicketData | null
  isFlashing?: boolean
  theme?: 'light' | 'dark'
  variant?: 'classic' | 'widescreen' | 'compact'
  locationTextSize?: LocationTextSize
}

// Escalas tipográficas responsivas para o nome da sala e do guichê
const sizeStyles: Record<
  LocationTextSize,
  {
    dualRoomText: string
    dualPlaceText: string
    dualNumberText: string
    dualNumberPadding: string
    dualCardPadding: string
    dualIconBox: string
    dualIconSize: string
    singleText: string
    singleNumberText: string
    singleNumberPadding: string
    singleCardPadding: string
    singleIconBox: string
    singleIconSize: string
  }
> = {
  sm: {
    dualRoomText: 'text-base sm:text-lg md:text-xl lg:text-2xl',
    dualPlaceText: 'text-base sm:text-lg md:text-xl lg:text-2xl',
    dualNumberText: 'text-2xl sm:text-3xl lg:text-4xl',
    dualNumberPadding: 'px-2.5 sm:px-3.5 py-1 sm:py-1.5',
    dualCardPadding: 'p-3 sm:p-3.5 md:p-4',
    dualIconBox: 'w-11 h-11 sm:w-12 sm:h-12',
    dualIconSize: 'w-6 h-6 sm:w-7 sm:h-7',
    singleText: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    singleNumberText: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl',
    singleNumberPadding: 'px-3 sm:px-5 py-1.5 sm:py-2',
    singleCardPadding: 'p-3 sm:p-4 md:p-5',
    singleIconBox: 'w-12 h-12 sm:w-14 sm:h-14',
    singleIconSize: 'w-7 h-7 sm:w-8 sm:h-8',
  },
  md: {
    dualRoomText: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
    dualPlaceText: 'text-lg sm:text-xl md:text-2xl lg:text-3xl',
    dualNumberText: 'text-3xl sm:text-4xl lg:text-5xl',
    dualNumberPadding: 'px-3 sm:px-4 py-1.5 sm:py-2',
    dualCardPadding: 'p-3.5 sm:p-4 md:p-5',
    dualIconBox: 'w-12 h-12 sm:w-14 sm:h-14',
    dualIconSize: 'w-7 h-7 sm:w-8 sm:h-8',
    singleText: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl',
    singleNumberText: 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl',
    singleNumberPadding: 'px-4 sm:px-6 py-2 sm:py-2.5',
    singleCardPadding: 'p-4 sm:p-5 md:p-6',
    singleIconBox: 'w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18',
    singleIconSize: 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10',
  },
  lg: {
    dualRoomText: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    dualPlaceText: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    dualNumberText: 'text-3xl sm:text-5xl lg:text-6xl',
    dualNumberPadding: 'px-3.5 sm:px-5 py-2 sm:py-2.5',
    dualCardPadding: 'p-4 sm:p-5 md:p-6',
    dualIconBox: 'w-13 h-13 sm:w-16 sm:h-16',
    dualIconSize: 'w-8 h-8 sm:w-9 sm:h-9',
    singleText: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl',
    singleNumberText: 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl',
    singleNumberPadding: 'px-5 sm:px-7 py-2.5 sm:py-3',
    singleCardPadding: 'p-5 sm:p-6 md:p-7',
    singleIconBox: 'w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22',
    singleIconSize: 'w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12',
  },
  xl: {
    dualRoomText: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
    dualPlaceText: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
    dualNumberText: 'text-4xl sm:text-6xl lg:text-7xl',
    dualNumberPadding: 'px-4 sm:px-6 py-2 sm:py-3',
    dualCardPadding: 'p-4 sm:p-6 md:p-7',
    dualIconBox: 'w-14 h-14 sm:w-18 sm:h-18',
    dualIconSize: 'w-8 h-8 sm:w-10 sm:h-10',
    singleText: 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
    singleNumberText: 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl',
    singleNumberPadding: 'px-5 sm:px-8 py-3 sm:py-3.5',
    singleCardPadding: 'p-6 sm:p-7 md:p-8',
    singleIconBox: 'w-16 h-16 sm:w-22 sm:h-22 md:w-26 md:h-26',
    singleIconSize: 'w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14',
  },
}

export function FeaturedTicket({
  ticket,
  isFlashing,
  theme = 'light',
  variant = 'classic',
  locationTextSize = 'md',
}: FeaturedTicketProps) {
  const isLight = theme === 'light'
  const currentStyle = sizeStyles[locationTextSize] || sizeStyles.md

  if (!ticket) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center rounded-3xl min-h-[340px] sm:min-h-[400px] lg:min-h-[460px] transition-all duration-300 relative overflow-hidden ${
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
          isCompact ? 'p-4 sm:p-6 lg:p-7' : isWidescreen ? 'p-4 sm:p-6 lg:p-8' : 'p-4 sm:p-6 lg:p-8 xl:p-10'
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
        <div className="flex items-center justify-between flex-wrap gap-2.5 sm:gap-3 z-10">
          <div className="flex items-center space-x-2 sm:space-x-2.5 flex-wrap gap-1.5">
            <span
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs md:text-sm font-black uppercase tracking-wider text-white shadow-md flex items-center space-x-1.5 bg-gradient-to-r ${accentGradient}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{ticket.priorityName}</span>
            </span>
            <span
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-xs md:text-sm font-bold border ${
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
              className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-none ${
                isLight
                  ? 'bg-white/90 text-slate-900 border-slate-300/80 shadow-xs'
                  : 'bg-slate-900/80 border-slate-700/80 text-white'
              }`}
            >
              <User className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${accentText} shrink-0`} />
              <span className="capitalize truncate">{ticket.customerName}</span>
            </motion.div>
          )}
        </div>

        {/* Miolo Central: Número Gigante da Senha com Aura */}
        <div className={`text-center z-10 ${isWidescreen || isCompact ? 'my-2 sm:my-3 lg:my-4' : 'my-3 sm:my-4 lg:my-6'}`}>
          <div className="inline-flex items-center space-x-2 mb-1.5 sm:mb-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs md:text-sm font-black tracking-widest uppercase border border-current opacity-75">
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-ping ${isLight ? 'bg-cyan-600' : 'bg-cyan-400'}`} />
            <span className={accentText}>Senha Chamada</span>
          </div>

          <div
            className={`font-mono font-black tracking-tight leading-none ${
              isWidescreen
                ? 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[9.5rem]'
                : isCompact
                ? 'text-5xl sm:text-6xl md:text-7xl lg:text-[7.5rem] xl:text-[8rem]'
                : 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[9.5rem]'
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

        {/* DESTINO / LOCAL DE ATENDIMENTO - SUPER DESTAQUE VISUAL PARA ACESSIBILIDADE DE PESSOAS SURDAS */}
        {(() => {
          // Extração inteligente de andar, sala, guichê/posto e número
          const parts = (ticket.locationFormatted || '')
            .split('•')
            .map((s) => s.trim())
            .filter(Boolean)

          const floor = ticket.floorName || (parts.length >= 3 ? parts[0] : null)

          let room = ticket.roomName
            ? (ticket.roomNumber && !ticket.roomName.includes(ticket.roomNumber)
                ? `${ticket.roomName} ${ticket.roomNumber}`
                : ticket.roomName)
            : (ticket.roomNumber ? `Sala ${ticket.roomNumber}` : null)

          if (!room && parts.length >= 2) {
            room = parts.length >= 3 ? parts[1] : (parts[0] !== ticket.locationPlace ? parts[0] : null)
          }

          const place = ticket.locationPlace || (parts.length > 0 ? parts[parts.length - 1] : ticket.locationFormatted)
          const shortNumber = ticket.locationShort || (place ? place.replace(/\D/g, '') : '')

          const hasDistinctRoom = Boolean(room && (!place || room.toLowerCase() !== place.toLowerCase()))
          const hasDistinctPlace = Boolean(place && (!room || place.toLowerCase() !== room.toLowerCase()))

          return (
            <div
              className={`z-10 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 border-2 transition-all duration-500 relative overflow-hidden backdrop-blur-xl shadow-2xl ${
                isFlashing
                  ? isLight
                    ? 'bg-gradient-to-br from-white via-emerald-50/90 to-cyan-50/80 border-emerald-500 ring-4 ring-emerald-400/40 shadow-[0_0_50px_rgba(16,185,129,0.35)]'
                    : 'bg-gradient-to-br from-[#0c221a] via-[#091522] to-[#070b14] border-emerald-400 ring-4 ring-emerald-400/40 shadow-[0_0_60px_rgba(52,211,153,0.45)]'
                  : isLight
                  ? 'bg-white/95 border-cyan-400/80 shadow-[0_15px_40px_rgba(6,182,212,0.12)]'
                  : 'bg-[#0d1627]/95 border-cyan-500/50 shadow-[0_15px_45px_rgba(6,182,212,0.22)]'
              }`}
            >
              {/* Faixa Superior: Indicador Direcional e Andar */}
              <div
                className={`flex items-center justify-between pb-2.5 sm:pb-3 mb-2.5 sm:mb-3 border-b flex-wrap gap-2 ${
                  isLight ? 'border-slate-200/90' : 'border-slate-700/60'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 bg-emerald-500"></span>
                  </span>
                  <span
                    className={`text-[10px] sm:text-xs md:text-sm font-black tracking-widest uppercase ${
                      isLight ? 'text-cyan-900' : 'text-cyan-300'
                    }`}
                  >
                    DIRIJA-SE AO LOCAL DE ATENDIMENTO
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                  {isFlashing && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-emerald-500 text-white shadow-md animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>Chamando Agora</span>
                    </span>
                  )}

                  {floor && (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-xl text-xs sm:text-sm font-black border shadow-xs ${
                        isLight
                          ? 'bg-sky-100 text-sky-950 border-sky-300'
                          : 'bg-sky-500/25 text-sky-200 border-sky-400/40'
                      }`}
                    >
                      <Building2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isLight ? 'text-sky-700' : 'text-sky-300'}`} />
                      <span>{floor}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Blocos de Destino: Sala e Guichê/Mesa */}
              {hasDistinctRoom && hasDistinctPlace ? (
                /* Cenário 1: Tanto Sala/Ambulatório quanto Guichê/Mesa existem - Exibição Dupla em Alto Destaque */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 md:gap-4 items-stretch">
                  {/* Card da Sala / Consultório */}
                  <div
                    className={`rounded-2xl ${currentStyle.dualCardPadding} border-2 flex items-center justify-between gap-3 transition-all min-w-0 ${
                      isLight
                        ? 'bg-gradient-to-br from-purple-50 via-indigo-50/60 to-purple-100/70 border-purple-300 text-purple-950 shadow-sm'
                        : 'bg-gradient-to-br from-purple-950/70 via-[#130f28] to-slate-900 border-purple-500/60 text-white shadow-lg'
                    }`}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div
                        className={`${currentStyle.dualIconBox} rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-md ${
                          isLight
                            ? 'bg-purple-600 text-white border-purple-700'
                            : 'bg-purple-600/40 text-purple-200 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                        }`}
                      >
                        <DoorOpen className={currentStyle.dualIconSize} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-[10px] sm:text-xs font-black uppercase tracking-widest block mb-0.5 ${
                            isLight ? 'text-purple-800' : 'text-purple-300'
                          }`}
                        >
                          SALA / CONSULTÓRIO
                        </span>
                        <span
                          className={`block ${currentStyle.dualRoomText} font-black tracking-tight leading-tight line-clamp-2 break-words ${
                            isLight ? 'text-purple-950' : 'text-white'
                          }`}
                          title={room || ''}
                        >
                          {room}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card do Posto / Guichê */}
                  <div
                    className={`rounded-2xl ${currentStyle.dualCardPadding} border-2 flex items-center justify-between gap-3 transition-all min-w-0 ${
                      isLight
                        ? 'bg-gradient-to-br from-cyan-50 via-sky-50/60 to-cyan-100/70 border-cyan-300 text-cyan-950 shadow-sm'
                        : 'bg-gradient-to-br from-cyan-950/70 via-[#0a1829] to-slate-900 border-cyan-500/60 text-white shadow-lg'
                    }`}
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div
                        className={`${currentStyle.dualIconBox} rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-md ${
                          isLight
                            ? 'bg-cyan-600 text-white border-cyan-700'
                            : 'bg-cyan-600/40 text-cyan-200 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                        }`}
                      >
                        <MapPin className={currentStyle.dualIconSize} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`text-[10px] sm:text-xs font-black uppercase tracking-widest block mb-0.5 ${
                            isLight ? 'text-cyan-800' : 'text-cyan-300'
                          }`}
                        >
                          POSTO / GUICHÊ
                        </span>
                        <span
                          className={`block ${currentStyle.dualPlaceText} font-black tracking-tight leading-tight line-clamp-2 break-words ${
                            isLight ? 'text-cyan-950' : 'text-white'
                          }`}
                          title={place || ''}
                        >
                          {place}
                        </span>
                      </div>
                    </div>

                    {shortNumber && (
                      <div
                        className={`${currentStyle.dualNumberPadding} rounded-xl sm:rounded-2xl border-2 flex items-center justify-center shrink-0 font-mono font-black ${
                          isLight
                            ? 'bg-white border-cyan-400 text-cyan-950 shadow-md'
                            : 'bg-slate-900/90 border-cyan-400/80 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                        }`}
                      >
                        <span className={`${currentStyle.dualNumberText} tracking-tight leading-none`}>
                          {shortNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Cenário 2: Apenas um local principal (ou Sala ou Guichê único) - Exibição Unificada em Tamanho Gigante */
                <div
                  className={`rounded-2xl ${currentStyle.singleCardPadding} border-2 flex items-center justify-between gap-3 sm:gap-4 transition-all min-w-0 ${
                    room
                      ? isLight
                        ? 'bg-gradient-to-br from-purple-50 via-indigo-50/50 to-purple-100/60 border-purple-300 text-purple-950 shadow-md'
                        : 'bg-gradient-to-br from-purple-950/70 via-[#130f28] to-slate-900 border-purple-500/60 text-white shadow-xl'
                      : isLight
                      ? 'bg-gradient-to-br from-cyan-50 via-sky-50/50 to-cyan-100/60 border-cyan-300 text-cyan-950 shadow-md'
                      : 'bg-gradient-to-br from-cyan-950/70 via-[#0a1829] to-slate-900 border-cyan-500/60 text-white shadow-xl'
                  }`}
                >
                  <div className="flex items-center space-x-3 sm:space-x-5 min-w-0 flex-1">
                    <div
                      className={`${currentStyle.singleIconBox} rounded-xl sm:rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 border-2 shadow-lg ${
                        room
                          ? isLight
                            ? 'bg-purple-600 text-white border-purple-700'
                            : 'bg-purple-600/40 text-purple-200 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
                          : isLight
                            ? 'bg-cyan-600 text-white border-cyan-700'
                            : 'bg-cyan-600/40 text-cyan-200 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)]'
                      }`}
                    >
                      {room ? (
                        <DoorOpen className={currentStyle.singleIconSize} />
                      ) : (
                        <MapPin className={currentStyle.singleIconSize} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={`text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest block mb-0.5 sm:mb-1 ${
                          room
                            ? isLight ? 'text-purple-800' : 'text-purple-300'
                            : isLight ? 'text-cyan-800' : 'text-cyan-300'
                        }`}
                      >
                        {room ? 'SALA / CONSULTÓRIO DE ATENDIMENTO' : 'POSTO / GUICHÊ DE ATENDIMENTO'}
                      </span>
                      <span
                        className={`block ${currentStyle.singleText} font-black tracking-tight leading-tight line-clamp-2 break-words ${
                          room
                            ? isLight ? 'text-purple-950' : 'text-white'
                            : isLight ? 'text-cyan-950' : 'text-white'
                        }`}
                      >
                        {room || place}
                      </span>
                    </div>
                  </div>

                  {shortNumber && (
                    <div
                      className={`${currentStyle.singleNumberPadding} rounded-xl sm:rounded-2xl md:rounded-3xl border-2 flex items-center justify-center shrink-0 font-mono font-black ${
                        room
                          ? isLight
                            ? 'bg-white border-purple-400 text-purple-950 shadow-md'
                            : 'bg-slate-900/90 border-purple-400/80 text-purple-200 shadow-[0_0_25px_rgba(168,85,247,0.35)]'
                          : isLight
                          ? 'bg-white border-cyan-400 text-cyan-950 shadow-md'
                          : 'bg-slate-900/90 border-cyan-400/80 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)]'
                      }`}
                    >
                      <span className={`${currentStyle.singleNumberText} tracking-tight leading-none`}>
                        {shortNumber}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </motion.div>
    </AnimatePresence>
  )
}
