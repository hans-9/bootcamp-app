import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getSettings, updateSettings } from './api.js'

// Used until the server responds, and as a fallback if the fetch fails.
const DEFAULTS = {
  theme: 'system',
  default_severity_for_new_bugs: 'Minor',
  default_page_size: 20,
  timezone: '',
  auto_generate_report_after_run: true,
}

const SettingsContext = createContext(null)

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}

function applyTheme(theme) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme
  document.documentElement.setAttribute('data-theme', resolved)
  // Cache the raw preference so the pre-paint script in index.html can apply it
  // on the next load before React mounts.
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // Ignore — caching is a progressive enhancement, not required for correctness.
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme])

  const save = useCallback(async (payload) => {
    const updated = await updateSettings(payload)
    setSettings(updated)
    return updated
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, save }}>
      {children}
    </SettingsContext.Provider>
  )
}
