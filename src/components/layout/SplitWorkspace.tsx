import React, { useRef } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor'
import { MarkdownPreview } from '../preview/MarkdownPreview'
import { ResizeHandle } from '../common/ResizeHandle'
import { FileEdit } from 'lucide-react'

export const SplitWorkspace: React.FC = () => {
  const {
    tabs,
    activeTabId,
    viewMode,
    splitRatio,
    targetAnchor,
    changeSplitRatio,
    setSplitRatio,
  } = useWorkspaceStore()
  const { syncScroll } = useSettingsStore()
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
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
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
            onScroll={() => {
              // Can also sync back if needed
            }}
          />
        </div>
      )}
    </div>
  )
}
