export interface RoleBadgeInfo {
  label: string
  shortLabel: string
  badgeClass: string
}

/**
 * Retorna o nome amigável e classes de estilo para o badge da função/papel do usuário.
 */
export function getUserRoleBadge(role?: string): RoleBadgeInfo {
  switch (role) {
    case 'ADMIN':
      return {
        label: 'Administrador Geral',
        shortLabel: 'Administrador',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      }
    case 'ATTENDANT':
      return {
        label: 'Atendente',
        shortLabel: 'Atendente',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      }
    case 'TRIAGE':
      return {
        label: 'Operador de Triagem',
        shortLabel: 'Triagem',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      }
    case 'MANAGER':
      return {
        label: 'Gerente',
        shortLabel: 'Gerente',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      }
    default:
      return {
        label: role || 'Usuário',
        shortLabel: role || 'Usuário',
        badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      }
  }
}

/**
 * Retorna a denominação em português da função do usuário.
 */
export function formatRoleName(role?: string): string {
  return getUserRoleBadge(role).label
}
