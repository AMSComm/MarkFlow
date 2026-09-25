import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore } from '../stores/searchStore'

describe('SearchStore - In-file Find & Replace', () => {
  beforeEach(() => {
    useSearchStore.getState().resetSearch()
  })

  it('initializes with default closed state', () => {
    const state = useSearchStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.showReplace).toBe(false)
    expect(state.searchTerm).toBe('')
    expect(state.replaceTerm).toBe('')
    expect(state.caseSensitive).toBe(false)
    expect(state.wholeWord).toBe(false)
    expect(state.useRegex).toBe(false)
    expect(state.matchCount).toBe(0)
    expect(state.currentMatchIndex).toBe(0)
  })

  it('opens search with optional replace and initial query', () => {
    useSearchStore.getState().openSearch({ showReplace: true, initialQuery: 'hello' })
    const state = useSearchStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.showReplace).toBe(true)
    expect(state.searchTerm).toBe('hello')
  })

  it('closes search', () => {
    useSearchStore.getState().openSearch()
    expect(useSearchStore.getState().isOpen).toBe(true)
    useSearchStore.getState().closeSearch()
    expect(useSearchStore.getState().isOpen).toBe(false)
  })

  it('toggles replace visibility', () => {
    useSearchStore.getState().toggleReplace()
    expect(useSearchStore.getState().showReplace).toBe(true)
    useSearchStore.getState().toggleReplace()
    expect(useSearchStore.getState().showReplace).toBe(false)
  })

  it('toggles search modifiers (caseSensitive, wholeWord, useRegex)', () => {
    useSearchStore.getState().toggleCaseSensitive()
    expect(useSearchStore.getState().caseSensitive).toBe(true)

    useSearchStore.getState().toggleWholeWord()
    expect(useSearchStore.getState().wholeWord).toBe(true)

    useSearchStore.getState().toggleRegex()
    expect(useSearchStore.getState().useRegex).toBe(true)
  })

  it('updates search and replace terms', () => {
    useSearchStore.getState().setSearchTerm('query')
    expect(useSearchStore.getState().searchTerm).toBe('query')

    useSearchStore.getState().setReplaceTerm('replacement')
    expect(useSearchStore.getState().replaceTerm).toBe('replacement')
  })

  it('updates match count and active match index', () => {
    useSearchStore.getState().setMatchInfo(15, 3)
    const state = useSearchStore.getState()
    expect(state.matchCount).toBe(15)
    expect(state.currentMatchIndex).toBe(3)
  })

  it('dispatches action triggers for next, prev, replace, replaceAll', () => {
    useSearchStore.getState().triggerFindNext()
    expect(useSearchStore.getState().actionTrigger?.type).toBe('findNext')

    useSearchStore.getState().triggerFindPrev()
    expect(useSearchStore.getState().actionTrigger?.type).toBe('findPrev')

    useSearchStore.getState().triggerReplace()
    expect(useSearchStore.getState().actionTrigger?.type).toBe('replace')

    useSearchStore.getState().triggerReplaceAll()
    expect(useSearchStore.getState().actionTrigger?.type).toBe('replaceAll')
  })
})
