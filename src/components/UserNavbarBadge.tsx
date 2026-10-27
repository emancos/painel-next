'use client'

import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { formatRoleName } from '@/lib/roles'

import { useState, useEffect } from 'react'

export interface UserNavbarBadgeProps {
  user: {
    id: string
    name: string
    email?: string
    role: string
    avatarUrl?: string | null
  }
  onLogout?: () => void
  showLogout?: boolean
  className?: string
}

export function UserNavbarBadge({
  user,
  onLogout,
  showLogout = true,
  className = '',
}: UserNavbarBadgeProps) {
  const [imageError, setImageError] = useState(false)

  // Reseta estado caso a url do avatar seja alterada
  useEffect(() => {
    setImageError(false)
  }, [user.avatarUrl])

  return (
    <div
      className={`flex items-center h-11 bg-slate-100 dark:bg-slate-900/90 pl-2 pr-3.5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-xs gap-2 shrink-0 group ${className}`}
    >
      <Link
        href="/perfil"
        className="flex items-center space-x-2.5 py-1 pr-1 hover:opacity-90 transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        title="Ver meu perfil (Alterar senha e avatar)"
      >
        {/* Avatar ou Inicial com Fallback */}
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 bg-white/10 flex items-center justify-center shadow-xs">
          {user.avatarUrl && !imageError ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center font-black text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Nome e Cargo */}
        <div className="text-left leading-tight">
          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate max-w-[120px] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {user.name}
          </span>
          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono block">
            {formatRoleName(user.role)}
          </span>
        </div>
      </Link>

      {/* Botão de Logout */}
      {showLogout && onLogout && (
        <button
          onClick={onLogout}
          type="button"
          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors ml-0.5 rounded-lg hover:bg-rose-500/10 cursor-pointer active:scale-95"
          title="Sair do Sistema"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
