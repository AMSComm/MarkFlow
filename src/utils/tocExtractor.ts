import { slugify, matchesAnchor } from './slugify'

export interface TocItem {
  id: string
  level: number
  text: string
  line: number
}

/**
 * Extracts markdown headings (# H1, ## H2, etc.) with line numbers.
 * Ignores headings inside fenced code blocks.
 */
export function extractTableOfContents(markdown: string): TocItem[] {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const items: TocItem[] = []
  let inCodeBlock = false

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    // Toggle code block state
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock
      return
    }

    if (inCodeBlock) return

    // Match markdown heading pattern # to ######
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      // Remove any trailing # or formatting like bold/italic for clean TOC text
      const cleanText = headingMatch[2]
        .replace(/#+$/, '')
        .replace(/[*_`]/g, '')
        .trim()

      const slug = slugify(cleanText)

      items.push({
        id: `toc-${index}-${slug}`,
        level,
        text: cleanText,
        line: index + 1,
      })
    }
  })

  return items
}

/**
 * Finds the 1-indexed line number in markdown content for a given anchor/heading.
 * Matches TOC items, HTML anchors (<a id="..." or id="..."), and heading titles.
 */
export function findAnchorLine(content: string, anchor: string): number | null {
  if (!content || !anchor) return null
  const cleanAnchor = anchor.replace(/^#/, '').toLowerCase().trim()
  if (!cleanAnchor) return null

  // 1. Check extracted TOC items with resilient slug/title matching
  const items = extractTableOfContents(content)
  for (const item of items) {
    const slug = slugify(item.text)
    if (matchesAnchor(item.text, slug, cleanAnchor)) {
      return item.line
    }
  }

  // 2. Check for explicit HTML anchors or tags with id/name
  const lines = content.split('\n')
  const anchorRegex = new RegExp(`(?:id|name)=["']${cleanAnchor}["']`, 'i')
  for (let i = 0; i < lines.length; i++) {
    if (anchorRegex.test(lines[i])) {
      return i + 1
    }
  }

  // 3. Fallback check: markdown headings containing normalized keywords
  const normAnchor = cleanAnchor.replace(/[^a-z0-9]/g, '')
  if (normAnchor) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.startsWith('#')) {
        const normLine = line.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (normLine.includes(normAnchor)) {
          return i + 1
        }
      }
    }
  }

  return null
}
