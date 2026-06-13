import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

const THEMES = [
  { id: 'classic', name: '赛璐璐', nameEn: 'Classic', description: '高饱和纯色 + 硬阴影 + 粗边框' },
  { id: 'soft-ui', name: '柔和', nameEn: 'Soft UI', description: '低饱和度 + 柔和阴影 + 圆角' },
  { id: 'retro-vintage', name: '复古', nameEn: 'Retro Vintage', description: '羊皮纸 + 琥珀棕 + 做旧纹理' },
]

const DEFAULT_THEME = 'classic'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('gualingo-theme') || DEFAULT_THEME
    } catch {
      return DEFAULT_THEME
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('gualingo-theme', theme)
    } catch {}
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
