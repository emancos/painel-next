export const DEFAULT_FAVICON = '/favicon.svg'

/**
 * Atualiza o favicon dinamicamente no DOM do navegador em tempo de execução no cliente.
 */
export function setDocumentFavicon(iconUrl?: string | null) {
  if (typeof document === 'undefined') return

  const targetUrl = iconUrl && iconUrl.trim() ? iconUrl.trim() : DEFAULT_FAVICON

  // 1. Atualiza ou cria link rel="icon"
  let iconLink: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
  if (!iconLink) {
    iconLink = document.createElement('link')
    iconLink.rel = 'icon'
    document.head.appendChild(iconLink)
  }

  // Define o MIME type correto conforme extensão
  if (targetUrl.endsWith('.svg')) {
    iconLink.type = 'image/svg+xml'
  } else if (targetUrl.endsWith('.png')) {
    iconLink.type = 'image/png'
  } else if (targetUrl.endsWith('.jpg') || targetUrl.endsWith('.jpeg')) {
    iconLink.type = 'image/jpeg'
  } else if (targetUrl.endsWith('.webp')) {
    iconLink.type = 'image/webp'
  } else {
    iconLink.type = 'image/x-icon'
  }

  iconLink.href = targetUrl

  // 2. Atualiza ou cria link rel="apple-touch-icon"
  let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']")
  if (!appleLink) {
    appleLink = document.createElement('link')
    appleLink.rel = 'apple-touch-icon'
    document.head.appendChild(appleLink)
  }
  appleLink.href = targetUrl
}
