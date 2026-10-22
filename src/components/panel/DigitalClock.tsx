'use client'

import { useState, useEffect } from 'react'

export function DigitalClock({ timezone = 'America/Sao_Paulo' }: { timezone?: string }) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!time) {
    return (
      <div className="flex flex-col items-end opacity-50 animate-pulse">
        <span className="text-3xl font-mono font-bold tracking-wider text-cyan-400">--:--:--</span>
        <span className="text-xs uppercase tracking-widest text-slate-400">Carregando...</span>
      </div>
    )
  }

  // Formata o horário respeitando o timezone configurado para a unidade
  const tz = timezone || 'America/Sao_Paulo'

  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = timeFormatter.formatToParts(time)
  const hours = parts.find((p) => p.type === 'hour')?.value || '00'
  const minutes = parts.find((p) => p.type === 'minute')?.value || '00'
  const seconds = parts.find((p) => p.type === 'second')?.value || '00'

  const dateStr = time.toLocaleDateString('pt-BR', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Capitaliza o dia da semana
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-baseline space-x-1 font-mono text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
        <span className="text-cyan-400">{hours}</span>
        <span className="text-slate-500 animate-pulse">:</span>
        <span className="text-cyan-400">{minutes}</span>
        <span className="text-slate-500 animate-pulse">:</span>
        <span className="text-slate-400 text-2xl md:text-3xl">{seconds}</span>
      </div>
      <span className="text-xs md:text-sm font-medium tracking-wide text-slate-400 capitalize mt-0.5">
        {formattedDate}
      </span>
    </div>
  )
}
