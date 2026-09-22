import { create } from 'zustand'

export interface SettingsState {
  vimMode: boolean
  theme: 'dark' | 'light'
  syncScroll: boolean
  autoSave: boolean
  fontSize: number
  wordWrap: boolean
  toggleVimMode: () => void
  toggleTheme: () => void
  toggleSyncScroll: () => void
  toggleAutoSave: () => void
  setFontSize: (size: number) => void
  toggleWordWrap: () => void
}

const SETTINGS_KEY = 'markflow_settings_v1'

const loadInitialSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // fallback
  }
  return {
    vimMode: false,
    theme: 'dark' as const,
    syncScroll: true,
    autoSave: true,
    fontSize: 14,
    wordWrap: true,
  }
}

export const useSettingsStore = create<SettingsState>((set) => {
  const initial = loadInitialSettings()

  return {
    ...initial,
    toggleVimMode: () =>
      set((state) => {
        const next = !state.vimMode
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, vimMode: next }))
        return { vimMode: next }
      }),
    toggleTheme: () =>
      set((state) => {
        const next = state.theme === 'dark' ? 'light' : 'dark'
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, theme: next }))
        return { theme: next }
      }),
    toggleSyncScroll: () =>
      set((state) => {
        const next = !state.syncScroll
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, syncScroll: next }))
        return { syncScroll: next }
      }),
    toggleAutoSave: () =>
      set((state) => {
        const next = !state.autoSave
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, autoSave: next }))
        return { autoSave: next }
      }),
    setFontSize: (fontSize: number) =>
      set((state) => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, fontSize }))
        return { fontSize }
      }),
    toggleWordWrap: () =>
      set((state) => {
        const next = !state.wordWrap
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, wordWrap: next }))
        return { wordWrap: next }
      }),
  }
})
