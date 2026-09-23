import React, { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, type ViewUpdate } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { vim } from '@replit/codemirror-vim'
import { useSettingsStore } from '../../stores/settingsStore'
import { useWorkspaceStore } from '../../stores/workspaceStore'

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

      // Save shortcut Mod-s (Cmd+S on Mac, Ctrl+S on Win/Linux)
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            saveActiveFile()
            return true
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

  return <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#090d16]" />
}
