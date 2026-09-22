import type { FileSystemAdapter } from './adapter.interface'
import { TauriFileSystemAdapter } from './tauri.adapter'
import { HttpFileSystemAdapter } from './http.adapter'
import { MockFileSystemAdapter } from './mock.adapter'

export * from './adapter.interface'
export * from './tauri.adapter'
export * from './http.adapter'
export * from './mock.adapter'
export * from './nativeFs.adapter'

let activeAdapter: FileSystemAdapter | null = null

export function getFileSystemAdapter(): FileSystemAdapter {
  if (activeAdapter) return activeAdapter

  // 1. Check if running inside Tauri Desktop
  if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.__TAURI__)) {
    activeAdapter = new TauriFileSystemAdapter()
    return activeAdapter
  }

  // 2. Default to mock adapter for frontend development / standalone mode,
  // or HttpFileSystemAdapter if Docker web mode flag or production build is running on server
  if (typeof window !== 'undefined' && window.location.port === '8080') {
    activeAdapter = new HttpFileSystemAdapter()
  } else {
    activeAdapter = new MockFileSystemAdapter()
  }

  return activeAdapter
}

export function setFileSystemAdapter(adapter: FileSystemAdapter) {
  activeAdapter = adapter
}
