/**
 * Módulo de Naturalização da Fala (Speech Normalizer)
 * Responsável por converter senhas, guichês e nomes de clientes em fala fluida,
 * cadenciada e natural para síntese de voz (SSML para Edge-TTS e texto para Web Speech API).
 */

export interface SpeechTicketInput {
  ticketPrefix: string
  ticketNumber: number
  formattedTicket: string
  locationName?: string
  locationNumber?: number
  floorName?: string | null
  roomName?: string | null
  customerName?: string | null
  priorityName?: string
}

export interface SpeechConfigOptions {
  voice?: string // 'pt-BR-FranciscaNeural', 'pt-BR-AntonioNeural', 'pt-BR-ThalitaNeural', etc.
  rate?: string // '+0%', '+10%', '-10%'
  pitch?: string // '+0Hz', '+15Hz', '-15Hz'
  callPrefix?: string // 'Senha', 'Chamando senha', 'Atenção: Senha'
  callSuffix?: string // 'Favor comparecer', 'Dirija-se', 'Por gentileza, dirija-se'
  pauseDuration?: string // '200ms', '350ms', '500ms'
  includeCustomerName?: boolean
  lgpdMode?: boolean
}

export interface SpeechOutput {
  plainText: string
  ssml: string
  voice: string
  rate: string
  pitch: string
}

// Números por extenso em português para fala natural
const NUMBER_WORDS: Record<number, string> = {
  0: 'zero',
  1: 'um',
  2: 'dois',
  3: 'três',
  4: 'quatro',
  5: 'cinco',
  6: 'seis',
  7: 'sete',
  8: 'oito',
  9: 'nove',
  10: 'dez',
  11: 'onze',
  12: 'doze',
  13: 'treze',
  14: 'quatorze',
  15: 'quinze',
  16: 'dezesseis',
  17: 'dezessete',
  18: 'dezoito',
  19: 'dezenove',
  20: 'vinte',
}

const PREPOSITIONS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/**
 * Normaliza o nome do cliente para fala limpa e respeitosa.
 * Ex: "MARIA DA SILVA SANTOS" -> "Maria da Silva Santos"
 * @param name Nome bruto
 * @param lgpdMode Se true, anonimiza para "Maria S."
 */
export function naturalizeCustomerName(name?: string | null, lgpdMode = false): string {
  if (!name || !name.trim()) return ''

  const cleaned = name
    .trim()
    .replace(/[^a-zA-ZÀ-ÿ\s'-]/g, ' ')
    .replace(/\s+/g, ' ')

  const words = cleaned.toLowerCase().split(' ')
  if (words.length === 0) return ''

  if (lgpdMode) {
    const firstName = capitalizeWord(words[0])
    if (words.length > 1) {
      const lastInitial = words[words.length - 1][0]?.toUpperCase()
      return lastInitial ? `${firstName} ${lastInitial}.` : firstName
    }
    return firstName
  }

  const formattedWords = words.map((w, index) => {
    if (index > 0 && PREPOSITIONS.has(w)) {
      return w
    }
    return capitalizeWord(w)
  })

  return formattedWords.join(' ')
}

function capitalizeWord(word: string): string {
  if (!word) return ''
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * Converte um número em cadência falada dígito a dígito ou número ordinal/cardinal
 * Ex: 3 -> "três", 12 -> "doze", ou "003" -> "zero, zero, três"
 */
export function spellOutNumber(num: number, padLength = 3): string {
  const padded = num.toString().padStart(padLength, '0')
  return padded
    .split('')
    .map((digit) => NUMBER_WORDS[parseInt(digit, 10)] ?? digit)
    .join(', ')
}

/**
 * Formata o local de atendimento com a preposição correta
 * Ex: "Guichê", 3 -> "no Guichê três"
 * Ex: "Sala", 5 -> "na Sala cinco"
 * Ex: "Mesa", 2 -> "na Mesa dois"
 */
export function naturalizeLocation(locationName?: string, locationNumber?: number): { spoken: string; prep: string } {
  if (!locationName || locationNumber === undefined) {
    return { spoken: '', prep: '' }
  }

  const nameLower = locationName.trim().toLowerCase()
  const isFeminine = nameLower.endsWith('a') || nameLower.includes('sala') || nameLower.includes('mesa')
  const prep = isFeminine ? 'na' : 'no'

  const numText = NUMBER_WORDS[locationNumber] ?? locationNumber.toString()
  return {
    spoken: `${locationName.trim()} ${numText}`,
    prep
  }
}

/**
 * Formata o destino de atendimento em cascata (Andar -> Sala -> Posto/Mesa)
 */
export function formatLocationCascade(
  floorName?: string | null,
  roomName?: string | null,
  locationName?: string | null,
  locationNumber?: number | null
): { formatted: string; place: string; short: string } {
  const place = locationName && locationNumber !== null && locationNumber !== undefined
    ? `${locationName} ${locationNumber.toString().padStart(2, '0')}`
    : 'Guichê 01'
  const short = locationNumber !== null && locationNumber !== undefined
    ? locationNumber.toString().padStart(2, '0')
    : '01'

  const parts: string[] = []
  if (floorName?.trim()) parts.push(floorName.trim())
  if (roomName?.trim()) parts.push(roomName.trim())
  parts.push(place)

  return {
    formatted: parts.join(' • '),
    place,
    short,
  }
}

/**
 * Constrói as mensagens de áudio naturalizadas (SSML e Plain Text)
 */
export function buildTicketAnnouncement(
  input: SpeechTicketInput,
  options?: SpeechConfigOptions
): SpeechOutput {
  const voice = options?.voice === 'pt-BR-ThalitaNeural' ? 'pt-BR-ThalitaMultilingualNeural' : (options?.voice || 'pt-BR-FranciscaNeural')
  const rate = options?.rate || '+0%'
  const pitch = options?.pitch || '+0Hz'
  const callPrefix = options?.callPrefix || 'Senha'
  const callSuffix = options?.callSuffix || 'Favor comparecer'
  const pauseDuration = options?.pauseDuration || '300ms'
  const includeName = options?.includeCustomerName ?? true
  const lgpd = options?.lgpdMode ?? false

  const customerName = naturalizeCustomerName(input.customerName, lgpd)
  const digitsSpoken = spellOutNumber(input.ticketNumber, 3)
  const prefix = input.ticketPrefix.toUpperCase().trim()

  const loc = naturalizeLocation(input.locationName, input.locationNumber)

  // Monta localização em cascata objetiva: Andar -> Sala -> Posto/Mesa
  const cascadeParts: string[] = []
  if (input.floorName && input.floorName.trim()) {
    cascadeParts.push(input.floorName.trim())
  }
  if (input.roomName && input.roomName.trim()) {
    cascadeParts.push(input.roomName.trim())
  }
  if (loc.spoken) {
    cascadeParts.push(loc.spoken)
  }
  const destinationText = cascadeParts.join(', ')

  // 1. Plain Text para Web Speech API (objetivo e em cascata)
  let plain = ''
  if (customerName && includeName) {
    plain += `${customerName}: `
  }
  plain += `${callPrefix} `
  if (prefix) {
    plain += `${prefix.split('').join(' ')}, `
  }
  plain += `${digitsSpoken}. `
  if (destinationText) {
    plain += `${destinationText}.`
  }

  // 2. SSML estruturado com cadência, breaks e ênfase para Edge-TTS
  let ssmlContent = ''

  if (customerName && includeName) {
    ssmlContent += `<emphasis level="moderate">${customerName}</emphasis>: `
    ssmlContent += `<break time="${pauseDuration}"/> `
  }

  ssmlContent += `${callPrefix} `
  if (prefix) {
    ssmlContent += `<say-as interpret-as="characters">${prefix}</say-as> `
  }

  ssmlContent += `<break time="150ms"/> `
  ssmlContent += `<prosody rate="-5%">${digitsSpoken}</prosody>. `

  if (destinationText) {
    ssmlContent += `<break time="${pauseDuration}"/> `
    ssmlContent += `<emphasis level="moderate">${destinationText}</emphasis>.`
  }

  const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="pt-BR">
  <voice name="${voice}">
    <prosody rate="${rate}" pitch="${pitch}">
      ${ssmlContent}
    </prosody>
  </voice>
</speak>
`.trim()

  return {
    plainText: plain.trim(),
    ssml,
    voice,
    rate,
    pitch,
  }
}
