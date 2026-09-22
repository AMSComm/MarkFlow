import mermaid from 'mermaid'

// Initialize Mermaid with clean modern dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#0f172a',
    primaryColor: '#0ea5e9',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#38bdf8',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#1e293b',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
})

// In-memory LRU / Map cache by diagram source hash
const svgCache = new Map<string, string>()

// Fast string hashing (DJB2 / Murmur hybrid) for instant hash lookup
function fastHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return `mmd_${(hash >>> 0).toString(16)}`
}

let counter = 0

/**
 * Render Mermaid code to SVG string with hash-based caching.
 * If the diagram has been rendered before with identical code,
 * returns immediately from memory in < 1ms.
 */
export async function renderMermaidDiagram(code: string): Promise<string> {
  const trimmed = code.trim()
  const key = fastHash(trimmed)

  if (svgCache.has(key)) {
    return svgCache.get(key)!
  }

  const id = `mermaid_chart_${Date.now()}_${++counter}`

  try {
    const { svg } = await mermaid.render(id, trimmed)
    svgCache.set(key, svg)
    return svg
  } catch (error) {
    // Remove lingering temp error elements created by mermaid in document.body
    const el = document.getElementById(id)
    if (el) el.remove()
    const errorEl = document.getElementById(`d${id}`)
    if (errorEl) errorEl.remove()

    console.warn('Mermaid syntax error:', error)
    throw error
  }
}
