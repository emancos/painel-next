'use client'

import { useEffect, useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  KeyRound,
  UploadCloud,
  Trash2,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Sparkles,
  Calendar,
  MapPin,
  Lock,
  Save,
  Check,
  Edit2
} from 'lucide-react'
import { AdminThemeToggle } from '@/components/theme/AdminThemeToggle'
import {
  getUserProfile,
  updateUserName,
  changeUserPassword,
  removeUserAvatar,
  UserProfileData,
} from '@/actions/profile'
import { logoutAction } from '@/actions/auth'

export default function UserProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // Feedback geral
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Edição de Nome
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [isSavingName, startNameTransition] = useTransition()

  // Upload de Avatar
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Formulário de Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, startPasswordTransition] = useTransition()

  // Carrega os dados do perfil
  const loadProfile = async () => {
    try {
      const res = await getUserProfile()
      if (res.success) {
        setProfile(res.user)
        setNameInput(res.user.name)
      } else {
        router.push('/login?redirect=/perfil')
      }
    } catch {
      router.push('/login?redirect=/perfil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  // Deslogar
  const handleLogout = async () => {
    await logoutAction()
    router.push('/login')
  }

  // Rota de retorno inteligente baseada no cargo
  const getBackRoute = () => {
    if (!profile) return '/'
    if (profile.role === 'ADMIN') return '/admin'
    if (profile.role === 'ATTENDANT') return '/atendimento'
    if (profile.role === 'TRIAGE') return '/triagem'
    return '/'
  }

  // Ação de salvar nome
  const handleSaveName = () => {
    if (!nameInput.trim()) return
    startNameTransition(async () => {
      try {
        const res = await updateUserName(nameInput)
        if (res.success) {
          setProfile((prev) => (prev ? { ...prev, name: res.name } : null))
          setIsEditingName(false)
          setFeedback({ type: 'success', message: 'Nome atualizado com sucesso!' })
        } else {
          setFeedback({ type: 'error', message: res.message })
        }
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message || 'Erro ao atualizar nome.' })
      }
    })
  }

  // Ação de upload de avatar para /api/upload-avatar
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação preliminar de tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'A imagem deve ter no máximo 5MB.' })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploadingAvatar(true)
    setFeedback(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Falha no envio da imagem.')
      }

      setProfile((prev) => (prev ? { ...prev, avatarUrl: data.url } : null))
      setFeedback({
        type: 'success',
        message: 'Foto de perfil atualizada e salva na pasta public/avatars com sucesso!',
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: (err as Error).message || 'Erro ao processar upload do avatar.',
      })
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Ação de remover avatar
  const handleRemoveAvatar = async () => {
    if (!confirm('Deseja realmente remover sua foto de perfil?')) return

    setIsUploadingAvatar(true)
    try {
      const res = await removeUserAvatar()
      if (res.success) {
        setProfile((prev) => (prev ? { ...prev, avatarUrl: null } : null))
        setFeedback({ type: 'success', message: res.message })
      } else {
        setFeedback({ type: 'error', message: res.message })
      }
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Ação de alteração de senha
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!currentPassword) {
      setFeedback({ type: 'error', message: 'Por favor, digite sua senha atual.' })
      return
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'A confirmação de senha não confere.' })
      return
    }

    startPasswordTransition(async () => {
      try {
        const res = await changeUserPassword({
          currentPassword,
          newPassword,
          confirmPassword,
        })

        if (res.success) {
          setFeedback({ type: 'success', message: res.message })
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        } else {
          setFeedback({ type: 'error', message: res.message })
        }
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message || 'Erro ao alterar a senha.' })
      }
    })
  }

  // Indicador de força de senha
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: 'Vazia', color: 'bg-slate-300 dark:bg-slate-700' }
    let score = 0
    if (pass.length >= 6) score++
    if (pass.length >= 10) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^A-Za-z0-9]/.test(pass)) score++

    if (score <= 2) return { score: 1, text: 'Fraca', color: 'bg-rose-500' }
    if (score <= 4) return { score: 2, text: 'Média', color: 'bg-amber-500' }
    return { score: 3, text: 'Forte', color: 'bg-emerald-500' }
  }

  const passStrength = calculatePasswordStrength(newPassword)

  // Descrição amigável do papel
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Administrador Global',
          badgeClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
          icon: <Shield className="w-3.5 h-3.5" />,
        }
      case 'ATTENDANT':
        return {
          label: 'Atendente Operacional',
          badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          icon: <User className="w-3.5 h-3.5" />,
        }
      case 'TRIAGE':
        return {
          label: 'Operador de Triagem',
          badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
          icon: <Sparkles className="w-3.5 h-3.5" />,
        }
      default:
        return {
          label: role || 'Usuário',
          badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
          icon: <User className="w-3.5 h-3.5" />,
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Carregando dados do perfil...</p>
      </div>
    )
  }

  if (!profile) return null

  const roleInfo = getRoleBadge(profile.role)

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col p-6 md:p-8 admin-page-container transition-colors duration-200 relative overflow-hidden">
      {/* Luzes de Fundo Ambientais */}
      <div className="mesh-orb-cyan -top-24 -left-24 w-96 h-96 opacity-40 dark:opacity-30 pointer-events-none" />
      <div className="mesh-orb-indigo top-1/2 -right-24 w-[450px] h-[450px] opacity-35 dark:opacity-20 pointer-events-none" />
      <div className="mesh-orb-emerald -bottom-24 left-1/3 w-96 h-96 opacity-30 dark:opacity-20 pointer-events-none" />

      {/* Header Superior com Voltar, Tema e Logout */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4 z-10">
        <div className="flex items-center space-x-4">
          <Link
            href={getBackRoute()}
            className="h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-all flex items-center justify-center shrink-0 shadow-xs hover:scale-105 active:scale-95"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Perfil de Usuário
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 shadow-xs ${roleInfo.badgeClass}`}
              >
                {roleInfo.icon}
                {roleInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie suas informações, foto de exibição e credenciais de segurança
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <AdminThemeToggle />
          <button
            onClick={handleLogout}
            className="h-11 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-bold transition-all shadow-xs flex items-center space-x-2 shrink-0 active:scale-95 cursor-pointer"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Alerta de Feedback (Sucesso ou Erro) */}
      {feedback && (
        <div
          className={`mt-6 p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-fade-in shadow-xs z-10 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/35 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:opacity-75 transition-opacity ml-2"
            title="Fechar aviso"
          >
            ×
          </button>
        </div>
      )}

      {/* Conteúdo Principal do Perfil */}
      <main className="max-w-5xl w-full mx-auto my-8 space-y-8 flex-1 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna da Esquerda: Avatar & Identificação Rápida */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card do Avatar */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800/80 shadow-md backdrop-blur-xl text-center space-y-6 relative overflow-hidden">
              <div className="flex flex-col items-center">
                {/* Visualizador de Foto com Overlay de Câmera */}
                <div className="relative group">
                  <div className="w-32 h-32 md:w-36 md:h-36 rounded-full p-1 border-2 border-cyan-500/40 shadow-xl overflow-hidden bg-white/5 dark:bg-slate-950 flex items-center justify-center">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={`Foto de ${profile.name}`}
                        className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-inner">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Botão de Câmera Sobreposto */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-1 right-1 p-2.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg border-2 border-white dark:border-slate-900 transition-all hover:scale-110 active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Alterar foto de perfil"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Input Invisível para Upload de Arquivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                />

                <div className="mt-4 space-y-1">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {profile.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {profile.email}
                  </p>
                </div>
              </div>

              {/* Botões de Ação do Avatar */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="w-full sm:w-auto h-10 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition-all shadow-md flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isUploadingAvatar ? 'Enviando...' : 'Carregar Foto'}</span>
                </button>

                {profile.avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar}
                    className="w-full sm:w-auto h-10 px-4 rounded-2xl bg-slate-200 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700/80 font-bold text-xs transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Remover foto atual"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              {/* Dica de Armazenamento Local */}
              <div className="p-3.5 rounded-2xl bg-slate-200/50 dark:bg-slate-950/60 border border-slate-300/80 dark:border-slate-800 text-left space-y-1">
                <div className="flex items-center space-x-2 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Armazenamento no Servidor</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  As fotos são salvas de forma segura na pasta{' '}
                  <code className="text-cyan-600 dark:text-cyan-300 font-mono font-bold bg-white/40 dark:bg-slate-900 px-1 py-0.5 rounded">
                    public/avatars
                  </code>
                  . Formatos aceitos: PNG, JPG, WEBP e SVG (máx. 5MB).
                </p>
              </div>
            </div>

            {/* Card com Metadados da Conta */}
            <div className="p-6 rounded-3xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800/80 shadow-md backdrop-blur-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Dados do Sistema
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    E-mail
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                    {profile.email}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    Perfil de Acesso
                  </span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {profile.role}
                  </span>
                </div>

                {profile.currentLocationName && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      Lotação Atual
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {profile.currentLocationName}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Criado em
                  </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna da Direita: Alteração de Nome & Alteração de Senha */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card: Nome de Exibição */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800/80 shadow-md backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Nome de Exibição
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Nome exibido na barra superior de navegação e relatórios
                  </p>
                </div>

                {!isEditingName && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="h-9 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                )}
              </div>

              {isEditingName ? (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Seu nome completo"
                    className="flex-1 h-11 px-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-cyan-500 shadow-inner"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="h-11 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingName ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Salvar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingName(false)
                        setNameInput(profile.name)
                      }}
                      className="h-11 px-4 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {profile.name}
                  </span>
                </div>
              )}
            </div>

            {/* Card: Alteração de Senha */}
            <div className="p-6 md:p-8 rounded-3xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800/80 shadow-md backdrop-blur-xl space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Alterar Senha de Acesso
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Para sua segurança, informe sua senha atual para definir uma nova senha
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Senha Atual */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Digite sua senha atual"
                      required
                      className="w-full h-11 pl-4 pr-11 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-cyan-500 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title={showCurrentPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nova Senha */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        className="w-full h-11 pl-4 pr-11 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-cyan-500 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title={showNewPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Barra de Força da Senha */}
                    {newPassword && (
                      <div className="pt-1 space-y-1">
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passStrength.color}`}
                            style={{
                              width: `${(passStrength.score / 3) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Força: <strong className="font-bold">{passStrength.text}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        required
                        className="w-full h-11 pl-4 pr-11 rounded-2xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:border-cyan-500 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        title={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {confirmPassword && confirmPassword !== newPassword && (
                      <span className="text-[10px] text-rose-500 block font-bold">
                        As senhas não coincidem.
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword}
                    className="h-11 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs transition-all shadow-md flex items-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isChangingPassword ? 'Salvando Senha...' : 'Atualizar Senha'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
