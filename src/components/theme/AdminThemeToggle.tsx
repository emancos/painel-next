'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('admin_theme')
    const activeTheme = (stored === 'light' || stored === 'dark') ? stored : 'dark'
    setTheme(activeTheme)
    document.documentElement.setAttribute('data-admin-theme', activeTheme)
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      localStorage.setItem('admin_theme', nextTheme)
      document.documentElement.setAttribute('data-admin-theme', nextTheme)
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      window.dispatchEvent(new CustomEvent('admin-theme-changed', { detail: nextTheme }))
    } catch (e) {}
  }

  if (!mounted) {
    return (
      <div className="h-11 w-11 md:w-32 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center opacity-50 shrink-0" />
    )
  }

  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`h-11 px-3.5 rounded-2xl border transition-all flex items-center justify-center space-x-2 shrink-0 ${
        isLight
          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 shadow-xs'
          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
      }`}
      title={isLight ? 'Alternar para Tema Escuro' : 'Alternar para Tema Claro'}
    >
      {isLight ? (
        <>
          <Moon className="w-4 h-4 text-slate-700" />
          <span className="hidden md:inline text-xs font-semibold">Modo Escuro</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline text-xs font-semibold">Modo Claro</span>
        </>
      )}
    </button>
  )
}
