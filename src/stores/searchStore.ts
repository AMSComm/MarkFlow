import { create } from 'zustand'

export type SearchActionType = 'findNext' | 'findPrev' | 'replace' | 'replaceAll'

export interface SearchActionTrigger {
  type: SearchActionType
  id: number
}

export interface SearchState {
  isOpen: boolean
  showReplace: boolean
  searchTerm: string
  replaceTerm: string
  caseSensitive: boolean
  wholeWord: boolean
  useRegex: boolean
  matchCount: number
  currentMatchIndex: number
  actionTrigger: SearchActionTrigger | null

  // Actions
  openSearch: (options?: { showReplace?: boolean; initialQuery?: string }) => void
  closeSearch: () => void
  toggleReplace: () => void
  setSearchTerm: (term: string) => void
  setReplaceTerm: (term: string) => void
  toggleCaseSensitive: () => void
  toggleWholeWord: () => void
  toggleRegex: () => void
  setMatchInfo: (matchCount: number, currentMatchIndex: number) => void
  triggerFindNext: () => void
  triggerFindPrev: () => void
  triggerReplace: () => void
  triggerReplaceAll: () => void
  resetSearch: () => void
}

const initialState = {
  isOpen: false,
  showReplace: false,
  searchTerm: '',
  replaceTerm: '',
  caseSensitive: false,
  wholeWord: false,
  useRegex: false,
  matchCount: 0,
  currentMatchIndex: 0,
  actionTrigger: null,
}

export const useSearchStore = create<SearchState>((set) => ({
  ...initialState,

  openSearch: (options) =>
    set((state) => ({
      isOpen: true,
      showReplace: options?.showReplace !== undefined ? options.showReplace : state.showReplace,
      searchTerm: options?.initialQuery !== undefined ? options.initialQuery : state.searchTerm,
    })),

  closeSearch: () =>
    set({
      isOpen: false,
      matchCount: 0,
      currentMatchIndex: 0,
      actionTrigger: null,
    }),

  toggleReplace: () =>
    set((state) => ({
      showReplace: !state.showReplace,
    })),

  setSearchTerm: (term) =>
    set({
      searchTerm: term,
    }),

  setReplaceTerm: (term) =>
    set({
      replaceTerm: term,
    }),

  toggleCaseSensitive: () =>
    set((state) => ({
      caseSensitive: !state.caseSensitive,
    })),

  toggleWholeWord: () =>
    set((state) => ({
      wholeWord: !state.wholeWord,
    })),

  toggleRegex: () =>
    set((state) => ({
      useRegex: !state.useRegex,
    })),

  setMatchInfo: (matchCount, currentMatchIndex) =>
    set({
      matchCount,
      currentMatchIndex,
    }),

  triggerFindNext: () =>
    set({
      actionTrigger: { type: 'findNext', id: Date.now() + Math.random() },
    }),

  triggerFindPrev: () =>
    set({
      actionTrigger: { type: 'findPrev', id: Date.now() + Math.random() },
    }),

  triggerReplace: () =>
    set({
      actionTrigger: { type: 'replace', id: Date.now() + Math.random() },
    }),

  triggerReplaceAll: () =>
    set({
      actionTrigger: { type: 'replaceAll', id: Date.now() + Math.random() },
    }),

  resetSearch: () =>
    set({
      ...initialState,
    }),
}))
