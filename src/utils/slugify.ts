function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
}

/**
 * Normalizes heading text into a URL/anchor slug.
 * Supports Vietnamese accents and special characters cleanly.
 * e.g. "4. Architecture & Design" -> "4-architecture-design"
 * e.g. "4. Giới thiệu" -> "4-gioi-thieu"
 */
export function slugify(text: string): string {
  const withoutDiacritics = removeDiacritics(text)
  return withoutDiacritics
    .toLowerCase()
    .replace(/[*_`~[\]()]/g, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Checks if a heading matches an anchor string.
 * Supports exact match, normalized alphanumeric match, URL decoded match, or prefix/suffix match.
 */
export function matchesAnchor(headingText: string, headingSlug: string, anchor: string): boolean {
  let cleanAnchor = anchor.replace(/^#/, '').trim()
  try {
    cleanAnchor = decodeURIComponent(cleanAnchor)
  } catch {}
  cleanAnchor = cleanAnchor.toLowerCase().trim()
  if (!cleanAnchor) return false

  const cleanSlug = headingSlug.toLowerCase().trim()
  if (cleanSlug === cleanAnchor) return true

  const anchorSlug = slugify(cleanAnchor)
  if (anchorSlug && (cleanSlug === anchorSlug || cleanSlug.includes(anchorSlug) || anchorSlug.includes(cleanSlug))) {
    return true
  }

  // Remove leading numbering like "4-", "4.", "4 "
  const strippedSlug = cleanSlug.replace(/^\d+[-_.]*/, '')
  const strippedAnchor = cleanAnchor.replace(/^\d+[-_.]*/, '')
  if (strippedSlug && strippedAnchor && (strippedSlug === strippedAnchor || strippedSlug === anchorSlug)) {
    return true
  }

  // Resilient alphanumeric match with diacritics removed
  const normAnchor = removeDiacritics(cleanAnchor).toLowerCase().replace(/[^a-z0-9]/g, '')
  const normSlug = removeDiacritics(cleanSlug).toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normAnchor && normSlug) {
    if (
      normSlug === normAnchor ||
      normSlug.startsWith(normAnchor) ||
      normSlug.includes(normAnchor) ||
      normAnchor.includes(normSlug)
    ) {
      return true
    }
  }

  const normHeading = removeDiacritics(headingText).toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normHeading && normAnchor) {
    if (
      normHeading === normAnchor ||
      normHeading.startsWith(normAnchor) ||
      normHeading.includes(normAnchor) ||
      normAnchor.includes(normHeading)
    ) {
      return true
    }
  }

  return false
}
