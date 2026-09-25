import React, { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, type ViewUpdate } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { vim } from '@replit/codemirror-vim'
import {
  search,
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  highlightSelectionMatches,
} from '@codemirror/search'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSearchStore } from '../../stores/searchStore'

interface CodeMirrorEditorProps {
  content: string
  tabId: string
  onScroll?: (scrollFraction: number) => void
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  content,
  tabId,
  onScroll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { vimMode, wordWrap, fontSize } = useSettingsStore()
  const { updateContent, saveActiveFile } = useWorkspaceStore()
  const {
    isOpen: isSearchOpen,
    searchTerm,
    replaceTerm,
    caseSensitive,
    wholeWord,
    useRegex,
    actionTrigger,
    setMatchInfo,
  } = useSearchStore()

  // Helper to recompute matches count and active selection index
  const computeMatches = (view: EditorView) => {
    const { isOpen, searchTerm, caseSensitive, wholeWord, useRegex, replaceTerm, setMatchInfo } =
      useSearchStore.getState()
    if (!isOpen || !searchTerm) {
      setMatchInfo(0, 0)
      return
    }

    try {
      const query = new SearchQuery({
        search: searchTerm,
        caseSensitive,
        wholeWord,
        regexp: useRegex,
        replace: replaceTerm,
      })

      if (!query.valid) {
        setMatchInfo(0, 0)
        return
      }

      const cursor = query.getCursor(view.state.doc)
      let count = 0
      let current = 0
      const selFrom = view.state.selection.main.from
      const selTo = view.state.selection.main.to

      let item = cursor.next()
      while (!item.done) {
        count++
        if (item.value.from === selFrom && item.value.to === selTo) {
          current = count
        }
        item = cursor.next()
      }

      setMatchInfo(count, current)
    } catch {
      setMatchInfo(0, 0)
    }
  }

  // Track if update is internal to prevent infinite re-renders
  const isInternalUpdateRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      bracketMatching(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      oneDark,
      search({ top: false }),
      highlightSelectionMatches(),

      // Save and search shortcuts
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            saveActiveFile()
            return true
          },
        },
        {
          key: 'Mod-f',
          run: (v) => {
            const sel = v.state.sliceDoc(
              v.state.selection.main.from,
              v.state.selection.main.to
            )
            useSearchStore.getState().openSearch({
              showReplace: false,
              initialQuery: sel || undefined,
            })
            return true
          },
        },
        {
          key: 'Mod-h',
          run: (v) => {
            const sel = v.state.sliceDoc(
              v.state.selection.main.from,
              v.state.selection.main.to
            )
            useSearchStore.getState().openSearch({
              showReplace: true,
              initialQuery: sel || undefined,
            })
            return true
          },
        },
        {
          key: 'Mod-Alt-f',
          run: (v) => {
            const sel = v.state.sliceDoc(
              v.state.selection.main.from,
              v.state.selection.main.to
            )
            useSearchStore.getState().openSearch({
              showReplace: true,
              initialQuery: sel || undefined,
            })
            return true
          },
        },
        {
          key: 'Escape',
          run: () => {
            if (useSearchStore.getState().isOpen) {
              useSearchStore.getState().closeSearch()
              return true
            }
            return false
          },
        },
        ...defaultKeymap,
        ...historyKeymap,
      ]),

      // Scroll event listener for sync-scroll
      EditorView.domEventHandlers({
        scroll: (_event: Event, view: EditorView) => {
          if (!onScroll) return
          const scroller = view.scrollDOM
          const scrollFraction =
            scroller.scrollTop / Math.max(1, scroller.scrollHeight - scroller.clientHeight)
          onScroll(scrollFraction)
        },
        click: (event: MouseEvent, view: EditorView) => {
          if (event.ctrlKey || event.metaKey) {
            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
            if (pos !== null) {
              const line = view.state.doc.lineAt(pos)
              const lineText = line.text
              const col = pos - line.from
              const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
              let match: RegExpExecArray | null
              while ((match = linkRegex.exec(lineText)) !== null) {
                const start = match.index
                const end = start + match[0].length
                if (col >= start && col <= end) {
                  const href = match[2].trim()
                  event.preventDefault()
                  if (href.startsWith('http://') || href.startsWith('https://')) {
                    window.open(href, '_blank')
                  } else {
                    const hashIdx = href.indexOf('#')
                    let path = href
                    let anchor: string | undefined = undefined
                    if (hashIdx !== -1) {
                      anchor = href.slice(hashIdx + 1)
                      path = href.slice(0, hashIdx)
                    }
                    const activeTab = useWorkspaceStore.getState().tabs.find((t) => t.id === tabId)
                    const targetPath = path
                      ? (path.startsWith('/') ? path : `/${path.replace(/^\.\//, '')}`)
                      : (activeTab?.path || '')
                    if (targetPath) {
                      useWorkspaceStore.getState().openFile(targetPath, anchor)
                    } else if (anchor) {
                      useWorkspaceStore.getState().scrollToAnchor(anchor)
                    }
                  }
                  return true
                }
              }
            }
          }
        },
      }),

      // Change update listener
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          isInternalUpdateRef.current = true
          const newDoc = update.state.doc.toString()
          updateContent(tabId, newDoc)
        }
        if (update.selectionSet || update.docChanged) {
          const { isOpen, searchTerm } = useSearchStore.getState()
          if (isOpen && searchTerm) {
            computeMatches(update.view)
          }
        }
      }),
    ]

    if (vimMode) {
      extensions.unshift(vim())
    }

    if (wordWrap) {
      extensions.push(EditorView.lineWrapping)
    }

    if (fontSize) {
      extensions.push(
        EditorView.theme({
          '&': { fontSize: `${fontSize}px` },
          '.cm-content': { fontSize: `${fontSize}px` },
          '.cm-gutters': { fontSize: `${fontSize}px` },
        })
      )
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [tabId, vimMode, wordWrap, fontSize])

  // Sync external content changes into the editor if not triggered internally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false
      return
    }

    const currentDoc = view.state.doc.toString()
    if (content !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      })
    }
  }, [content])

  // Scroll to targeted line when clicked from Table of Contents
  const { targetScrollLine, scrollToLine } = useWorkspaceStore()
  useEffect(() => {
    const view = viewRef.current
    if (!view || targetScrollLine === null) return

    try {
      const line = view.state.doc.line(Math.min(targetScrollLine, view.state.doc.lines))
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 20 }),
      })
      scrollToLine(null)
    } catch (e) {
      console.warn('Could not scroll to line:', e)
    }
  }, [targetScrollLine, scrollToLine])

  // Sync search query changes to CodeMirror
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    if (!isSearchOpen || !searchTerm) {
      view.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: '' })),
      })
      setMatchInfo(0, 0)
      return
    }

    try {
      const query = new SearchQuery({
        search: searchTerm,
        caseSensitive,
        wholeWord,
        regexp: useRegex,
        replace: replaceTerm,
      })

      view.dispatch({
        effects: setSearchQuery.of(query),
      })

      computeMatches(view)
    } catch {
      setMatchInfo(0, 0)
    }
  }, [isSearchOpen, searchTerm, caseSensitive, wholeWord, useRegex, replaceTerm, setMatchInfo])

  // React to find/replace action triggers
  useEffect(() => {
    const view = viewRef.current
    if (!view || !actionTrigger) return

    switch (actionTrigger.type) {
      case 'findNext':
        findNext(view)
        break
      case 'findPrev':
        findPrevious(view)
        break
      case 'replace':
        replaceNext(view)
        break
      case 'replaceAll':
        replaceAll(view)
        break
    }

    computeMatches(view)
  }, [actionTrigger])

  return <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#090d16]" />
}
