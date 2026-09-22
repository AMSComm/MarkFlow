import React from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { MarkdownPreview } from '../preview/MarkdownPreview'
import { ResizeHandle } from '../common/ResizeHandle'
import { X, ExternalLink, FileText, Globe, Columns, Loader2, Hash, Layers, FileCode } from 'lucide-react'

export const SideInspector: React.FC = () => {
  const {
    inspector,
    closeInspector,
    openFile,
    inspectorWidth,
    changeInspectorWidth,
    setInspectorWidth,
    toggleInspectorSectionMode,
  } = useWorkspaceStore()

  if (!inspector.isOpen) return null

  const handleOpenAsMainTab = () => {
    if (inspector.type === 'doc' && inspector.pathOrUrl) {
      openFile(inspector.pathOrUrl, inspector.targetAnchor || undefined)
      closeInspector()
    }
  }

  const handleOpenInExternalBrowser = () => {
    if (inspector.pathOrUrl) {
      window.open(inspector.pathOrUrl, '_blank')
    }
  }

  const handleResize = (deltaX: number) => {
    // Dragging left (negative deltaX) expands the right-anchored panel
    changeInspectorWidth(-deltaX)
  }

  return (
    <div className="relative flex h-full shrink-0">
      {/* Resizer Handle on the left border of Side Inspector */}
      <ResizeHandle
        onResize={handleResize}
        onDoubleClick={() => setInspectorWidth(380)}
        title="Drag to resize Inspector (Double-click for default 380px)"
      />

      <div
        style={{ width: `${inspectorWidth}px` }}
        className="flex h-full flex-col bg-[#0b0f19] shadow-xl select-text overflow-hidden"
      >
        {/* Inspector Header */}
        <div className="flex h-9 select-none items-center justify-between border-b border-[#1e293b] bg-[#0f172a] px-3">
          <div className="flex items-center gap-2 truncate text-xs font-medium text-slate-200">
            {inspector.type === 'doc' ? (
              <FileText size={14} className="text-cyan-400 shrink-0" />
            ) : (
              <Globe size={14} className="text-sky-400 shrink-0" />
            )}
            <span className="truncate max-w-[160px]" title={inspector.title}>
              {inspector.title || 'Side Preview'}
            </span>
            {inspector.targetAnchor && (
              <span className="flex items-center gap-0.5 rounded bg-cyan-950/70 border border-cyan-800/50 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 shrink-0">
                <Hash size={10} />
                <span className="truncate max-w-[80px]">{inspector.targetAnchor}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Toggle between Section Only and Full Document */}
            {inspector.type === 'doc' && inspector.fullContent && inspector.targetAnchor && (
              <button
                onClick={toggleInspectorSectionMode}
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  inspector.isSectionOnly
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 hover:bg-cyan-900/60'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
                title={
                  inspector.isSectionOnly
                    ? 'Click to expand to full document'
                    : 'Click to slice and view section only'
                }
              >
                {inspector.isSectionOnly ? (
                  <>
                    <FileCode size={11} className="text-cyan-400" />
                    <span>Section</span>
                  </>
                ) : (
                  <>
                    <Layers size={11} className="text-slate-400" />
                    <span>Full doc</span>
                  </>
                )}
              </button>
            )}

            {inspector.type === 'doc' && (
              <button
                onClick={handleOpenAsMainTab}
                className="rounded p-1 text-slate-400 hover:bg-[#1e293b] hover:text-slate-100 transition-colors"
                title="Open in Main Tab and focus anchor"
              >
                <Columns size={13} />
              </button>
            )}

            {inspector.type === 'web' && (
              <button
                onClick={handleOpenInExternalBrowser}
                className="rounded p-1 text-slate-400 hover:bg-[#1e293b] hover:text-slate-100 transition-colors"
                title="Open in Browser"
              >
                <ExternalLink size={13} />
              </button>
            )}

            <button
              onClick={closeInspector}
              className="rounded p-1 text-slate-400 hover:bg-[#1e293b] hover:text-slate-100 transition-colors"
              title="Close Inspector (Ctrl+\\)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Section Only Indicator Banner */}
        {inspector.isSectionOnly && inspector.targetAnchor && (
          <div className="flex items-center justify-between border-b border-cyan-900/50 bg-cyan-950/30 px-3 py-1 text-[10.5px] text-cyan-300 select-none">
            <span className="truncate">
              Viewing section: <strong>#{inspector.targetAnchor}</strong>
            </span>
            <button
              onClick={toggleInspectorSectionMode}
              className="ml-2 shrink-0 text-cyan-400 hover:underline hover:text-cyan-200 cursor-pointer font-medium"
            >
              View Full Doc →
            </button>
          </div>
        )}

        {/* Inspector Content */}
        <div className="flex-1 overflow-y-auto">
          {inspector.loading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 size={18} className="animate-spin text-cyan-500" />
              <span>Loading preview...</span>
            </div>
          ) : (
            <div className="p-2">
              <MarkdownPreview
                content={inspector.content}
                targetAnchor={inspector.isSectionOnly ? null : inspector.targetAnchor}
                isInspector
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
