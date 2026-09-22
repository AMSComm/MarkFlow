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

      const slug = cleanText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')

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
