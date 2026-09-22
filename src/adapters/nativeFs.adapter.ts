import type { FileEntry, FileSystemAdapter, ReaderArticle } from './adapter.interface'

/**
 * Native Browser FileSystemAdapter using the W3C File System Access API.
 * Allows the Web version to directly open, browse, and edit folders on the user's local computer.
 */
export class NativeBrowserFileSystemAdapter implements FileSystemAdapter {
  private rootHandle: FileSystemDirectoryHandle
  private handleMap: Map<string, FileSystemHandle> = new Map()

  constructor(rootHandle: FileSystemDirectoryHandle) {
    this.rootHandle = rootHandle
  }

  async getWorkspaceRoot(): Promise<string> {
    return `/${this.rootHandle.name}`
  }

  async listDirectory(_dirPath = '/'): Promise<FileEntry[]> {
    this.handleMap.clear()
    this.handleMap.set('/', this.rootHandle)

    const scan = async (
      dirHandle: FileSystemDirectoryHandle,
      currentPath: string
    ): Promise<FileEntry[]> => {
      const entries: FileEntry[] = []

      // File System Access API async iterator
      for await (const [name, handle] of dirHandle.entries()) {
        // Skip hidden dot-files/folders
        if (name.startsWith('.')) continue

        const entryPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`
        this.handleMap.set(entryPath, handle)

        if (handle.kind === 'directory') {
          const children = await scan(handle as FileSystemDirectoryHandle, entryPath)
          entries.push({
            name,
            path: entryPath,
            isDirectory: true,
            children,
          })
        } else {
          // Only show markdown / text files or relevant files
          const isMd = name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.txt')
          if (isMd) {
            const file = await (handle as FileSystemFileHandle).getFile()
            entries.push({
              name,
              path: entryPath,
              isDirectory: false,
              size: file.size,
              updatedAt: file.lastModified,
            })
          }
        }
      }

      entries.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.name.localeCompare(b.name)
      })

      return entries
    }

    return await scan(this.rootHandle, '/')
  }

  async readFile(path: string): Promise<string> {
    const handle = this.handleMap.get(path)
    if (!handle || handle.kind !== 'file') {
      throw new Error(`File not found or not accessible: ${path}`)
    }
    const file = await (handle as FileSystemFileHandle).getFile()
    return await file.text()
  }

  async writeFile(path: string, content: string): Promise<void> {
    const handle = this.handleMap.get(path)
    if (!handle || handle.kind !== 'file') {
      throw new Error(`Cannot write to file: ${path}`)
    }
    const writable = await (handle as FileSystemFileHandle).createWritable()
    await writable.write(content)
    await writable.close()
  }

  async createFile(path: string, initialContent = ''): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) throw new Error('Invalid path')

    const fileName = parts.pop()!
    let currentDir = this.rootHandle

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }

    const fileHandle = await currentDir.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(initialContent)
    await writable.close()

    this.handleMap.set(path, fileHandle)
  }

  async createDirectory(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    let currentDir = this.rootHandle
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }
  }

  async deleteEntry(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    if (parts.length === 0) return

    const nameToDelete = parts.pop()!
    let currentDir = this.rootHandle

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part)
    }

    await currentDir.removeEntry(nameToDelete, { recursive: true })
    this.handleMap.delete(path)
  }

  async renameEntry(oldPath: string, newPath: string): Promise<void> {
    // Read old content, write to new, delete old
    const content = await this.readFile(oldPath)
    await this.createFile(newPath, content)
    await this.deleteEntry(oldPath)
  }

  async fetchExternalUrl(url: string): Promise<ReaderArticle> {
    return {
      title: `Preview: ${url}`,
      siteName: new URL(url).hostname,
      content: `### External Link Preview\n\n**URL:** [${url}](${url})\n\nViewing in Native Browser Workspace mode.`,
      excerpt: url,
    }
  }
}
