import { describe, it, expect } from 'vitest'
import {
  buildSearchRegex,
  clearPreviewHighlights,
  highlightPreviewMatches,
} from '../utils/previewSearch'

describe('previewSearch utility - Regex Engine', () => {
  it('escapes non-regex search strings properly', () => {
    const reg = buildSearchRegex('test.*[abc]', false, false, false)
    expect(reg).not.toBeNull()
    expect(reg?.test('test.*[abc]')).toBe(true)
    expect(reg?.test('testabc')).toBe(false)
  })

  it('respects case sensitivity', () => {
    const regCaseInsensitive = buildSearchRegex('Apple', false, false, false)
    expect(regCaseInsensitive?.test('apple')).toBe(true)

    const regCaseSensitive = buildSearchRegex('Apple', true, false, false)
    expect(regCaseSensitive?.test('apple')).toBe(false)
    expect(regCaseSensitive?.test('Apple')).toBe(true)
  })

  it('respects whole word flag', () => {
    const regWhole = buildSearchRegex('cat', false, true, false)
    expect(regWhole?.test('a cat sits')).toBe(true)
    expect(regWhole?.test('concatenate')).toBe(false)
    expect(regWhole?.test('cat-like')).toBe(true)
  })

  it('handles valid and invalid regex patterns gracefully', () => {
    const validReg = buildSearchRegex('\\d{3}', false, false, true)
    expect(validReg).not.toBeNull()
    expect(validReg?.test('code 123 end')).toBe(true)

    const invalidReg = buildSearchRegex('[unclosed', false, false, true)
    expect(invalidReg).toBeNull()
  })

  it('returns null for empty search terms', () => {
    expect(buildSearchRegex('', false, false, false)).toBeNull()
    expect(buildSearchRegex('   ', false, false, false)).not.toBeNull()
  })

  it('safely handles clearPreviewHighlights and highlightPreviewMatches when container is undefined/null or no document', () => {
    // In node environment without window.document, functions should not throw fatal errors
    expect(() => clearPreviewHighlights({} as HTMLElement)).not.toThrow()
    const res = highlightPreviewMatches({} as HTMLElement, null, 1)
    expect(res.matchCount).toBe(0)
  })
})
