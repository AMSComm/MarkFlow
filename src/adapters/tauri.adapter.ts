import type { FileEntry, FileSystemAdapter, ReaderArticle } from './adapter.interface'

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
    __TAURI__?: {
      core?: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>
      }
    }
  }
}

export class TauriFileSystemAdapter implements FileSystemAdapter {
  private invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    if (window.__TAURI__?.core?.invoke) {
      return window.__TAURI__.core.invoke<T>(cmd, args)
    }
    // Fallback if imported dynamically
    return Promise.reject(new Error('Tauri core invoke is not available in this context'))
  }

  async getWorkspaceRoot(): Promise<string> {
    return await this.invoke<string>('get_workspace_root')
  }

  async listDirectory(path = ''): Promise<FileEntry[]> {
    return await this.invoke<FileEntry[]>('list_directory', { path })
  }

  async readFile(path: string): Promise<string> {
    return await this.invoke<string>('read_file', { path })
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.invoke('write_file', { path, content })
  }

  async createFile(path: string, initialContent = ''): Promise<void> {
    await this.invoke('create_file', { path, content: initialContent })
  }

  async createDirectory(path: string): Promise<void> {
    await this.invoke('create_directory', { path })
  }

  async deleteEntry(path: string): Promise<void> {
    await this.invoke('delete_entry', { path })
  }

  async renameEntry(oldPath: string, newPath: string): Promise<void> {
    await this.invoke('rename_entry', { oldPath, newPath })
  }

  async fetchExternalUrl(url: string): Promise<ReaderArticle> {
    try {
      return await this.invoke<ReaderArticle>('fetch_reader_article', { url })
    } catch {
      return {
        title: url,
        content: `Preview: [${url}](${url})`,
        siteName: new URL(url).hostname,
      }
    }
  }
}
