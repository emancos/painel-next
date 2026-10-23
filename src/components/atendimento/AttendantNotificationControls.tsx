'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  Laptop,
  Check
} from 'lucide-react'
import {
  attendantNotificationManager,
  AttendantNotificationSettings,
  SoundType
} from '@/lib/attendantNotifications'

interface Props {
  eligibleServicesCount?: number
}

export function AttendantNotificationControls({ eligibleServicesCount = 0 }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<AttendantNotificationSettings>(() =>
    attendantNotificationManager.getSettings()
  )
  const [isAudioReady, setIsAudioReady] = useState(false)
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [justTested, setJustTested] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Sincroniza configurações iniciais
    setSettings(attendantNotificationManager.getSettings())
    setDesktopPermission(attendantNotificationManager.getNotificationPermission())

    // Observa o estado do áudio no navegador (Autoplay)
    const unsubscribe = attendantNotificationManager.onAudioStateChange((ready) => {
      setIsAudioReady(ready)
    })

    // Fecha ao clicar fora
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      unsubscribe()
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const handleToggleSound = () => {
    const next = !settings.soundEnabled
    const updated = attendantNotificationManager.saveSettings({ soundEnabled: next })
    setSettings(updated)
    if (next) {
      attendantNotificationManager.unlockAudio()
    }
  }

  const handleToggleVisual = () => {
    const next = !settings.visualEnabled
    const updated = attendantNotificationManager.saveSettings({ visualEnabled: next })
    setSettings(updated)
  }

  const handleToggleFilterServices = () => {
    const next = !settings.notifyOnlyEligibleServices
    const updated = attendantNotificationManager.saveSettings({ notifyOnlyEligibleServices: next })
    setSettings(updated)
  }

  const handleChangeSoundType = (soundType: SoundType) => {
    const updated = attendantNotificationManager.saveSettings({ soundType })
    setSettings(updated)
    attendantNotificationManager.playTestSound(soundType, updated.volume)
  }

  const handleChangeVolume = (volume: number) => {
    const updated = attendantNotificationManager.saveSettings({ volume })
    setSettings(updated)
  }

  const handleTestSound = () => {
    setJustTested(true)
    attendantNotificationManager.playTestSound(settings.soundType, settings.volume)
    setTimeout(() => setJustTested(false), 1200)
  }

  const handleRequestDesktopPermission = async () => {
    const res = await attendantNotificationManager.requestNotificationPermission()
    setDesktopPermission(res)
  }

  const handleUnlockAudioDirectly = async () => {
    await attendantNotificationManager.unlockAudio()
    setIsAudioReady(attendantNotificationManager.isAudioReady())
    attendantNotificationManager.playTestSound(settings.soundType, settings.volume)
  }

  return (
    <div className="relative inline-block z-40" ref={dropdownRef}>
      {/* Botão Gatilho no Cabeçalho */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-11 px-3.5 rounded-2xl border transition-all flex items-center space-x-2 text-xs font-bold shadow-xs active:scale-95 cursor-pointer ${
          settings.soundEnabled || settings.visualEnabled
            ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-800 dark:text-cyan-300 border-cyan-500/35'
            : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
        title="Configurações de Notificação Sonora e Visual ao Emitir Senha"
      >
        <div className="relative">
          {settings.soundEnabled ? (
            <Bell className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <BellOff className="w-4 h-4 text-slate-400" />
          )}

          {/* Indicador de Status do Som */}
          {settings.soundEnabled && (
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                isAudioReady ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
              }`}
            />
          )}
        </div>

        <span className="hidden sm:inline">
          {settings.soundEnabled ? 'Alertas Ativos' : 'Alertas Silenciados'}
        </span>
      </button>

      {/* Popover de Configurações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 p-5 shadow-2xl z-[100] ring-1 ring-black/5 dark:ring-white/10 animate-scale-in text-slate-900 dark:text-slate-100 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">Alertas de Novas Senhas</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Notificações para o posto de trabalho</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSound}
              disabled={justTested}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              title="Testar áudio agora"
            >
              <Play className="w-3 h-3 text-cyan-500 fill-cyan-500" />
              <span>{justTested ? 'Tocando...' : 'Testar'}</span>
            </button>
          </div>

          {/* Banner de Estado do Autoplay do Navegador */}
          {!isAudioReady && settings.soundEnabled && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 flex items-start justify-between gap-2.5 animate-pulse">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                  Autoplay Pendente no Navegador
                </span>
                <p className="text-[11px] text-amber-800 dark:text-amber-400/90 leading-tight">
                  Clique no botão ao lado ou em qualquer ponto da tela para liberar o áudio automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUnlockAudioDirectly}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] shrink-0 shadow-xs cursor-pointer transition-all"
              >
                Ativar Som
              </button>
            </div>
          )}

          {/* 1. Alerta Sonoro */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl ${settings.soundEnabled ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Alerta Sonoro (Bip/Chime)</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Toca áudio puro sintetizado ao emitir</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={handleToggleSound}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Opções de Som e Volume (se ativado) */}
          {settings.soundEnabled && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 animate-fade-in">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1.5">
                  Estilo do Som
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'chime', label: 'Chime' },
                    { id: 'bell', label: 'Ding-Dong' },
                    { id: 'soft', label: 'Suave' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleChangeSoundType(s.id as SoundType)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        settings.soundType === s.id
                          ? 'bg-cyan-500 text-white shadow-xs font-black'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  <span>Volume do Alerta</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">{Math.round(settings.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.volume}
                  onChange={(e) => handleChangeVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 2. Alerta Visual (Toast + Notificações do Sistema) */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl ${settings.visualEnabled ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Banner Visual no Painel</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Card com dados da senha no topo da tela</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.visualEnabled}
                onChange={handleToggleVisual}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>

          {/* Notificação Desktop (Windows & Linux) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Laptop className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">Notificações no Windows & Linux</span>
              </div>

              {desktopPermission === 'granted' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Habilitado
                </span>
              ) : desktopPermission === 'denied' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold">
                  Bloqueado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestDesktopPermission}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-[10px] shadow-xs cursor-pointer transition-all"
                >
                  Permitir no Sistema
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Avisa mesmo com o navegador minimizado ou quando estiver em outra aba de atendimento.
            </p>
          </div>

          {/* 3. Filtro de Serviços */}
          {eligibleServicesCount > 0 && (
            <div className="flex items-start justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Filtrar por Serviços deste Guichê
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  {settings.notifyOnlyEligibleServices
                    ? 'Tocando apenas senhas elegíveis para seu posto.'
                    : 'Tocando para qualquer nova senha emitida na unidade.'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={settings.notifyOnlyEligibleServices}
                  onChange={handleToggleFilterServices}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
