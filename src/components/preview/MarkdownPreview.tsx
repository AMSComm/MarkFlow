import React, { useMemo, useEffect, useRef } from 'react'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { MermaidBlock } from './MermaidBlock'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
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

// Prioritized subset of popular languages for fast auto-detection
const POPULAR_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'json',
  'html',
  'css',
  'bash',
  'shell',
  'sql',
  'yaml',
  'markdown',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'java',
  'xml',
  'dockerfile',
]

/**
 * Highlights code and wraps it in a styled container with language badge and copy button.
 * Uses auto-detection when no language tag is provided, with sampling optimization
 * to ensure zero lag even on large documents.
 */
function renderFencedCodeBlock(code: string, rawInfo: string, escapeHtml: (s: string) => string): string {
  const lang = (rawInfo || '').trim().split(/\s+/)[0].toLowerCase()
  let highlightedHtml = ''
  let displayLang = lang

  if (lang && hljs.getLanguage(lang)) {
    try {
      const res = hljs.highlight(code, { language: lang, ignoreIllegals: true })
      highlightedHtml = res.value
      displayLang = lang
    } catch {
      highlightedHtml = escapeHtml(code)
    }
  } else {
    // Auto-detect code language
    // Optimization: sample first 50 lines / 3000 chars to avoid CPU stalls
    const sample = code.length > 3000 ? code.split('\n').slice(0, 50).join('\n') : code
    try {
      const auto = hljs.highlightAuto(sample, POPULAR_LANGUAGES)
      if (auto.language && auto.relevance >= 2) {
        displayLang = auto.language
        const res = hljs.highlight(code, { language: auto.language, ignoreIllegals: true })
        highlightedHtml = res.value
      } else {
        displayLang = lang || 'text'
        highlightedHtml = escapeHtml(code)
      }
    } catch {
      displayLang = lang || 'text'
      highlightedHtml = escapeHtml(code)
    }
  }

  const encodedCode = encodeURIComponent(code)

  return `<div class="code-block-wrapper group/code my-3 rounded-lg border border-slate-800 bg-[#090d16] overflow-hidden">
  <div class="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] border-b border-slate-800 text-[11px] font-mono text-slate-400 select-none">
    <span class="uppercase font-semibold tracking-wider text-cyan-400/90">${displayLang}</span>
    <button
      type="button"
      class="copy-code-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
      data-code="${encodedCode}"
      title="Copy code to clipboard"
    >
      <svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
      <span class="copy-label text-[11px]">Copy</span>
    </button>
  </div>
  <pre class="!m-0 !p-3 !bg-transparent overflow-x-auto text-[13px] leading-relaxed"><code class="hljs language-${displayLang}">${highlightedHtml}</code></pre>
</div>`
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  containerRef,
  targetAnchor,
  onScroll,
  isInspector: _isInspector = false,
}) => {
  const { openInspector, openFile, scrollToAnchor, setHoveredLinkUrl } = useWorkspaceStore()
  const { fontSize } = useSettingsStore()
  const internalContainerRef = useRef<HTMLDivElement>(null)
  const activeContainerRef = containerRef || internalContainerRef

  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })

    // Custom code fence rule: syntax highlight + auto-detect + copy button
    instance.renderer.rules.fence = (tokens, idx) => {
      const token = tokens[idx]
      return renderFencedCodeBlock(token.content, token.info, instance.utils.escapeHtml)
    }

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
    // 0. Handle Copy Button click on code blocks
    const copyBtn = (e.target as HTMLElement).closest('.copy-code-btn') as HTMLButtonElement | null
    if (copyBtn) {
      e.preventDefault()
      e.stopPropagation()
      const rawCode = copyBtn.getAttribute('data-code')
      if (rawCode) {
        const textToCopy = decodeURIComponent(rawCode)
        const copyAsync = async () => {
          try {
            await navigator.clipboard.writeText(textToCopy)
          } catch {
            const ta = document.createElement('textarea')
            ta.value = textToCopy
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
          }

          const label = copyBtn.querySelector('.copy-label')
          const icon = copyBtn.querySelector('.copy-icon')
          if (label) label.textContent = 'Copied!'
          copyBtn.classList.add('text-emerald-400')
          if (icon) {
            icon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`
          }

          setTimeout(() => {
            if (label) label.textContent = 'Copy'
            copyBtn.classList.remove('text-emerald-400')
            if (icon) {
              icon.innerHTML = `<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>`
            }
          }, 2000)
        }

        copyAsync()
      }
      return
    }

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
        if (anchor) {
          const docPath =
            (_isInspector && useWorkspaceStore.getState().inspector.pathOrUrl) ||
            (activeTab ? activeTab.path : '')
          if (docPath) {
            openInspector('doc', docPath, anchor, true)
          }
        }
      }
    } else {
      // LINK OF AN EXTERNAL FILE
      // If link contains an anchor (e.g. other.md#4-aaa):
      if (anchor) {
        if (isModifier) {
          openFile(normalizedPath, anchor)
        } else {
          openInspector('doc', normalizedPath, anchor, true)
        }
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

  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchorEl = (e.target as HTMLElement).closest('a')
    if (anchorEl) {
      const rawHref = anchorEl.getAttribute('href')
      if (rawHref) {
        setHoveredLinkUrl(rawHref)
      }
    }
  }

  const handleMouseOut = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchorEl = (e.target as HTMLElement).closest('a')
    if (anchorEl) {
      const nextTarget = e.relatedTarget as Node | null
      if (!nextTarget || !anchorEl.contains(nextTarget)) {
        setHoveredLinkUrl(null)
      }
    }
  }

  return (
    <div
      ref={activeContainerRef}
      onScroll={onScroll}
      onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      style={{ fontSize: fontSize ? `${fontSize}px` : undefined }}
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
