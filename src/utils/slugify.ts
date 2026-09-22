/**
 * Normalizes heading text into a URL/anchor slug.
 * e.g. "4. Architecture & Design" -> "4-architecture-design"
 * e.g. "4-abc" -> "4-abc"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`]/g, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Checks if a heading matches an anchor string.
 * Supports exact match, normalized alphanumeric match, or prefix match.
 */
export function matchesAnchor(headingText: string, headingSlug: string, anchor: string): boolean {
  const cleanAnchor = anchor.replace(/^#/, '').toLowerCase().trim()
  if (!cleanAnchor) return false

  const cleanSlug = headingSlug.toLowerCase().trim()
  if (cleanSlug === cleanAnchor) return true

  // Strip all hyphens and non-alphanumeric for resilient matching (e.g. "4. ABC" vs "4-abc" vs "4abc")
  const normAnchor = cleanAnchor.replace(/[^a-z0-9]/g, '')
  const normSlug = cleanSlug.replace(/[^a-z0-9]/g, '')
  if (normAnchor && normSlug && (normSlug === normAnchor || normSlug.startsWith(normAnchor))) {
    return true
  }

  const normHeading = headingText.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normHeading && normAnchor && (normHeading === normAnchor || normHeading.startsWith(normAnchor))) {
    return true
  }

  return false
}
