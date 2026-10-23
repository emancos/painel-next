'use client'

import { useEffect, useRef } from 'react'
import { Ticket, X, Megaphone, User, Clock, ChevronRight } from 'lucide-react'
import { IssuedTicketNotificationData } from '@/lib/attendantNotifications'

interface Props {
  ticket: IssuedTicketNotificationData | null
  onDismiss: () => void
  onCallNow?: (ticket: IssuedTicketNotificationData) => void
  canCallNow?: boolean
  durationMs?: number
}

const DEFAULT_DURATION_MS = 6500

export function AttendantTicketToast({
  ticket,
  onDismiss,
  onCallNow,
  canCallNow = false,
  durationMs = DEFAULT_DURATION_MS,
}: Props) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!ticket?.ticketId) return

    const timer = setTimeout(() => {
      onDismissRef.current()
    }, durationMs)

    return () => clearTimeout(timer)
  }, [ticket?.ticketId, durationMs])

  if (!ticket) return null

  return (
    <div className="fixed top-5 right-5 z-[110] max-w-sm w-full animate-scale-in drop-shadow-2xl">
      <style>{`
        @keyframes shrinkToastBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="rounded-3xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-2 border-cyan-500/50 p-4 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden relative">
        {/* Barra de Progresso do Auto-Dismiss (GPU accelerated, suave e contínua) */}
        <div
          key={ticket.ticketId}
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600"
          style={{
            animation: `shrinkToastBar ${durationMs}ms linear forwards`,
          }}
        />

        {/* Topo do Toast */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Nova Senha Emitida
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> Agora
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Corpo da Notificação */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 tracking-tight">
                {ticket.formattedTicket}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs"
                style={{
                  backgroundColor: ticket.priorityColor ? `${ticket.priorityColor}20` : '#06B6D420',
                  color: ticket.priorityColor || '#06B6D4',
                  borderColor: ticket.priorityColor ? `${ticket.priorityColor}40` : '#06B6D440',
                }}
              >
                {ticket.priorityName}
              </span>
            </div>

            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[210px]">
              {ticket.serviceName}
            </p>

            {ticket.customerName && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate max-w-[210px]">
                <User className="w-3 h-3 text-cyan-500 shrink-0" />
                <span>{ticket.customerName}</span>
              </p>
            )}
          </div>

          {/* Botão de Chamada Imediata se guichê estiver livre */}
          {canCallNow && onCallNow && (
            <button
              type="button"
              onClick={() => onCallNow(ticket)}
              className="px-3 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center shrink-0 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer group"
              title="Chamar esta senha imediatamente para seu guichê"
            >
              <Megaphone className="w-4 h-4 mb-0.5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px]">Chamar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
