import { slugify, matchesAnchor } from './slugify'

export interface ExtractedSection {
  title: string
  level: number
  startLine: number
  endLine: number
  content: string
}

/**
 * Extracts only the content belonging to a specific heading/anchor.
 * Slices from the target heading up to the next heading of equal or higher level.
 * Correctly ignores headings inside fenced code blocks and mermaid diagrams.
 */
export function extractSection(markdown: string, anchor: string): ExtractedSection | null {
  if (!markdown || !anchor) return null

  const cleanAnchor = anchor.replace(/^#/, '').toLowerCase().trim()
  if (!cleanAnchor) return null

  const lines = markdown.split('\n')
  let inCodeBlock = false

  let startLine = -1
  let targetLevel = -1
  let targetTitle = ''

  // Step 1: Find the target heading line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) continue

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].replace(/#+$/, '').replace(/[*_`]/g, '').trim()
      const slug = slugify(title)

      if (matchesAnchor(title, slug, cleanAnchor)) {
        startLine = i
        targetLevel = level
        targetTitle = title
        break
      }
    }

    // Also check for explicit HTML anchor: <a id="anchor"> or <a name="anchor">
    const htmlAnchorMatch = line.match(new RegExp(`(?:id|name)=["']${cleanAnchor}["']`, 'i'))
    if (htmlAnchorMatch) {
      startLine = i
      targetLevel = 6 // Treat as deep sub-level until next heading
      targetTitle = cleanAnchor
      break
    }
  }

  if (startLine === -1) {
    return null
  }

  // Step 2: Find the end of this section (next heading of level <= targetLevel)
  let endLine = lines.length
  inCodeBlock = false

  for (let i = startLine + 1; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) continue

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      if (level <= targetLevel) {
        endLine = i
        break
      }
    }
  }

  const sectionLines = lines.slice(startLine, endLine)
  const content = sectionLines.join('\n').trim()

  return {
    title: targetTitle,
    level: targetLevel,
    startLine: startLine + 1,
    endLine,
    content,
  }
}
