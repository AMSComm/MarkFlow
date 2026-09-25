import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  copied: boolean
  showDetails: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MarkFlow ErrorBoundary caught an error]:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    try {
      this.setState({ hasError: false, error: null, errorInfo: null })
      window.location.reload()
    } catch {
      window.location.reload()
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleCopy = async () => {
    const { error, errorInfo } = this.state
    const details = [
      `MarkFlow Error Report:`,
      `Message: ${error?.message || 'Unknown error'}`,
      `Stack: ${error?.stack || 'No stack'}`,
      `Component Stack: ${errorInfo?.componentStack || 'No component stack'}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n\n')

    try {
      await navigator.clipboard.writeText(details)
      this.setState({ copied: true })
      setTimeout(() => this.setState({ copied: false }), 2000)
    } catch {
      console.warn('Failed to copy to clipboard')
    }
  }

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }))
  }

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong in MarkFlow' } = this.props
      const { error, copied, showDetails } = this.state

      return (
        <div className="flex h-full w-full min-h-[300px] flex-col items-center justify-center bg-[#090d16] p-6 text-slate-200 select-none">
          <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-[#0f172a] p-6 shadow-2xl shadow-black/80">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">{fallbackTitle}</h3>
                <p className="text-xs text-slate-400">
                  Your files on disk are safe. You can recover or reload the view.
                </p>
              </div>
            </div>

            {/* Error Message */}
            <div className="mt-4 rounded-md border border-slate-800 bg-[#090d16] p-3 text-xs font-mono text-red-300 break-words max-h-32 overflow-y-auto">
              {error?.message || 'Unknown runtime error'}
            </div>

            {/* Expandable Technical Details */}
            <div className="mt-3">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showDetails ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                <span>Technical details & stack</span>
              </button>

              {showDetails && (
                <pre className="mt-2 max-h-40 overflow-auto rounded border border-slate-800 bg-black/50 p-2 font-mono text-[10px] text-slate-400 select-text">
                  {error?.stack}
                </pre>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={this.handleCopy}
                className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                title="Copy error details to clipboard"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy Error'}</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-1.5 rounded bg-[#0ea5e9] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#38bdf8] transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Reload App</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
