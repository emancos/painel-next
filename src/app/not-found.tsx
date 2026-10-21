import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-6">
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-sm">
        <AlertCircle className="w-10 h-10 text-cyan-400 mx-auto" />
        <h2 className="text-xl font-bold">Página não encontrada</h2>
        <p className="text-xs text-slate-400">O endereço solicitado não existe ou foi movido.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400 transition-colors"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  )
}
