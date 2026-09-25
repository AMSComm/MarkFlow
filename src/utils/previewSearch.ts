/**
 * MarkFlow Preview In-file Search & Highlight Utilities
 */

export function buildSearchRegex(
  term: string,
  caseSensitive: boolean,
  wholeWord: boolean,
  useRegex: boolean
): RegExp | null {
  if (!term) return null

  try {
    let pattern: string
    if (useRegex) {
      pattern = term
    } else {
      // Escape special characters for literal search
      pattern = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    if (wholeWord) {
      pattern = `\\b(?:${pattern})\\b`
    }

    const flags = caseSensitive ? 'g' : 'gi'
    return new RegExp(pattern, flags)
  } catch {
    return null
  }
}

/**
 * Check if the browser supports the CSS Custom Highlight API.
 */
export function supportsCSSHighlights(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    'highlights' in CSS &&
    typeof (window as unknown as { Highlight?: unknown })?.Highlight !== 'undefined'
  )
}

// Keep track of ranges for active navigation when using CSS Highlights
let cachedHighlightRanges: Range[] = []

/**
 * Strips preview search highlights.
 * Non-destructive: cleans CSS.highlights or reverts fallback mark elements without normalize().
 */
export function clearPreviewHighlights(container?: HTMLElement | null): void {
  cachedHighlightRanges = []

  if (supportsCSSHighlights()) {
    try {
      CSS.highlights.delete('mf-search-match')
      CSS.highlights.delete('mf-search-match-active')
    } catch {}
    return
  }

  if (
    typeof document === 'undefined' ||
    !container ||
    typeof container.querySelectorAll !== 'function'
  ) {
    return
  }

  try {
    const marks = container.querySelectorAll('mark.mf-search-match')
    marks.forEach((mark) => {
      const parent = mark.parentNode
      if (parent) {
        const textNode = document.createTextNode(mark.textContent || '')
        parent.replaceChild(textNode, mark)
      }
    })
    // NOTE: NEVER call container.normalize() here as it mutates React 19's virtual DOM references!
  } catch (err) {
    console.warn('Error clearing preview highlights fallback:', err)
  }
}

/**
 * Updates only the active match highlight and scrolls it smoothly into view,
 * without re-rendering or altering any search match nodes.
 */
export function setActivePreviewMatchIndex(
  container: HTMLElement | null,
  activeIndex: number
): void {
  if (!container || typeof document === 'undefined') return

  try {
    if (supportsCSSHighlights()) {
      if (cachedHighlightRanges.length === 0) {
        const existing = CSS.highlights.get('mf-search-match')
        if (existing) {
          cachedHighlightRanges = Array.from(existing) as Range[]
        }
      }

      const total = cachedHighlightRanges.length
      if (total === 0) return

      const clampedIndex = Math.max(1, Math.min(activeIndex, total))
      const targetRange = cachedHighlightRanges[clampedIndex - 1]
      if (targetRange) {
        const activeHighlight = new Highlight(targetRange)
        CSS.highlights.set('mf-search-match-active', activeHighlight)

        // Smooth scroll to target match
        const rect = targetRange.getBoundingClientRect()
        if (rect && (rect.width > 0 || rect.height > 0)) {
          const containerRect = container.getBoundingClientRect()
          const relativeTop = rect.top - containerRect.top + container.scrollTop
          container.scrollTo({
            top: Math.max(0, relativeTop - container.clientHeight / 2),
            behavior: 'smooth',
          })
        } else {
          targetRange.startContainer.parentElement?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
        }
      }
      return
    }

    // Fallback: update active class on existing marks
    const matches = Array.from(container.querySelectorAll('mark.mf-search-match'))
    if (matches.length === 0) return

    const clampedIndex = Math.max(1, Math.min(activeIndex, matches.length))
    matches.forEach((m, idx) => {
      if (idx === clampedIndex - 1) {
        m.classList.add('mf-search-match-active')
        m.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        m.classList.remove('mf-search-match-active')
      }
    })
  } catch (err) {
    console.warn('Error in setActivePreviewMatchIndex:', err)
  }
}

/**
 * Highlights matches in preview container.
 * Prefers the non-destructive CSS Custom Highlight API so React DOM tree is untouched.
 */
export function highlightPreviewMatches(
  container: HTMLElement | null,
  regex: RegExp | null,
  activeIndex: number
): { matchCount: number } {
  if (!container || typeof document === 'undefined') {
    return { matchCount: 0 }
  }

  clearPreviewHighlights(container)

  if (!regex) {
    return { matchCount: 0 }
  }

  try {
    if (supportsCSSHighlights()) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          const tag = parent.tagName.toUpperCase()
          if (
            tag === 'SCRIPT' ||
            tag === 'STYLE' ||
            tag === 'SVG' ||
            tag === 'PATH' ||
            parent.classList.contains('no-search') ||
            parent.closest('svg')
          ) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })

      const textNodes: Text[] = []
      let currentNode = walker.nextNode()
      while (currentNode) {
        textNodes.push(currentNode as Text)
        currentNode = walker.nextNode()
      }

      const ranges: Range[] = []
      for (const textNode of textNodes) {
        const text = textNode.nodeValue || ''
        regex.lastIndex = 0
        let match: RegExpExecArray | null
        let iterations = 0

        while ((match = regex.exec(text)) !== null && iterations < 2000) {
          iterations++
          const matchText = match[0]
          if (matchText.length === 0) {
            regex.lastIndex++
            continue
          }

          try {
            const range = new Range()
            range.setStart(textNode, match.index)
            range.setEnd(textNode, match.index + matchText.length)
            ranges.push(range)
          } catch {}
        }
      }

      cachedHighlightRanges = ranges
      const matchCount = ranges.length

      if (matchCount > 0) {
        const allHighlight = new Highlight(...ranges)
        CSS.highlights.set('mf-search-match', allHighlight)

        setActivePreviewMatchIndex(container, activeIndex)
      }

      return { matchCount }
    }

    // Fallback for environments without CSS Custom Highlight API
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        const tag = parent.tagName.toUpperCase()
        if (
          tag === 'SCRIPT' ||
          tag === 'STYLE' ||
          tag === 'SVG' ||
          tag === 'PATH' ||
          parent.classList.contains('no-search') ||
          parent.closest('svg')
        ) {
          return NodeFilter.FILTER_REJECT
        }
        return NodeFilter.FILTER_ACCEPT
      },
    })

    const textNodes: Text[] = []
    let currentNode = walker.nextNode()
    while (currentNode) {
      textNodes.push(currentNode as Text)
      currentNode = walker.nextNode()
    }

    for (const textNode of textNodes) {
      const text = textNode.nodeValue || ''
      regex.lastIndex = 0
      if (!regex.test(text)) continue

      regex.lastIndex = 0
      const fragment = document.createDocumentFragment()
      let lastIndex = 0
      let match: RegExpExecArray | null
      let iterations = 0

      while ((match = regex.exec(text)) !== null && iterations < 2000) {
        iterations++
        const matchText = match[0]
        if (matchText.length === 0) {
          regex.lastIndex++
          continue
        }

        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, match.index))
          )
        }

        const mark = document.createElement('mark')
        mark.className = 'mf-search-match'
        mark.textContent = matchText
        fragment.appendChild(mark)

        lastIndex = match.index + matchText.length
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)))
      }

      if (textNode.parentNode) {
        textNode.parentNode.replaceChild(fragment, textNode)
      }
    }

    const matches = Array.from(container.querySelectorAll('mark.mf-search-match'))
    const matchCount = matches.length

    if (matchCount > 0) {
      setActivePreviewMatchIndex(container, activeIndex)
    }

    return { matchCount }
  } catch (err) {
    console.warn('Error during highlightPreviewMatches:', err)
    return { matchCount: 0 }
  }
}
