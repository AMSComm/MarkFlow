import { describe, it, expect } from 'vitest'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const POPULAR_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'json',
  'html',
  'css',
  'bash',
  'shell',
  'sql',
  'yaml',
  'markdown',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'java',
  'xml',
  'dockerfile',
]

function renderFencedCodeBlock(code: string, rawInfo: string, escapeHtml: (s: string) => string): string {
  const lang = (rawInfo || '').trim().split(/\s+/)[0].toLowerCase()
  let highlightedHtml = ''
  let displayLang = lang

  if (lang && hljs.getLanguage(lang)) {
    try {
      const res = hljs.highlight(code, { language: lang, ignoreIllegals: true })
      highlightedHtml = res.value
      displayLang = lang
    } catch {
      highlightedHtml = escapeHtml(code)
    }
  } else {
    const sample = code.length > 3000 ? code.split('\n').slice(0, 50).join('\n') : code
    try {
      const auto = hljs.highlightAuto(sample, POPULAR_LANGUAGES)
      if (auto.language && auto.relevance >= 2) {
        displayLang = auto.language
        const res = hljs.highlight(code, { language: auto.language, ignoreIllegals: true })
        highlightedHtml = res.value
      } else {
        displayLang = lang || 'text'
        highlightedHtml = escapeHtml(code)
      }
    } catch {
      displayLang = lang || 'text'
      highlightedHtml = escapeHtml(code)
    }
  }

  const encodedCode = encodeURIComponent(code)

  return `<div class="code-block-wrapper group/code my-3 rounded-lg border border-slate-800 bg-[#090d16] overflow-hidden">
  <div class="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] border-b border-slate-800 text-[11px] font-mono text-slate-400 select-none">
    <span class="uppercase font-semibold tracking-wider text-cyan-400/90">${displayLang}</span>
    <button
      type="button"
      class="copy-code-btn inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
      data-code="${encodedCode}"
      title="Copy code to clipboard"
    >
      <span class="copy-label text-[11px]">Copy</span>
    </button>
  </div>
  <pre class="!m-0 !p-3 !bg-transparent overflow-x-auto text-[13px] leading-relaxed"><code class="hljs language-${displayLang}">${highlightedHtml}</code></pre>
</div>`
}

describe('CodeBlock - Syntax Highlighting & Copy Button', () => {
  const md = new MarkdownIt({ html: true })
  md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx]
    return renderFencedCodeBlock(token.content, token.info, md.utils.escapeHtml)
  }

  it('highlights explicit language tags correctly and renders copy button', () => {
    const markdown = '```typescript\nconst count: number = 42;\n```'
    const html = md.render(markdown)

    expect(html).toContain('code-block-wrapper')
    expect(html).toContain('copy-code-btn')
    expect(html).toContain('data-code="const%20count%3A%20number%20%3D%2042%3B%0A"')
    expect(html).toContain('typescript</span>')
    expect(html).toContain('hljs-keyword')
  })

  it('auto-detects code language when no language tag is provided', () => {
    const markdown = '```\ndef calculate_sum(a, b):\n    return a + b\n```'
    const html = md.render(markdown)

    expect(html).toContain('code-block-wrapper')
    expect(html).toContain('copy-code-btn')
    expect(html).toContain('python</span>')
    expect(html).toContain('hljs-keyword')
  })

  it('handles unknown or plaintext blocks gracefully', () => {
    const markdown = '```plaintext\nJust plain text\n```'
    const html = md.render(markdown)

    expect(html).toContain('code-block-wrapper')
    expect(html).toContain('copy-code-btn')
    expect(html).toContain('Just plain text')
  })
})
