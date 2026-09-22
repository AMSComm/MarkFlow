import { describe, it, expect } from 'vitest'
import { extractSection } from '../utils/sectionExtractor'

describe('extractSection', () => {
  const sampleDoc = `# Main Document

Introduction text that should not be in section 4.

## 1. Getting Started
Intro content.

## 4. AAA Feature
This is the core content of section 4.
Here are bullet points:
- Point A
- Point B

\`\`\`mermaid
graph TD
  A[# Not a heading] --> B
\`\`\`

\`\`\`markdown
## Fake Heading Inside Code Block
\`\`\`

### 4.1 Sub-details
This subsection belongs to section 4 because level 3 > level 2.

## 5. Conclusion
This is section 5, which must not be included.
`

  it('extracts only the content of #4-aaa and its subsections', () => {
    const res = extractSection(sampleDoc, '#4-aaa')
    expect(res).not.toBeNull()
    expect(res?.title).toBe('4. AAA Feature')
    expect(res?.level).toBe(2)
    expect(res?.content).toContain('This is the core content of section 4.')
    expect(res?.content).toContain('### 4.1 Sub-details')
    expect(res?.content).toContain('graph TD')
    // Should NOT contain Introduction or Section 5
    expect(res?.content).not.toContain('Introduction text that should not be in section 4.')
    expect(res?.content).not.toContain('## 5. Conclusion')
  })

  it('extracts sub-section only when anchor points to sub-heading', () => {
    const res = extractSection(sampleDoc, '41-sub-details')
    expect(res).not.toBeNull()
    expect(res?.title).toBe('4.1 Sub-details')
    expect(res?.level).toBe(3)
    expect(res?.content).toBe(`### 4.1 Sub-details\nThis subsection belongs to section 4 because level 3 > level 2.`)
  })

  it('extracts till the end of the document if it is the last section', () => {
    const res = extractSection(sampleDoc, '5-conclusion')
    expect(res).not.toBeNull()
    expect(res?.title).toBe('5. Conclusion')
    expect(res?.content).toBe(`## 5. Conclusion\nThis is section 5, which must not be included.`)
  })

  it('returns null if anchor is not found', () => {
    expect(extractSection(sampleDoc, 'non-existent-anchor')).toBeNull()
    expect(extractSection('', '4-aaa')).toBeNull()
  })
})
