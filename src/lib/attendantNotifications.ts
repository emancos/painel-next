/**
 * Sistema de Notificações Visuais e Sonoras para o Painel do Atendente.
 * - Compatível 100% com Windows e Linux via Web Audio API e Web Notification API.
 * - Síntese de áudio harmônico puro (sem necessidade de arquivos .mp3/.wav externos).
 * - Desbloqueio e ativação automática respeitando a política de Autoplay dos navegadores.
 * - Suporte a notificações nativas do sistema operacional (Central de Ações do Windows e Daemon de Notificações do Linux).
 */

export type SoundType = 'chime' | 'bell' | 'soft' | 'urgent'

export interface AttendantNotificationSettings {
  soundEnabled: boolean
  visualEnabled: boolean
  soundType: SoundType
  volume: number // 0.1 a 1.0
  notifyOnlyEligibleServices: boolean
}

export interface IssuedTicketNotificationData {
  ticketId: string
  formattedTicket: string
  ticketPrefix?: string
  ticketNumber?: number
  serviceId: string
  serviceName: string
  priorityId: number
  priorityName: string
  priorityColor?: string
  customerName?: string | null
  createdAt?: Date | string
}

const STORAGE_KEY = 'atendimento_notification_settings_v1'

const DEFAULT_SETTINGS: AttendantNotificationSettings = {
  soundEnabled: true,
  visualEnabled: true,
  soundType: 'chime',
  volume: 0.7,
  notifyOnlyEligibleServices: false,
}

class AttendantNotificationManager {
  private audioCtx: AudioContext | null = null
  private isUnlocked = false
  private listenersAttached = false
  private stateChangeListeners: Array<(isReady: boolean) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      this.attachAutoUnlockListeners()
    }
  }

  /**
   * Obtém as configurações salvas no localStorage ou valores padrão.
   */
  public getSettings(): AttendantNotificationSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      }
    } catch (err) {
      console.warn('[NotificationManager] Erro ao carregar configurações:', err)
    }
    return DEFAULT_SETTINGS
  }

  /**
   * Salva configurações no localStorage.
   */
  public saveSettings(settings: Partial<AttendantNotificationSettings>): AttendantNotificationSettings {
    const updated = { ...this.getSettings(), ...settings }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (err) {
        console.warn('[NotificationManager] Erro ao salvar configurações:', err)
      }
    }
    return updated
  }

  /**
   * Inicializa o AudioContext se ainda não existir.
   */
  private getOrCreateAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass()
      }
    }
    return this.audioCtx
  }

  /**
   * Anexa listeners na janela para ativar o som no primeiro gesto do usuário (Autoplay policy).
   */
  private attachAutoUnlockListeners() {
    if (this.listenersAttached || typeof window === 'undefined') return
    this.listenersAttached = true

    const unlockHandler = () => {
      this.unlockAudio()
      window.removeEventListener('pointerdown', unlockHandler, true)
      window.removeEventListener('keydown', unlockHandler, true)
      window.removeEventListener('click', unlockHandler, true)
      window.removeEventListener('touchstart', unlockHandler, true)
    }

    window.addEventListener('pointerdown', unlockHandler, { capture: true, once: true })
    window.addEventListener('keydown', unlockHandler, { capture: true, once: true })
    window.addEventListener('click', unlockHandler, { capture: true, once: true })
    window.addEventListener('touchstart', unlockHandler, { capture: true, once: true })

    // Tenta inicialização automática imediata caso o navegador já tenha concedido autoplay
    this.tryAutoUnlock()
  }

  /**
   * Tenta desbloquear o áudio imediatamente ou retornar o status atual.
   */
  public tryAutoUnlock(): boolean {
    const ctx = this.getOrCreateAudioContext()
    if (!ctx) return false

    if (ctx.state === 'running') {
      this.isUnlocked = true
      this.notifyState(true)
      return true
    }

    ctx
      .resume()
      .then(() => {
        if (ctx.state === 'running') {
          this.isUnlocked = true
          this.notifyState(true)
        }
      })
      .catch(() => {
        // Bloqueado pelo navegador até o primeiro clique
      })

    return this.isUnlocked
  }

  /**
   * Desbloqueia o áudio ativamente após um clique ou evento de usuário.
   */
  public unlockAudio(): Promise<boolean> {
    const ctx = this.getOrCreateAudioContext()
    if (!ctx) return Promise.resolve(false)

    if (ctx.state === 'suspended') {
      return ctx
        .resume()
        .then(() => {
          this.isUnlocked = ctx.state === 'running'
          this.notifyState(this.isUnlocked)
          return this.isUnlocked
        })
        .catch(() => false)
    }

    this.isUnlocked = true
    this.notifyState(true)
    return Promise.resolve(true)
  }

  /**
   * Retorna se o áudio está completamente desbloqueado e apto a reproduzir sons.
   */
  public isAudioReady(): boolean {
    if (!this.audioCtx) return false
    return this.audioCtx.state === 'running'
  }

  /**
   * Registra um listener para quando o áudio for liberado pelo navegador.
   */
  public onAudioStateChange(listener: (isReady: boolean) => void): () => void {
    this.stateChangeListeners.push(listener)
    listener(this.isAudioReady())
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener)
    }
  }

  private notifyState(isReady: boolean) {
    this.stateChangeListeners.forEach((l) => l(isReady))
  }

  /**
   * Reproduz um efeito sonoro sintetizado via Web Audio API.
   * Funciona igualmente em Windows (DirectSound/WASAPI) e Linux (PulseAudio/PipeWire/ALSA).
   */
  public playTicketSound(type: SoundType = 'chime', customVolume?: number): void {
    if (typeof window === 'undefined') return
    const settings = this.getSettings()
    if (!settings.soundEnabled && customVolume === undefined) return

    const volume = customVolume !== undefined ? customVolume : settings.volume
    if (volume <= 0) return

    const ctx = this.getOrCreateAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Definição dos perfis de som
    switch (type) {
      case 'bell': {
        // Ding-Dong tradicional suave (A5 880Hz -> F5 698Hz)
        const notes = [
          { freq: 880, start: 0, duration: 0.45, gain: 0.35 * volume },
          { freq: 698.46, start: 0.22, duration: 0.65, gain: 0.4 * volume },
        ]
        this.synthesizeNotes(ctx, notes, now)
        break
      }

      case 'soft': {
        // Pulso harmônico discreto para consultórios (Fá 349Hz -> Lá 440Hz)
        const notes = [
          { freq: 349.23, start: 0, duration: 0.3, gain: 0.25 * volume },
          { freq: 440.0, start: 0.15, duration: 0.5, gain: 0.3 * volume },
        ]
        this.synthesizeNotes(ctx, notes, now)
        break
      }

      case 'urgent': {
        // Alerta tríplice para senhas de prioridade especial / 80+ / urgência
        const notes = [
          { freq: 587.33, start: 0, duration: 0.22, gain: 0.3 * volume }, // D5
          { freq: 739.99, start: 0.12, duration: 0.25, gain: 0.35 * volume }, // F#5
          { freq: 880.0, start: 0.26, duration: 0.6, gain: 0.4 * volume },  // A5
        ]
        this.synthesizeNotes(ctx, notes, now)
        break
      }

      case 'chime':
      default: {
        // Chime tubular hospitalar moderno (Dó Maior E5 -> B5 -> G#5)
        const notes = [
          { freq: 659.25, start: 0, duration: 0.35, gain: 0.28 * volume }, // E5
          { freq: 830.61, start: 0.18, duration: 0.35, gain: 0.32 * volume }, // G#5
          { freq: 987.77, start: 0.35, duration: 0.65, gain: 0.38 * volume }, // B5
        ]
        this.synthesizeNotes(ctx, notes, now)
        break
      }
    }
  }

  /**
   * Gera osciladores senoidais com curva de envelope exponencial natural (ADSR suave).
   */
  private synthesizeNotes(
    ctx: AudioContext,
    notes: Array<{ freq: number; start: number; duration: number; gain: number }>,
    baseTime: number
  ) {
    notes.forEach(({ freq, start, duration, gain }) => {
      const osc = ctx.createOscillator()
      const gainNode = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, baseTime + start)

      // Envelope ADSR: Attack rápido e Decay exponencial suave para soar acústico
      gainNode.gain.setValueAtTime(0.0001, baseTime + start)
      gainNode.gain.exponentialRampToValueAtTime(gain, baseTime + start + 0.03)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, baseTime + start + duration)

      osc.connect(gainNode)
      gainNode.connect(ctx.destination)

      osc.start(baseTime + start)
      osc.stop(baseTime + start + duration)
    })
  }

  /**
   * Toca um som de teste com as configurações atuais.
   */
  public playTestSound(type?: SoundType, volume?: number) {
    this.unlockAudio().then(() => {
      const settings = this.getSettings()
      this.playTicketSound(type || settings.soundType, volume !== undefined ? volume : settings.volume)
    })
  }

  /**
   * Dispara notificação nativa da área de trabalho (Desktop Notification)
   * Integrada ao Windows Action Center e ao Notification Daemon do Linux.
   */
  public async showDesktopNotification(ticket: IssuedTicketNotificationData): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return

    const settings = this.getSettings()
    if (!settings.visualEnabled) return

    if (Notification.permission === 'granted') {
      try {
        const title = `🔔 Nova Senha: ${ticket.formattedTicket}`
        const body = `${ticket.serviceName} • ${ticket.priorityName}${
          ticket.customerName ? ` (${ticket.customerName})` : ''
        }`

        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `ticket-${ticket.ticketId}`,
          silent: true, // Já tocamos o som customizado Web Audio
        })

        notification.onclick = () => {
          window.focus()
          notification.close()
        }

        setTimeout(() => notification.close(), 6000)
      } catch (err) {
        console.warn('[NotificationManager] Falha ao exibir notificação desktop:', err)
      }
    }
  }

  /**
   * Solicita permissão para notificações do sistema operacional.
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }
    try {
      const result = await Notification.requestPermission()
      return result
    } catch {
      return 'denied'
    }
  }

  /**
   * Retorna o status da permissão de notificações do sistema operacional.
   */
  public getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.permission
  }
}

export const attendantNotificationManager = new AttendantNotificationManager()
