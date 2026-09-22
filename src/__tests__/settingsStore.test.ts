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
})
