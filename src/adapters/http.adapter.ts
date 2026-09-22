import type { FileEntry, FileSystemAdapter, ReaderArticle } from './adapter.interface'

export class HttpFileSystemAdapter implements FileSystemAdapter {
  private baseUrl = ''

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async getWorkspaceRoot(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/fs/root`)
    if (!res.ok) throw new Error('Failed to fetch workspace root')
    const data = await res.json()
    return data.root
  }

  async listDirectory(path = ''): Promise<FileEntry[]> {
    const res = await fetch(`${this.baseUrl}/api/fs/list?path=${encodeURIComponent(path)}`)
    if (!res.ok) throw new Error(`Failed to list directory: ${path}`)
    return await res.json()
  }

  async readFile(path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/fs/read?path=${encodeURIComponent(path)}`)
    if (!res.ok) throw new Error(`Failed to read file: ${path}`)
    return await res.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/fs/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    })
    if (!res.ok) throw new Error(`Failed to write file: ${path}`)
  }

  async createFile(path: string, initialContent = ''): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/fs/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: initialContent, isDir: false }),
    })
    if (!res.ok) throw new Error(`Failed to create file: ${path}`)
  }

  async createDirectory(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/fs/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, isDir: true }),
    })
    if (!res.ok) throw new Error(`Failed to create directory: ${path}`)
  }

  async deleteEntry(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/fs/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    if (!res.ok) throw new Error(`Failed to delete: ${path}`)
  }

  async renameEntry(oldPath: string, newPath: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/fs/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    })
    if (!res.ok) throw new Error(`Failed to rename: ${oldPath}`)
  }

  async fetchExternalUrl(url: string): Promise<ReaderArticle> {
    const res = await fetch(`${this.baseUrl}/api/reader?url=${encodeURIComponent(url)}`)
    if (!res.ok) {
      return {
        title: url,
        content: `Could not load external article preview for [${url}](${url}).`,
        siteName: new URL(url).hostname,
      }
    }
    return await res.json()
  }
}
