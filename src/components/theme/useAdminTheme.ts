'use client'

import { useEffect, useState } from 'react'

export function useAdminTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('admin_theme')
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
    }

    const handler = (e: any) => {
      if (e.detail === 'light' || e.detail === 'dark') {
        setTheme(e.detail)
      }
    }

    window.addEventListener('admin-theme-changed', handler)
    return () => window.removeEventListener('admin-theme-changed', handler)
  }, [])

  return { theme, isLight: theme === 'light' }
}
