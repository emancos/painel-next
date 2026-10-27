'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Headphones, 
  Ticket, 
  ShieldCheck, 
  Tv, 
  LogIn 
} from 'lucide-react'

export interface NavbarShortcutsProps {
  user?: {
    id?: string
    name?: string
    email?: string
    role?: string
    avatarUrl?: string | null
  } | null
  unitId?: string | null
  className?: string
  showTvLink?: boolean
}

interface NavItem {
  href: string
  label: string
  shortLabel?: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
  target?: string
}

export function NavbarShortcuts({
  user,
  unitId,
  className = '',
  showTvLink = true,
}: NavbarShortcutsProps) {
  const pathname = usePathname()

  const role = user?.role

  const items: NavItem[] = []

  // Regra de Permissões baseada no middleware do sistema:
  // 1. Hub / Início: Permitido para todos, EXCETO operador TRIAGE
  if (role !== 'TRIAGE') {
    items.push({
      href: '/',
      label: 'Hub',
      shortLabel: 'Hub',
      icon: Home,
      exact: true,
    })
  }

  // 2. Atendimento: Exclusivo para ADMIN e ATTENDANT
  if (role === 'ADMIN' || role === 'ATTENDANT') {
    items.push({
      href: '/atendimento',
      label: 'Atendimento',
      shortLabel: 'Atend.',
      icon: Headphones,
    })
  }

  // 3. Triagem / Totem: Disponível para todos os usuários autenticados (ADMIN, ATTENDANT, TRIAGE)
  if (user) {
    items.push({
      href: '/triagem',
      label: 'Triagem',
      shortLabel: 'Triagem',
      icon: Ticket,
    })
  }

  // 4. Painel de Administração: Exclusivo para perfil ADMIN
  if (role === 'ADMIN') {
    items.push({
      href: '/admin',
      label: 'Administração',
      shortLabel: 'Admin',
      icon: ShieldCheck,
    })
  }

  // 5. Painel TV Fullscreen: Disponível para todos se houver unidade identificada
  if (showTvLink && unitId) {
    items.push({
      href: `/painel/${unitId}`,
      label: 'Painel TV',
      shortLabel: 'TV',
      icon: Tv,
      target: '_blank',
    })
  }

  // 6. Caso usuário não esteja logado, exibe atalho de Login
  if (!user) {
    items.push({
      href: '/login',
      label: 'Login Operador',
      shortLabel: 'Login',
      icon: LogIn,
    })
  }

  const isActive = (item: NavItem) => {
    if (item.target === '_blank') return false
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <nav
      aria-label="Navegação rápida do sistema"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 max-w-full ${className}`}
    >
      {items.map((item) => {
        const active = isActive(item)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            target={item.target}
            rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
            title={item.label}
            className={`h-10 sm:h-11 px-3 sm:px-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all shrink-0 active:scale-95 border ${
              active
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-800 dark:text-cyan-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40'
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 transition-colors ${
                active
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            />
            <span className="hidden sm:inline whitespace-nowrap">{item.label}</span>
            <span className="sm:hidden whitespace-nowrap">{item.shortLabel || item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
