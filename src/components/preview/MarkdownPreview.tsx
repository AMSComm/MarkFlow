import React, { useMemo, useEffect, useRef } from 'react'
import MarkdownIt from 'markdown-it'
import { MermaidBlock } from './MermaidBlock'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { slugify, matchesAnchor } from '../../utils/slugify'

interface MarkdownPreviewProps {
  content: string
  containerRef?: React.RefObject<HTMLDivElement | null>
  targetAnchor?: string | null
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  isInspector?: boolean
}

// Regex to detect mermaid code fences: ```mermaid ... ```
const MERMAID_REGEX = /```mermaid\s*([\s\S]*?)```/g

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  containerRef,
  targetAnchor,
  onScroll,
  isInspector: _isInspector = false,
}) => {
  const { openInspector, openFile, scrollToAnchor } = useWorkspaceStore()
  const internalContainerRef = useRef<HTMLDivElement>(null)
  const activeContainerRef = containerRef || internalContainerRef

  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })

    // Custom heading rule to inject id, data-slug, and data-heading attributes
    instance.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
      const nextToken = tokens[idx + 1]
      let headingText = ''
      if (nextToken && nextToken.children) {
        headingText = nextToken.children.map((c) => c.content).join('')
      } else if (nextToken) {
        headingText = nextToken.content || ''
      }
      const slug = slugify(headingText)
      tokens[idx].attrSet('id', slug)
      tokens[idx].attrSet('data-slug', slug)
      tokens[idx].attrSet('data-heading', headingText.trim())
      return self.renderToken(tokens, idx, options)
    }

    return instance
  }, [])

  // Parse markdown into interleaved segments of HTML and Mermaid blocks
  const segments = useMemo(() => {
    const parts: Array<{ type: 'html' | 'mermaid'; content: string; key: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = MERMAID_REGEX.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index)
        parts.push({
          type: 'html',
          content: md.render(textBefore),
          key: `html_${lastIndex}`,
        })
      }

      parts.push({
        type: 'mermaid',
        content: match[1].trim(),
        key: `mmd_${match.index}`,
      })

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'html',
        content: md.render(content.slice(lastIndex)),
        key: `html_${lastIndex}`,
      })
    }

    return parts
  }, [content, md])

  // Automatically scroll to target anchor when specified
  useEffect(() => {
    if (!targetAnchor || !activeContainerRef.current) return

    const container = activeContainerRef.current
    const cleanAnchor = targetAnchor.replace(/^#/, '').toLowerCase().trim()
    if (!cleanAnchor) return

    const timeout = setTimeout(() => {
      let targetEl: HTMLElement | null = null

      try {
        targetEl = container.querySelector(`#${CSS.escape(cleanAnchor)}`) as HTMLElement | null
      } catch {}

      if (!targetEl) {
        try {
          targetEl = container.querySelector(`[data-slug="${CSS.escape(cleanAnchor)}"]`) as HTMLElement | null
        } catch {}
      }

      if (!targetEl) {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, [id]')
        for (const h of headings) {
          const id = h.getAttribute('id') || ''
          const text = h.textContent || ''
          if (matchesAnchor(text, id, cleanAnchor)) {
            targetEl = h as HTMLElement
            break
          }
        }
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
        targetEl.classList.add('anchor-highlight')
        const glowTimer = setTimeout(() => {
          targetEl?.classList.remove('anchor-highlight')
        }, 2500)
        return () => clearTimeout(glowTimer)
      }
    }, 60)

    return () => clearTimeout(timeout)
  }, [targetAnchor, segments, activeContainerRef])

  // Intercept click on links:
  // - Link #4-aaa of SAME file:
  //    * Regular click: preview ONLY the content of section #4-aaa in Side Inspector
  //    * Ctrl/Cmd + click: focus into #4-aaa in active editor/tab
  // - Link #4-aaa of EXTERNAL file:
  //    * Open the external file in main tab and focus into #4-aaa
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a')
    if (!target) return

    const rawHref = target.getAttribute('href')
    if (!rawHref) return

    e.preventDefault()
    e.stopPropagation()

    const isModifier = e.ctrlKey || e.metaKey

    // 1. External HTTP/HTTPS links
    if (rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
      if (isModifier) {
        window.open(rawHref, '_blank')
      } else {
        openInspector('web', rawHref)
      }
      return
    }

    // 2. Parse file path and anchor
    let filePath = rawHref
    let anchor: string | null = null
    const hashIdx = filePath.indexOf('#')
    if (hashIdx !== -1) {
      anchor = filePath.slice(hashIdx + 1)
      filePath = filePath.slice(0, hashIdx)
    }

    const { tabs, activeTabId } = useWorkspaceStore.getState()
    const activeTab = tabs.find((t) => t.id === activeTabId)

    // Normalize file path
    let normalizedPath = filePath
    if (normalizedPath) {
      if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.slice(1)
      if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`
    }

    const isSameFile = !normalizedPath || (activeTab && normalizedPath === activeTab.path)

    if (isSameFile) {
      // LINK OF THE SAME FILE
      if (isModifier) {
        // Ctrl/Cmd + Click: focus into section #4-aaa in active tab
        if (anchor) {
          scrollToAnchor(anchor)
        }
      } else {
        // Regular Click: preview ONLY the content of section #4-aaa in Side Inspector
        if (anchor && activeTab) {
          openInspector('doc', activeTab.path, anchor, true)
        }
      }
    } else {
      // LINK OF AN EXTERNAL FILE
      // If link contains an anchor (e.g. other.md#4-aaa): open external file and focus on #4-aaa
      if (anchor) {
        openFile(normalizedPath, anchor)
      } else {
        // External file without anchor
        if (isModifier) {
          openFile(normalizedPath)
        } else {
          openInspector('doc', normalizedPath)
        }
      }
    }
  }

  return (
    <div
      ref={activeContainerRef}
      onScroll={onScroll}
      onClick={handleClick}
      className="h-full overflow-y-auto px-6 py-4 markdown-body bg-[#0b0f19] select-text"
    >
      {segments.map((seg) => {
        if (seg.type === 'mermaid') {
          return <MermaidBlock key={seg.key} code={seg.content} />
        }
        return (
          <div
            key={seg.key}
            className="prose-content"
            dangerouslySetInnerHTML={{ __html: seg.content }}
          />
        )
      })}
    </div>
  )
}
