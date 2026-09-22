import React, { useEffect, useState } from 'react'
import { renderMermaidDiagram } from '../../utils/mermaidRenderer'
import { AlertCircle, Copy, Check } from 'lucide-react'

interface MermaidBlockProps {
  code: string
}

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code }) => {
  const [svgHtml, setSvgHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let isMounted = true

    renderMermaidDiagram(code)
      .then((svg) => {
        if (isMounted) {
          setSvgHtml(svg)
          setError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError((err as Error).message || 'Invalid Mermaid Syntax')
          setSvgHtml(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [code])

  const copyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-xs font-mono">
        <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
          <AlertCircle size={15} />
          <span>Mermaid Syntax Warning</span>
        </div>
        <pre className="text-red-300 overflow-x-auto whitespace-pre-wrap">{error}</pre>
        <details className="mt-2 text-slate-400 cursor-pointer">
          <summary className="hover:text-slate-200">View Raw Mermaid Code</summary>
          <pre className="p-2 mt-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
            {code}
          </pre>
        </details>
      </div>
    )
  }

  return (
    <div className="group relative my-5 rounded-lg border border-slate-800 bg-slate-950/60 p-4 shadow-sm transition-all hover:border-slate-700">
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1.5 z-10">
        <button
          onClick={copyCode}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          title="Copy Mermaid Code"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      {svgHtml ? (
        <div
          className="flex justify-center overflow-x-auto p-2 [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      ) : (
        <div className="flex h-32 items-center justify-center text-xs text-slate-500">
          <span className="animate-pulse">Rendering diagram...</span>
        </div>
      )}
    </div>
  )
}
