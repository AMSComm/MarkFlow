import { slugify, matchesAnchor } from './slugify'
import { findAnchorLine } from './tocExtractor'

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

  let cleanAnchor = anchor.replace(/^#/, '').trim()
  try {
    cleanAnchor = decodeURIComponent(cleanAnchor)
  } catch {}
  cleanAnchor = cleanAnchor.toLowerCase().trim()
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
      let rawTitle = headingMatch[2].replace(/#+$/, '').trim()
      // Check for custom markdown ID: {#custom-id}
      const customIdMatch = rawTitle.match(/\{#([^}]+)\}$/)
      let customId = ''
      if (customIdMatch) {
        customId = customIdMatch[1].trim().toLowerCase()
        rawTitle = rawTitle.replace(/\{#[^}]+\}$/, '').trim()
      }
      const title = rawTitle.replace(/[*_`~[\]()]/g, '').trim()
      const slug = slugify(title)

      if (
        (customId && (customId === cleanAnchor || matchesAnchor(title, customId, cleanAnchor))) ||
        matchesAnchor(title, slug, cleanAnchor)
      ) {
        startLine = i
        targetLevel = level
        targetTitle = title
        break
      }
    }

    // Also check for explicit HTML anchor: <a id="anchor"> or <a name="anchor">
    try {
      const escapedAnchor = escapeRegExp(cleanAnchor)
      const htmlAnchorMatch = line.match(new RegExp(`(?:id|name)=["']${escapedAnchor}["']`, 'i'))
      if (htmlAnchorMatch) {
        startLine = i
        targetLevel = 6 // Treat as deep sub-level until next heading
        targetTitle = cleanAnchor
        break
      }
    } catch {}
  }

  // Step 1.5: Fallback search if exact heading wasn't found
  if (startLine === -1) {
    const lineNum = findAnchorLine(markdown, cleanAnchor)
    if (lineNum !== null && lineNum >= 1 && lineNum <= lines.length) {
      const lineIdx = lineNum - 1
      const line = lines[lineIdx]
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        startLine = lineIdx
        targetLevel = headingMatch[1].length
        targetTitle = headingMatch[2].replace(/#+$/, '').replace(/[*_`~[\]()]/g, '').trim()
      } else {
        startLine = lineIdx
        targetLevel = 6
        targetTitle = cleanAnchor
      }
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
