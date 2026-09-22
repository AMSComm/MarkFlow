import React, { useMemo } from 'react'
import MarkdownIt from 'markdown-it'
import { MermaidBlock } from './MermaidBlock'
import { useWorkspaceStore } from '../../stores/workspaceStore'

interface MarkdownPreviewProps {
  content: string
  containerRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
}

// Regex to detect mermaid code fences: ```mermaid ... ```
const MERMAID_REGEX = /```mermaid\s*([\s\S]*?)```/g

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  containerRef,
  onScroll,
}) => {
  const { openInspector } = useWorkspaceStore()

  const md = useMemo(() => {
    return new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    })
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

  // Intercept click on links to open in Side Inspector
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a')
    if (!target) return

    const href = target.getAttribute('href')
    if (!href || href.startsWith('#')) return

    e.preventDefault()

    if (href.startsWith('http://') || href.startsWith('https://')) {
      openInspector('web', href)
    } else {
      // Relative or absolute markdown file link
      let normalized = href
      if (normalized.startsWith('./')) normalized = normalized.slice(1)
      if (!normalized.startsWith('/')) normalized = `/${normalized}`
      openInspector('doc', normalized)
    }
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      onClick={handleClick}
      className="h-full overflow-y-auto px-6 py-4 markdown-body bg-[#0b0f19]"
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
