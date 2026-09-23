import { create } from 'zustand'

export interface SettingsState {
  vimMode: boolean
  theme: 'dark' | 'light'
  syncScroll: boolean
  autoSave: boolean
  fontSize: number
  wordWrap: boolean
  zoomLevel: number
  toggleVimMode: () => void
  toggleTheme: () => void
  toggleSyncScroll: () => void
  toggleAutoSave: () => void
  setFontSize: (size: number) => void
  toggleWordWrap: () => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setZoomLevel: (level: number) => void
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
    zoomLevel: 100,
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
        const clamped = Math.max(10, Math.min(32, fontSize))
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, fontSize: clamped }))
        return { fontSize: clamped }
      }),
    toggleWordWrap: () =>
      set((state) => {
        const next = !state.wordWrap
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, wordWrap: next }))
        return { wordWrap: next }
      }),
    zoomIn: () =>
      set((state) => {
        const next = Math.min(200, (state.zoomLevel ?? 100) + 10)
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, zoomLevel: next }))
        return { zoomLevel: next }
      }),
    zoomOut: () =>
      set((state) => {
        const next = Math.max(70, (state.zoomLevel ?? 100) - 10)
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, zoomLevel: next }))
        return { zoomLevel: next }
      }),
    resetZoom: () =>
      set((state) => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, zoomLevel: 100 }))
        return { zoomLevel: 100 }
      }),
    setZoomLevel: (zoomLevel: number) =>
      set((state) => {
        const clamped = Math.max(70, Math.min(200, zoomLevel))
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...state, zoomLevel: clamped }))
        return { zoomLevel: clamped }
      }),
  }
})
