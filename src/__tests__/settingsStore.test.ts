import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../stores/settingsStore'

describe('SettingsStore - VSCode & Vim Options', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('toggles vim mode and updates state', () => {
    const store = useSettingsStore.getState()
    const initial = store.vimMode
    store.toggleVimMode()
    expect(useSettingsStore.getState().vimMode).toBe(!initial)
    store.toggleVimMode()
    expect(useSettingsStore.getState().vimMode).toBe(initial)
  })

  it('toggles word wrap and sync scroll', () => {
    const store = useSettingsStore.getState()
    const wrapInitial = store.wordWrap
    const syncInitial = store.syncScroll

    store.toggleWordWrap()
    expect(useSettingsStore.getState().wordWrap).toBe(!wrapInitial)

    store.toggleSyncScroll()
    expect(useSettingsStore.getState().syncScroll).toBe(!syncInitial)
  })

  it('adjusts zoom level with zoomIn, zoomOut, resetZoom, and clamps to [70, 200]', () => {
    const store = useSettingsStore.getState()
    expect(store.zoomLevel).toBe(100)

    store.zoomIn()
    expect(useSettingsStore.getState().zoomLevel).toBe(110)

    store.zoomOut()
    expect(useSettingsStore.getState().zoomLevel).toBe(100)

    store.setZoomLevel(150)
    expect(useSettingsStore.getState().zoomLevel).toBe(150)

    store.resetZoom()
    expect(useSettingsStore.getState().zoomLevel).toBe(100)

    // Clamps
    store.setZoomLevel(300)
    expect(useSettingsStore.getState().zoomLevel).toBe(200)

    store.setZoomLevel(20)
    expect(useSettingsStore.getState().zoomLevel).toBe(70)
  })

  it('adjusts and clamps fontSize within [10, 32]', () => {
    const store = useSettingsStore.getState()
    store.setFontSize(16)
    expect(useSettingsStore.getState().fontSize).toBe(16)

    store.setFontSize(50)
    expect(useSettingsStore.getState().fontSize).toBe(32)

    store.setFontSize(5)
    expect(useSettingsStore.getState().fontSize).toBe(10)
  })
})
