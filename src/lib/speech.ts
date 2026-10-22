/**
 * Gerenciador de Áudio e Síntese de Voz para o Painel de Chamadas.
 * - Toca Ding-Dong/Chime sintetizado via Web Audio API (sem dependência de arquivos externos).
 * - Executa Edge-TTS via rota `/api/tts` com voz neural realista.
 * - Faz fallback transparente para a Web Speech API nativa se a rede estiver instável.
 * - Mantém fila para evitar sobreposição de chamadas.
 */

class SpeechQueueManager {
  private queue: Array<{ text: string; ssml?: string; voice?: string; rate?: string; pitch?: string }> = []
  private isPlaying = false
  private audioCtx: AudioContext | null = null
  private isUnlocked = false

  public unlockAudio() {
    if (typeof window === 'undefined') return
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    this.isUnlocked = true
  }

  /**
   * Toca um chime agradável de chamada utilizando síntese harmônica da Web Audio API.
   */
  public async playChime(): Promise<void> {
    if (typeof window === 'undefined') return
    this.unlockAudio()
    if (!this.audioCtx) return

    const now = this.audioCtx.currentTime

    // Frequências para tom bifônico agradável (Acorde Dó Maior C5 -> E5 -> G5)
    const tones = [
      { freq: 523.25, start: 0, duration: 0.35, gain: 0.25 }, // C5
      { freq: 659.25, start: 0.18, duration: 0.45, gain: 0.3 }, // E5
      { freq: 783.99, start: 0.36, duration: 0.7, gain: 0.35 },  // G5
    ]

    tones.forEach(({ freq, start, duration, gain }) => {
      const osc = this.audioCtx!.createOscillator()
      const gainNode = this.audioCtx!.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)

      gainNode.gain.setValueAtTime(0.001, now + start)
      gainNode.gain.exponentialRampToValueAtTime(gain, now + start + 0.04)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration)

      osc.connect(gainNode)
      gainNode.connect(this.audioCtx!.destination)

      osc.start(now + start)
      osc.stop(now + start + duration)
    })

    // Aguarda o término do som do gongo antes de iniciar a fala
    return new Promise((resolve) => setTimeout(resolve, 850))
  }

  /**
   * Executa diretamente o Chime e a Fala para uma senha e retorna uma Promise
   * que resolve assim que o áudio for completamente finalizado.
   */
  public async playAnnouncement(item: { text: string; ssml?: string; voice?: string; rate?: string; pitch?: string }): Promise<void> {
    try {
      // 1. Toca o Chime
      await this.playChime()

      // 2. Tenta sintetizar via Edge-TTS (/api/tts)
      const playedEdgeTts = await this.playEdgeTTS(item.text, item.voice, item.rate, item.pitch)

      if (!playedEdgeTts) {
        // 3. Fallback para Web Speech API nativa se o Edge-TTS falhar
        console.warn('[Audio] Edge-TTS indisponível, acionando fallback Web Speech API.')
        await this.playWebSpeech(item.text, item.voice, item.rate, item.pitch)
      }
    } catch (err) {
      console.warn('[Audio] Erro ao reproduzir chamada, tentando fallback:', err)
      await this.playWebSpeech(item.text, item.voice, item.rate, item.pitch)
    }
  }

  /**
   * Enfileira uma mensagem de chamada e processa sequencialmente.
   */
  public enqueue(item: { text: string; ssml?: string; voice?: string; rate?: string; pitch?: string }) {
    this.queue.push(item)
    if (!this.isPlaying) {
      this.processNext()
    }
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false
      return
    }

    this.isPlaying = true
    const current = this.queue.shift()!

    try {
      // 1. Toca o Chime
      await this.playChime()

      // 2. Tenta sintetizar via Edge-TTS (/api/tts)
      const playedEdgeTts = await this.playEdgeTTS(current.text, current.voice, current.rate, current.pitch)

      if (!playedEdgeTts) {
        // 3. Fallback para Web Speech API nativa se o Edge-TTS falhar
        console.warn('[Audio] Edge-TTS indisponível, acionando fallback Web Speech API.')
        await this.playWebSpeech(current.text, current.voice, current.rate, current.pitch)
      }
    } catch (err) {
      console.warn('[Audio] Erro ao reproduzir chamada, tentando fallback:', err)
      await this.playWebSpeech(current.text, current.voice, current.rate, current.pitch)
    } finally {
      // Pausa curta entre chamadas consecutivas
      setTimeout(() => this.processNext(), 400)
    }
  }

  private async playEdgeTTS(text: string, voice?: string, rate?: string, pitch?: string): Promise<boolean> {
    try {
      console.log('[Audio] Sintetizando Edge-TTS:', { voice, rate, pitch, text })
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: voice || 'pt-BR-FranciscaNeural',
          rate: rate || '+0%',
          pitch: pitch || '+0Hz',
        }),
      })

      if (!response.ok) {
        console.warn('[Audio] /api/tts retornou status:', response.status)
        return false
      }

      // Método 1: Tenta tocar via Web Audio API (imune a autoplay blocker e sem latência)
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        try {
          if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume()
          }
          const arrayBuffer = await response.arrayBuffer()
          if (arrayBuffer.byteLength > 100) {
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer)
            return new Promise<boolean>((resolve) => {
              const source = this.audioCtx!.createBufferSource()
              source.buffer = audioBuffer
              source.connect(this.audioCtx!.destination)
              source.onended = () => resolve(true)
              source.start(0)
            })
          }
        } catch (ctxErr) {
          console.warn('[Audio] Erro ao tocar via Web Audio API, tentando HTML5 Audio fallback:', ctxErr)
        }
      }

      // Método 2: Fallback para elemento Audio HTML5 clássico
      const blob = await response.blob()
      if (blob.size < 100) return false

      const audioUrl = URL.createObjectURL(blob)
      const audio = new Audio(audioUrl)

      return new Promise<boolean>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve(true)
        }
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          resolve(false)
        }
        audio.play().catch((playErr) => {
          console.warn('[Audio] Erro no audio.play():', playErr)
          URL.revokeObjectURL(audioUrl)
          resolve(false)
        })
      })
    } catch (err) {
      console.warn('[Audio] Falha na chamada Edge-TTS:', err)
      return false
    }
  }

  private playWebSpeech(text: string, voice?: string, rate?: string, pitch?: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return resolve()
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'pt-BR'

      if (rate) {
        const val = parseInt(rate.replace('%', ''), 10)
        if (!isNaN(val)) {
          utterance.rate = Math.max(0.5, Math.min(2.0, 1 + val / 100))
        }
      }

      if (pitch) {
        const val = parseInt(pitch.replace('Hz', ''), 10)
        if (!isNaN(val)) {
          utterance.pitch = Math.max(0.5, Math.min(2.0, 1 + val / 50))
        }
      }

      // Procura voz feminina ou masculina instalada no sistema compatível
      const voices = window.speechSynthesis.getVoices()
      const ptVoices = voices.filter((v) => v.lang === 'pt-BR' || v.lang === 'pt_BR' || v.lang.startsWith('pt'))
      const isMale = voice?.includes('Antonio') || voice?.includes('Donato') || voice?.includes('Fabio') || voice?.includes('Humberto') || voice?.includes('Julio') || voice?.includes('Nicolau') || voice?.includes('Valerio')

      const matchingVoice = ptVoices.find((v) => {
        const n = v.name.toLowerCase()
        return isMale ? (n.includes('male') || n.includes('homem') || n.includes('ricardo')) : (!n.includes('male') && !n.includes('homem'))
      }) || ptVoices[0]

      if (matchingVoice) {
        utterance.voice = matchingVoice
      }

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      window.speechSynthesis.speak(utterance)
    })
  }
}

// Instância singleton no cliente
export const speechManager = new SpeechQueueManager()
