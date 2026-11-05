'use client'

import { useState, useEffect } from 'react'

export function DigitalClock({
  timezone = 'America/Sao_Paulo',
  theme = 'light',
}: {
  timezone?: string
  theme?: 'light' | 'dark'
}) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const isLight = theme === 'light'

  if (!time) {
    return (
      <div className="flex flex-col items-end opacity-50 animate-pulse">
        <span className={`text-3xl font-mono font-bold tracking-wider ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`}>--:--:--</span>
        <span className={`text-xs uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Carregando...</span>
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
    <div className="flex flex-col items-end shrink-0">
      <div className={`flex items-baseline space-x-0.5 sm:space-x-1 font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-none ${
        isLight ? 'text-slate-900' : 'text-white drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]'
      }`}>
        <span className={isLight ? 'text-cyan-600' : 'text-cyan-400'}>{hours}</span>
        <span className={`${isLight ? 'text-slate-400' : 'text-slate-500'} animate-pulse`}>:</span>
        <span className={isLight ? 'text-cyan-600' : 'text-cyan-400'}>{minutes}</span>
        <span className={`${isLight ? 'text-slate-400' : 'text-slate-500'} animate-pulse`}>:</span>
        <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} text-lg sm:text-xl md:text-2xl lg:text-3xl`}>{seconds}</span>
      </div>
      <span className={`text-[10px] sm:text-xs md:text-sm font-medium tracking-wide capitalize mt-1 truncate max-w-[140px] sm:max-w-none ${
        isLight ? 'text-slate-600' : 'text-slate-400'
      }`}>
        {formattedDate}
      </span>
    </div>
  )
}
