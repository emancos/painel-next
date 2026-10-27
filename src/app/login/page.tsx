'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/actions/auth'
import { getUnitData } from '@/actions/tickets'
import { Lock, Mail, ArrowRight, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { AdminThemeToggle } from '@/components/theme/AdminThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [unit, setUnit] = useState<{ name: string; subtitle?: string | null; logoUrl?: string | null } | null>(null)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setRedirectPath(params.get('redirect'))
    }

    getUnitData()
      .then((data) => {
        if (data && data.unit) {
          setUnit(data.unit)
        }
      })
      .catch(() => { })
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    startTransition(async () => {
      const res = await loginAction(formData)
      if (res.success) {
        if (res.user.role === 'TRIAGE') {
          // Operador de triagem só pode acessar o painel de triagem e o painel de chamados
          if (redirectPath && (redirectPath.startsWith('/triagem') || redirectPath.startsWith('/painel'))) {
            router.push(redirectPath)
          } else {
            router.push('/triagem')
          }
        } else if (res.user.role === 'ADMIN') {
          router.push(redirectPath || '/admin')
        } else {
          // ATTENDANT
          if (redirectPath && !redirectPath.startsWith('/admin')) {
            router.push(redirectPath)
          } else {
            router.push('/atendimento')
          }
        }
      } else {
        setErrorMsg(res.message || 'Credenciais inválidas.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between p-6 admin-page-container transition-colors duration-200 relative overflow-hidden">
      {/* Luzes de Fundo Ambientais (Mesh Lighting) */}
      <div className="mesh-orb-cyan -top-24 -left-24 w-96 h-96 opacity-50 dark:opacity-30 pointer-events-none" />
      <div className="mesh-orb-emerald top-1/2 -right-24 w-[450px] h-[450px] opacity-35 dark:opacity-20 pointer-events-none" />
      <div className="mesh-orb-indigo -bottom-24 left-1/3 w-96 h-96 opacity-35 dark:opacity-20 pointer-events-none" />

      {/* Header com Identidade da Unidade, Alternador de Tema e Botão Voltar */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto pb-4 relative z-20">
        <Link href="/" className="flex items-center space-x-3.5 group">
          {unit?.logoUrl ? (
            <img
              src={unit.logoUrl}
              alt="Logo"
              className="w-11 h-11 object-contain rounded-2xl bg-white/10 dark:bg-white/10 p-1.5 border border-slate-300 dark:border-slate-700/80 shadow-md group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              {unit?.name ? unit.name.charAt(0) : 'P'}
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
              {unit?.name || 'Painel de Chamados'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unit?.subtitle || 'Autenticação Segura de Operadores'}
            </p>
          </div>
        </Link>

        {/* Controles de Topo: Alternador de Tema e Atalho Voltar */}
        <div className="flex items-center space-x-3 shrink-0">
          <AdminThemeToggle />

          <Link
            href="/"
            className="h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-800 text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0 group active:scale-95"
            title="Voltar para a Tela Inicial"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Voltar ao Início</span>
          </Link>
        </div>
      </header>

      {/* Miolo de Login */}
      <main className="max-w-md w-full mx-auto my-auto space-y-6 relative z-10 py-4 sm:py-6 px-2 sm:px-0">
        <div className="p-5 sm:p-8 rounded-3xl bg-white/95 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-400/10 dark:bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {redirectPath?.startsWith('/triagem') ? 'Acesso ao Posto de Triagem' : 'Acesso ao Atendimento'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {redirectPath?.startsWith('/triagem')
                ? 'A página de triagem requer autenticação. Faça login com seu usuário ou operador de triagem.'
                : 'Faça login com seu e-mail e senha para iniciar seu posto de atendimento.'}
            </p>
          </div>

          {redirectPath?.startsWith('/triagem') && (
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-semibold flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
              <span>Autenticação obrigatória para emissão de senhas e triagem.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 mb-4 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="seu.email@orgao.gov.br"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.99] disabled:opacity-50 mt-2 btn-boom cursor-pointer"
            >
              <span>{isPending ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Link Adicional Voltar para Home */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para a tela inicial</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 dark:text-slate-500 max-w-5xl w-full mx-auto pt-4 relative z-10">
        Sistema Unificado de Chamados • Desenvolvido por Integra Sistemas
      </footer>
    </div>
  )
}
