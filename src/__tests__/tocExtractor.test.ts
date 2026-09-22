import { describe, it, expect } from 'vitest'
import { extractTableOfContents, findAnchorLine } from '../utils/tocExtractor'
import { slugify, matchesAnchor } from '../utils/slugify'

describe('extractTableOfContents', () => {
  it('extracts H1 to H6 headings with accurate 1-indexed line numbers', () => {
    const markdown = `# Main Title
Some introduction text here.

## Section 1: Overview
Detail text.

### Subsection 1.1: Architecture
More info.

## Section 2: Diagrams
Ending text.`

    const toc = extractTableOfContents(markdown)
    expect(toc).toHaveLength(4)
    expect(toc[0]).toEqual({
      id: 'toc-0-main-title',
      text: 'Main Title',
      level: 1,
      line: 1,
    })
    expect(toc[1]).toEqual({
      id: 'toc-3-section-1-overview',
      text: 'Section 1: Overview',
      level: 2,
      line: 4,
    })
    expect(toc[2]).toEqual({
      id: 'toc-6-subsection-11-architecture',
      text: 'Subsection 1.1: Architecture',
      level: 3,
      line: 7,
    })
    expect(toc[3]).toEqual({
      id: 'toc-9-section-2-diagrams',
      text: 'Section 2: Diagrams',
      level: 2,
      line: 10,
    })
  })

  it('ignores headings inside fenced code blocks and mermaid diagrams', () => {
    const markdown = `# Real Title

\`\`\`markdown
# Fake Heading in Code Block
## Another Fake
\`\`\`

\`\`\`mermaid
graph TD
  A[# Not a heading]
\`\`\`

## Real Subtitle`

    const toc = extractTableOfContents(markdown)
    expect(toc).toHaveLength(2)
    expect(toc[0].text).toBe('Real Title')
    expect(toc[0].line).toBe(1)
    expect(toc[1].text).toBe('Real Subtitle')
    expect(toc[1].line).toBe(13)
  })

  it('returns empty array when there are no headings or empty string', () => {
    expect(extractTableOfContents('')).toEqual([])
    expect(extractTableOfContents('Just some paragraphs\nwithout any markdown headings.')).toEqual([])
  })
})

describe('findAnchorLine & Anchor Matching', () => {
  const doc = `# Welcome to MarkFlow
Intro paragraph.

## 1. Quick Start
Step 1.

## 2. Architecture & Design
Core overview.

## 4. ABC Feature
Important details on feature ABC.

<a id="custom-target"></a>
Special section here.
`

  it('matches headings by slug or number like #4-abc to line numbers', () => {
    expect(findAnchorLine(doc, '#4-abc')).toBe(10)
    expect(findAnchorLine(doc, '4-abc')).toBe(10)
    expect(findAnchorLine(doc, '4-abc-feature')).toBe(10)
    expect(findAnchorLine(doc, 'architecture-design')).toBe(7)
    expect(findAnchorLine(doc, '1-quick-start')).toBe(4)
  })

  it('matches explicit HTML anchors', () => {
    expect(findAnchorLine(doc, 'custom-target')).toBe(13)
  })

  it('returns null for non-existent anchors', () => {
    expect(findAnchorLine(doc, 'non-existent')).toBe(null)
    expect(findAnchorLine(doc, '')).toBe(null)
  })

  it('tests slugify and matchesAnchor accurately', () => {
    expect(slugify('4. ABC')).toBe('4-abc')
    expect(slugify('### Hello World!')).toBe('hello-world')
    expect(matchesAnchor('4. ABC Feature', '4-abc-feature', '4-abc')).toBe(true)
    expect(matchesAnchor('Quick Start', 'quick-start', 'quick-start')).toBe(true)
    expect(matchesAnchor('Quick Start', 'quick-start', 'other')).toBe(false)
  })
})
