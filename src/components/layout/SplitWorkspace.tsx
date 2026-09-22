import React, { useRef } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor'
import { MarkdownPreview } from '../preview/MarkdownPreview'
import { FileEdit } from 'lucide-react'

export const SplitWorkspace: React.FC = () => {
  const { tabs, activeTabId, viewMode } = useWorkspaceStore()
  const { syncScroll } = useSettingsStore()
  const previewRef = useRef<HTMLDivElement>(null)
  const isSyncingFromEditor = useRef(false)

  const activeTab = tabs.find((t) => t.id === activeTabId)

  const handleEditorScroll = (scrollFraction: number) => {
    if (!syncScroll || !previewRef.current) return
    isSyncingFromEditor.current = true
    const preview = previewRef.current
    preview.scrollTop = scrollFraction * (preview.scrollHeight - preview.clientHeight)
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
    <div className="flex flex-1 overflow-hidden">
      {/* Editor Pane */}
      {(viewMode === 'split' || viewMode === 'editor') && (
        <div
          className={`h-full overflow-hidden ${
            viewMode === 'split' ? 'w-1/2 border-r border-[#1e293b]' : 'w-full'
          }`}
        >
          <CodeMirrorEditor
            key={activeTab.id}
            content={activeTab.content}
            tabId={activeTab.id}
            onScroll={handleEditorScroll}
          />
        </div>
      )}

      {/* Preview Pane */}
      {(viewMode === 'split' || viewMode === 'preview') && (
        <div className={`h-full overflow-hidden ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
          <MarkdownPreview
            content={activeTab.content}
            containerRef={previewRef}
            onScroll={() => {
              // Can also sync back if needed
            }}
          />
        </div>
      )}
    </div>
  )
}
