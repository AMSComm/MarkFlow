import { describe, it, expect } from 'vitest'
import { extractTableOfContents } from '../utils/tocExtractor'

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
