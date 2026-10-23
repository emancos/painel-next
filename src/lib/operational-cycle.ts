/**
 * Funções utilitárias de Ciclo Operacional e Horário de Reset Diário
 */

/**
 * Calcula a data do ciclo operacional (YYYY-MM-DD) com base no fuso horário e no horário de reset diário configurado.
 * Se o horário atual for anterior ao horário de reset da unidade, a data do ciclo é o dia anterior.
 */
export function getOperationalDate(
  autoResetTime: string = '00:00',
  timeZone: string = 'America/Sao_Paulo',
  now: Date = new Date()
): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  let year = '', month = '', day = '', hour = 0, minute = 0
  for (const p of parts) {
    if (p.type === 'year') year = p.value
    if (p.type === 'month') month = p.value
    if (p.type === 'day') day = p.value
    if (p.type === 'hour') hour = parseInt(p.value, 10)
    if (p.type === 'minute') minute = parseInt(p.value, 10)
  }

  const [resetHour, resetMinute] = (autoResetTime || '00:00').split(':').map((v) => parseInt(v, 10) || 0)
  const currentMinutes = hour * 60 + minute
  const resetMinutes = resetHour * 60 + resetMinute

  const d = new Date(`${year}-${month}-${day}T12:00:00Z`)
  if (currentMinutes < resetMinutes) {
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return d.toISOString().slice(0, 10)
}

/**
 * Retorna o timestamp (Date) de início do ciclo operacional corrente
 * com base no fuso horário da unidade e no horário de reset diário configurado.
 */
export function getOperationalCycleStart(
  autoResetTime: string = '00:00',
  timeZone: string = 'America/Sao_Paulo',
  now: Date = new Date()
): Date {
  const opDate = getOperationalDate(autoResetTime, timeZone, now)
  const [resetHourStr = '00', resetMinuteStr = '00'] = (autoResetTime || '00:00').split(':')
  const resetHour = resetHourStr.padStart(2, '0')
  const resetMinute = resetMinuteStr.padStart(2, '0')

  const isoLocal = `${opDate}T${resetHour}:${resetMinute}:00`
  const tempDate = new Date(`${isoLocal}Z`)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(tempDate)
  let y = 0, m = 0, d = 0, h = 0, min = 0, s = 0
  for (const p of parts) {
    if (p.type === 'year') y = parseInt(p.value, 10)
    if (p.type === 'month') m = parseInt(p.value, 10)
    if (p.type === 'day') d = parseInt(p.value, 10)
    if (p.type === 'hour') h = parseInt(p.value, 10)
    if (p.type === 'minute') min = parseInt(p.value, 10)
    if (p.type === 'second') s = parseInt(p.value, 10)
  }

  const localizedAsUtc = Date.UTC(y, m - 1, d, h, min, s)
  const offsetMs = localizedAsUtc - tempDate.getTime()
  return new Date(tempDate.getTime() - offsetMs)
}
