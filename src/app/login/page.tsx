'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/actions/auth'
import { getUnitData } from '@/actions/tickets'
import { Lock, Mail, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('emmanuelcdasilva@gmail.com')
  const [password, setPassword] = useState('rakell17')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [unit, setUnit] = useState<{ name: string; subtitle?: string | null; logoUrl?: string | null } | null>(null)

  useEffect(() => {
    getUnitData()
      .then((data) => {
        if (data && data.unit) {
          setUnit(data.unit)
        }
      })
      .catch(() => {})
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
        if (res.user.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/atendimento')
        }
      } else {
        setErrorMsg(res.message || 'Credenciais inválidas.')
      }
    })
  }

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail)
    setPassword(userPass)
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col justify-between p-6">
      {/* Header com Identidade da Unidade e Botão Voltar */}
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto pb-4">
        <Link href="/" className="flex items-center space-x-3.5 group">
          {unit?.logoUrl ? (
            <img
              src={unit.logoUrl}
              alt="Logo"
              className="w-10 h-10 object-contain rounded-xl bg-white/10 p-1 border border-slate-700 shadow-md group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              {unit?.name ? unit.name.charAt(0) : 'N'}
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
              {unit?.name || 'Painel de Chamados'}
            </h1>
            <p className="text-xs text-slate-400">{unit?.subtitle || 'Autenticação Segura'}</p>
          </div>
        </Link>

        {/* Botão Voltar para Tela Inicial */}
        <Link
          href="/"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-bold transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para a Tela Inicial</span>
        </Link>
      </header>

      {/* Miolo de Login */}
      <main className="max-w-md w-full mx-auto my-auto space-y-6">
        <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Acesso ao Atendimento</h2>
            <p className="text-xs text-slate-400">
              Faça login com seu e-mail e senha para iniciar seu posto de atendimento
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-600/50 text-rose-300 text-xs font-semibold flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="seu.email@orgao.gov.br"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              <span>{isPending ? 'Autenticando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Atalhos para Contas Semeadas */}
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Contas cadastradas para teste rápido:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('emmanuelcdasilva@gmail.com', 'rakell17')}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500 text-left transition-colors"
              >
                <span className="font-bold text-cyan-300 block">Administrador</span>
                <span className="text-[11px] text-slate-400 truncate block">emmanuelcdasilva...</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('atendente@painelnext.com', 'atendente123')}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 text-left transition-colors"
              >
                <span className="font-bold text-emerald-300 block">Atendente</span>
                <span className="text-[11px] text-slate-400 truncate block">atendente@painel...</span>
              </button>
            </div>
          </div>

          {/* Link Adicional Voltar para Home */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para a tela inicial</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 max-w-5xl w-full mx-auto pt-4">
        Sistema Unificado de Chamados • Protegido com Criptografia Bcrypt e JWT
      </footer>
    </div>
  )
}
