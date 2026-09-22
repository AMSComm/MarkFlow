import React, { useRef } from 'react'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import type { FileEntry } from '../../adapters/adapter.interface'
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  FolderInput,
  Upload,
} from 'lucide-react'

export const FileTree: React.FC = () => {
  const {
    fileTree,
    expandedFolders,
    toggleFolder,
    openFile,
    createFile,
    deleteFile,
    refreshFileTree,
    openLocalDirectory,
    openLocalFile,
    openDroppedFiles,
  } = useWorkspaceStore()

  const isTauri =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
        (window as unknown as { __TAURI__?: unknown }).__TAURI__
    )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleCreateInRoot = () => {
    const filename = prompt('Create file in workspace (e.g. document.md):', 'new-doc.md')
    if (filename) {
      const clean = filename.startsWith('/') ? filename : `/${filename}`
      createFile(clean)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      openDroppedFiles(Array.from(e.target.files))
    }
  }

  const renderEntry = (entry: FileEntry, depth = 0) => {
    if (entry.isDirectory) {
      const isExpanded = expandedFolders.has(entry.path)
      return (
        <div key={entry.path}>
          <div
            onClick={() => toggleFolder(entry.path)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className="group flex h-7 cursor-pointer items-center justify-between rounded px-2 text-xs text-slate-300 hover:bg-[#1e293b]"
          >
            <div className="flex items-center gap-1.5 truncate">
              {isExpanded ? (
                <ChevronDown size={14} className="text-slate-500" />
              ) : (
                <ChevronRight size={14} className="text-slate-500" />
              )}
              {isExpanded ? (
                <FolderOpen size={14} className="text-cyan-400" />
              ) : (
                <Folder size={14} className="text-cyan-500" />
              )}
              <span className="truncate font-medium">{entry.name}</span>
            </div>

            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const name = prompt(`New file inside ${entry.path}:`)
                  if (name) {
                    createFile(`${entry.path}/${name}`)
                  }
                }}
                className="rounded p-0.5 text-slate-400 hover:text-slate-100"
                title="New File Inside"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {isExpanded && entry.children && (
            <div>{entry.children.map((child) => renderEntry(child, depth + 1))}</div>
          )}
        </div>
      )
    }

    return (
      <div
        key={entry.path}
        onClick={() => openFile(entry.path)}
        style={{ paddingLeft: `${depth * 12 + 22}px` }}
        className="group flex h-7 cursor-pointer items-center justify-between rounded px-2 text-xs text-slate-400 hover:bg-[#1e293b] hover:text-slate-200"
      >
        <div className="flex items-center gap-1.5 truncate">
          <FileText size={13} className="text-slate-400 group-hover:text-cyan-400" />
          <span className="truncate">{entry.name}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`Delete file "${entry.name}"?`)) {
              deleteFile(entry.path)
            }
          }}
          className="rounded p-0.5 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400"
          title="Delete File"
        >
          <Trash2 size={12} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col select-none bg-[#0f172a] text-slate-300">
      {/* Hidden file inputs for local file/folder picking */}
      <label className="sr-only" htmlFor="markflow-file-input">Upload markdown files</label>
      <input
        id="markflow-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload markdown files"
      />
      <label className="sr-only" htmlFor="markflow-folder-input">Upload markdown folder</label>
      <input
        id="markflow-folder-input"
        ref={folderInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory
        webkitdirectory=""
        directory=""
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload markdown folder"
      />

      {/* Explorer Header */}
      <div className="flex h-9 items-center justify-between border-b border-[#1e293b] px-3">
        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (isTauri || 'showDirectoryPicker' in window) {
                openLocalDirectory()
              } else {
                folderInputRef.current?.click()
              }
            }}
            className="rounded p-1 text-slate-400 hover:bg-[#1e293b] hover:text-cyan-400"
            title="Open Local Folder on your computer"
          >
            <FolderInput size={14} />
          </button>
          <button
            onClick={() => {
              if (isTauri) {
                openLocalFile()
              } else {
                fileInputRef.current?.click()
              }
            }}
            className="rounded p-1 text-slate-400 hover:bg-[#1e293b] hover:text-cyan-400"
            title="Open Local Markdown File"
          >
            <Upload size={13} />
          </button>
          <button
            onClick={handleCreateInRoot}
            className="rounded p-1 text-slate-400 hover:bg-[#1e293b] hover:text-slate-200"
            title="New Markdown File"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => refreshFileTree()}
            className="rounded p-1 text-slate-400 hover:bg-[#1e293b] hover:text-slate-200"
            title="Refresh Explorer"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs text-slate-400 mb-3 font-medium">No folder open</p>
            <button
              onClick={() => {
                if (isTauri || 'showDirectoryPicker' in window) {
                  openLocalDirectory()
                } else {
                  folderInputRef.current?.click()
                }
              }}
              className="flex items-center gap-1.5 rounded-md bg-cyan-600/30 border border-cyan-500/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-600/50 transition-colors mb-2 w-full justify-center cursor-pointer"
            >
              <FolderInput size={14} />
              <span>Open Local Folder</span>
            </button>
            <button
              onClick={() => {
                if (isTauri) {
                  openLocalFile()
                } else {
                  fileInputRef.current?.click()
                }
              }}
              className="flex items-center gap-1.5 rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors w-full justify-center cursor-pointer"
            >
              <Upload size={13} />
              <span>Open Local File</span>
            </button>
            <span className="mt-3 text-[10px] text-slate-500">
              or drag & drop files here
            </span>
          </div>
        ) : (
          fileTree.map((entry) => renderEntry(entry, 0))
        )}
      </div>
    </div>
  )
}
