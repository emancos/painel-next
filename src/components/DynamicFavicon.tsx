'use client'

import { useEffect } from 'react'
import { setDocumentFavicon } from '@/lib/favicon'

interface DynamicFaviconProps {
  initialIcon?: string | null
}

/**
 * Componente cliente que sincroniza e atualiza o favicon do documento no navegador.
 */
export function DynamicFavicon({ initialIcon }: DynamicFaviconProps) {
  useEffect(() => {
    if (initialIcon) {
      setDocumentFavicon(initialIcon)
    }

    // Listener para atualização do brasão em tempo real (ex: após upload na aba admin)
    const handleLogoUpdate = (event: Event) => {
      const customEvt = event as CustomEvent<{ logoUrl: string }>
      if (customEvt.detail?.logoUrl) {
        setDocumentFavicon(customEvt.detail.logoUrl)
      }
    }

    window.addEventListener('unit-logo-changed', handleLogoUpdate)
    return () => {
      window.removeEventListener('unit-logo-changed', handleLogoUpdate)
    }
  }, [initialIcon])

  return null
}
