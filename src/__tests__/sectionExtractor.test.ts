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

  it('correctly matches Vietnamese headings and URL encoded anchors', () => {
    const vnDoc = `# Tài liệu hệ thống

## 1. Giới thiệu tổng quan
Nội dung giới thiệu tổng quan ở đây.

## 2. Hướng dẫn cài đặt & cấu hình
Chi tiết các bước cài đặt hệ thống.
- Bước 1: Clone repo
- Bước 2: Chạy lệnh build

## 3. Kiến trúc {#custom-arch}
Mô tả kiến trúc hệ thống.
`
    // Match via slug with Vietnamese
    const res1 = extractSection(vnDoc, '#huong-dan-cai-dat-cau-hinh')
    expect(res1).not.toBeNull()
    expect(res1?.title).toBe('2. Hướng dẫn cài đặt & cấu hình')
    expect(res1?.content).toContain('Chi tiết các bước cài đặt hệ thống.')
    expect(res1?.content).not.toContain('## 3. Kiến trúc')

    // Match via URL encoded anchor: #2-h%C6%B0%E1%BB%9Bng-d%E1%BA%ABn...
    const encodedAnchor = encodeURIComponent('2. Hướng dẫn cài đặt')
    const res2 = extractSection(vnDoc, `#${encodedAnchor}`)
    expect(res2).not.toBeNull()
    expect(res2?.title).toBe('2. Hướng dẫn cài đặt & cấu hình')

    // Match via custom ID {#custom-arch}
    const res3 = extractSection(vnDoc, '#custom-arch')
    expect(res3).not.toBeNull()
    expect(res3?.title).toBe('3. Kiến trúc')
    expect(res3?.content).toContain('Mô tả kiến trúc hệ thống.')
  })
})
