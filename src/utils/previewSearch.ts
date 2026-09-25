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
 * Strips all <mark class="mf-search-match"> from container and normalizes text nodes.
 */
export function clearPreviewHighlights(container: HTMLElement): void {
  if (typeof document === 'undefined' || !container || typeof container.querySelectorAll !== 'function') {
    return
  }

  const marks = container.querySelectorAll('mark.mf-search-match')
  marks.forEach((mark) => {
    const parent = mark.parentNode
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark)
      }
      parent.removeChild(mark)
    }
  })
  if (typeof container.normalize === 'function') {
    container.normalize()
  }
}

/**
 * Traverses text nodes in container, wraps matches in <mark class="mf-search-match">,
 * and highlights active index.
 */
export function highlightPreviewMatches(
  container: HTMLElement,
  regex: RegExp | null,
  activeIndex: number
): { matchCount: number } {
  if (typeof document === 'undefined' || !container || typeof container.querySelectorAll !== 'function') {
    return { matchCount: 0 }
  }

  clearPreviewHighlights(container)

  if (!regex) {
    return { matchCount: 0 }
  }

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
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
    }
  )

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

    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0]
      if (matchText.length === 0) {
        regex.lastIndex++
        continue
      }

      // Add text preceding the match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)))
      }

      // Wrap matched text in mark
      const mark = document.createElement('mark')
      mark.className = 'mf-search-match'
      mark.textContent = matchText
      fragment.appendChild(mark)

      lastIndex = match.index + matchText.length
    }

    // Add remaining text
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
    const clampedIndex = Math.max(1, Math.min(activeIndex, matchCount))
    const targetMatch = matches[clampedIndex - 1] as HTMLElement | undefined
    if (targetMatch) {
      targetMatch.classList.add('mf-search-match-active')
      targetMatch.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return { matchCount }
}
