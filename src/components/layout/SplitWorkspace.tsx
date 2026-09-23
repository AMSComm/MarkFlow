import React, { useRef } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor'
import { MarkdownPreview } from '../preview/MarkdownPreview'
import { ResizeHandle } from '../common/ResizeHandle'
import { FileEdit, AlertTriangle, RotateCcw, Save, Eye } from 'lucide-react'

export const SplitWorkspace: React.FC = () => {
  const {
    tabs,
    activeTabId,
    viewMode,
    splitRatio,
    targetAnchor,
    targetHeading,
    changeSplitRatio,
    setSplitRatio,
    reloadTabFromDisk,
    resolveConflictKeepLocal,
    resolveConflictCompareInInspector,
  } = useWorkspaceStore()
  const { syncScroll, zoomLevel } = useSettingsStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const isSyncingFromEditor = useRef(false)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const handleEditorScroll = (scrollFraction: number) => {
    if (!syncScroll || !previewRef.current) return
    isSyncingFromEditor.current = true
    const preview = previewRef.current
    preview.scrollTop = scrollFraction * (preview.scrollHeight - preview.clientHeight)
  }

  const handleSplitResize = (deltaX: number) => {
    if (!containerRef.current) return
    const totalWidth = containerRef.current.clientWidth
    if (totalWidth <= 0) return
    const deltaPercent = (deltaX / totalWidth) * 100
    changeSplitRatio(deltaPercent)
  }

  if (!activeTab) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-[#090d16] text-slate-500">
        <FileEdit size={40} className="mb-3 text-slate-600" />
        <p className="text-sm font-medium">No document open</p>
        <p className="mt-1 text-xs text-slate-600">Select a file from Explorer or press Ctrl+P</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Conflict Alert Banner */}
      {activeTab.hasExternalConflict && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-600/50 bg-amber-950/80 px-4 py-2 text-xs text-amber-200 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>Conflict detected:</strong> <code>{activeTab.title}</code> was modified externally on disk, but you have unsaved changes in MarkFlow.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => reloadTabFromDisk(activeTab.id)}
              className="flex items-center gap-1 rounded bg-amber-800/80 px-2.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-700 transition-colors border border-amber-600/50 cursor-pointer"
              title="Discard your unsaved local edits and reload the disk version"
            >
              <RotateCcw size={12} />
              <span>Reload from Disk</span>
            </button>
            <button
              onClick={() => resolveConflictKeepLocal(activeTab.id)}
              className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition-colors border border-slate-700 cursor-pointer"
              title="Keep local unsaved edits. Pressing Save will overwrite the disk version"
            >
              <Save size={12} />
              <span>Keep My Version</span>
            </button>
            <button
              onClick={() => resolveConflictCompareInInspector(activeTab.id)}
              className="flex items-center gap-1 rounded bg-cyan-950/80 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-900 transition-colors border border-cyan-800/60 cursor-pointer"
              title="Preview the external disk content in Side Inspector to compare"
            >
              <Eye size={12} />
              <span>Compare in Inspector</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor & Preview Split Panes */}
      <div
        ref={containerRef}
        style={{ zoom: zoomLevel && zoomLevel !== 100 ? `${zoomLevel}%` : undefined }}
        className="flex flex-1 overflow-hidden"
      >
        {/* Editor Pane */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div
            style={{ width: viewMode === 'split' ? `${splitRatio}%` : '100%' }}
            className="h-full overflow-hidden"
          >
            <CodeMirrorEditor
              key={activeTab.id}
              content={activeTab.content}
              tabId={activeTab.id}
              onScroll={handleEditorScroll}
            />
          </div>
        )}

        {/* Resizer handle between Editor and Preview */}
        {viewMode === 'split' && (
          <ResizeHandle
            onResize={handleSplitResize}
            onDoubleClick={() => setSplitRatio(50)}
            title="Drag to adjust split ratio (Double-click for 50/50)"
          />
        )}

        {/* Preview Pane */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            style={{ width: viewMode === 'split' ? `${100 - splitRatio}%` : '100%' }}
            className="h-full overflow-hidden"
          >
            <MarkdownPreview
              content={activeTab.content}
              containerRef={previewRef}
              targetAnchor={targetAnchor}
              targetHeading={targetHeading}
              onScroll={() => {
                // Can also sync back if needed
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
