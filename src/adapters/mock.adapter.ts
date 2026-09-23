import type { FileEntry, FileSystemAdapter, ReaderArticle } from './adapter.interface'

const STORAGE_KEY = 'markflow_virtual_fs_v1'

const DEFAULT_FILES: Record<string, string> = {
  '/welcome.md': `# 🚀 Welcome to MarkFlow

**MarkFlow** is an ultra-fast, space-optimized Markdown and Mermaid workspace built for modern developers and technical writers.

---

## ⚡ Key Highlights
- **Zero-lag editing:** Powered by CodeMirror 6 with line virtualization.
- **Off-thread Mermaid:** Heavy diagrams are rendered smoothly in a Web Worker without blocking your keystrokes.
- **Side Link Preview:** Click any link to peek into it without losing your current editor tab!
  - Try opening an internal file: [Architecture Deep Dive](./architecture.md)
  - Or check the shortcuts: [Keyboard Shortcuts](./notes/shortcuts.md)
  - Or explore external docs: [Mermaid Documentation](https://mermaid.js.org)

---

## 📊 Live Mermaid Diagram Test
Below is a live workflow diagram rendered with high performance:

\`\`\`mermaid
flowchart TD
    subgraph UI ["MarkFlow Frontend (React 19)"]
        Tab["Multi-Tab Workspace"]
        Editor["CodeMirror 6 Editor"]
        Preview["Sync-Scroll Preview"]
        Side["Side Link Inspector"]
    end

    subgraph Core ["Engine & Caching"]
        Worker["Mermaid Web Worker"]
        Cache[("SHA-256 SVG Cache")]
        AST[("LRU AST Cache")]
    end

    subgraph Storage ["FileSystemAdapter"]
        Tauri["Tauri v2 (Native OS)"]
        Docker["Go Backend (Web Docker)"]
    end

    Editor --> Worker --> Cache
    Preview --> Cache
    Side --> AST
    Editor --> Storage
    Storage --> Tauri
    Storage --> Docker
\`\`\`

---

## 📋 Markdown Syntax Showcase

### Task List
- [x] Dual Mode: Native Desktop & Web Docker
- [x] Mermaid.js support with SHA-256 cache
- [x] Multi-tab document management
- [x] Space-optimized UI with collapsible panels
- [x] VSCode shortcuts + optional Vim mode
- [ ] Mobile companion viewer

### Formatted Table
| Component | Desktop Engine | Web Docker Engine | Memory Footprint |
|:---|:---|:---|:---:|
| **MarkFlow** | **Tauri v2 (Rust)** | **Go Binary (Alpine)** | **< 35 MB** |
| Electron App | Chromium + Node | Node.js Server | ~180 MB |
| Heavy Web IDE | Browser full DOM | Large Container | ~350 MB |

> 💡 **Tip:** Press \`Ctrl+2\` or click the Split button in the top bar to toggle between Editor, Split-View, and Reader-only modes!
`,

  '/architecture.md': `# 🏛️ MarkFlow Architecture & Engineering Specs

This document details the engineering principles behind **MarkFlow**.

---

## 🔄 Interaction Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User
    participant Editor as CodeMirror 6
    participant Store as WorkspaceStore
    participant Worker as MermaidWorker
    participant Inspector as SideInspector

    User->>Editor: Type markdown & mermaid code
    Editor->>Store: Debounce content change (150ms)
    Store->>Worker: Dispatch diagram code hash
    Worker-->>Store: Return optimized SVG
    Store-->>Editor: Render 60 FPS without UI stutter

    User->>Editor: Click [Welcome](./welcome.md)
    Editor->>Inspector: Intercept click event
    Inspector->>Store: Read file via Adapter (LRU Cache)
    Inspector-->>User: Open Side Panel in < 10ms
\`\`\`

---

## 🧩 File System Abstraction Layer

The application core interacts with files strictly via \`FileSystemAdapter\`:
1. **Desktop Native (Tauri v2):** Calls Rust commands with zero network serialization.
2. **Web Docker (Go API):** Calls lightweight REST/WebSocket endpoints.
3. **Mock Adapter:** Runs fully in-browser with \`localStorage\` persistence.

Return to [Welcome Page](./welcome.md)
`,

  '/notes/shortcuts.md': `# ⌨️ MarkFlow Keyboard Shortcuts

MarkFlow provides standard VSCode-compatible shortcuts for maximum productivity.

---

## 🚀 Navigation & Workspace
| Shortcut | Action |
|---|---|
| \`Ctrl + P\` / \`Cmd + P\` | **Quick Switcher** (Fuzzy search files) |
| \`Ctrl + S\` / \`Cmd + S\` | **Save Active File** |
| \`Ctrl + W\` / \`Cmd + W\` | **Close Active Tab** |
| \`Ctrl + B\` / \`Cmd + B\` | **Toggle File Explorer Sidebar** |
| \`Ctrl + \\\` / \`Cmd + \\\` | **Toggle Side Link Inspector** |

---

## 🖥️ View Mode Toggles
| Shortcut | Action |
|---|---|
| \`Ctrl + 1\` / \`Cmd + 1\` | **Editor Only Mode** |
| \`Ctrl + 2\` / \`Cmd + 2\` | **Split View Mode (Editor + Preview)** |
| \`Ctrl + 3\` / \`Cmd + 3\` | **Reader Only Mode** |

---

## 🟢 Vim Mode
You can toggle **Vim Mode** on/off in the Settings menu (top right cog icon).
When active, standard Vim normal, insert, and visual mode commands work natively in CodeMirror!
`,
}

export class MockFileSystemAdapter implements FileSystemAdapter {
  private files: Record<string, string>

  constructor() {
    let saved: string | null = null
    try {
      if (typeof localStorage !== 'undefined') {
        saved = localStorage.getItem(STORAGE_KEY)
      }
    } catch {}

    if (saved) {
      try {
        this.files = JSON.parse(saved)
      } catch {
        this.files = { ...DEFAULT_FILES }
      }
    } else {
      this.files = { ...DEFAULT_FILES }
      this.persist()
    }
  }

  private persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.files))
      }
    } catch {}
  }

  private currentRoot = '/'

  async getWorkspaceRoot(): Promise<string> {
    return this.currentRoot
  }

  async setWorkspaceRoot(path: string): Promise<string> {
    this.currentRoot = path
    return path
  }

  async listDirectory(dirPath = '/'): Promise<FileEntry[]> {
    const cleanDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`
    const entriesMap = new Map<string, FileEntry>()

    for (const filePath of Object.keys(this.files)) {
      if (!filePath.startsWith(cleanDir)) continue
      const relative = filePath.slice(cleanDir.length)
      if (!relative) continue

      const parts = relative.split('/')
      const name = parts[0]
      const fullSubPath = cleanDir + name

      if (parts.length > 1) {
        // It is a directory
        if (!entriesMap.has(name)) {
          entriesMap.set(name, {
            name,
            path: fullSubPath,
            isDirectory: true,
            children: [],
          })
        }
      } else {
        // It is a file
        entriesMap.set(name, {
          name,
          path: fullSubPath,
          isDirectory: false,
          size: this.files[filePath].length,
          updatedAt: Date.now(),
        })
      }
    }

    const result = Array.from(entriesMap.values())
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
    return result
  }

  private openedFilesQueue: string[] = []

  setOpenedFilesForTest(files: string[]): void {
    this.openedFilesQueue = [...files]
  }

  async getOpenedFiles(): Promise<string[]> {
    const files = [...this.openedFilesQueue]
    this.openedFilesQueue = []
    return files
  }

  async readAbsoluteFile(path: string): Promise<string> {
    return this.readFile(path)
  }

  async readFile(path: string): Promise<string> {
    const normalized = path.startsWith('/') ? path : `/${path}`
    if (normalized in this.files) {
      return this.files[normalized]
    }
    throw new Error(`File not found: ${path}`)
  }

  async writeFile(path: string, content: string): Promise<void> {
    const normalized = path.startsWith('/') ? path : `/${path}`
    this.files[normalized] = content
    this.persist()
  }

  async createFile(path: string, initialContent = ''): Promise<void> {
    const normalized = path.startsWith('/') ? path : `/${path}`
    if (normalized in this.files) {
      throw new Error(`File already exists: ${path}`)
    }
    this.files[normalized] = initialContent
    this.persist()
  }

  async createDirectory(_path: string): Promise<void> {
    // Virtual directory: implied by file paths
  }

  async deleteEntry(path: string): Promise<void> {
    const normalized = path.startsWith('/') ? path : `/${path}`
    let modified = false

    for (const k of Object.keys(this.files)) {
      if (k === normalized || k.startsWith(`${normalized}/`)) {
        delete this.files[k]
        modified = true
      }
    }

    if (modified) this.persist()
  }

  async renameEntry(oldPath: string, newPath: string): Promise<void> {
    const normOld = oldPath.startsWith('/') ? oldPath : `/${oldPath}`
    const normNew = newPath.startsWith('/') ? newPath : `/${newPath}`

    if (normOld in this.files) {
      this.files[normNew] = this.files[normOld]
      delete this.files[normOld]
      this.persist()
      return
    }

    // Handle directory rename
    let modified = false
    for (const k of Object.keys(this.files)) {
      if (k.startsWith(`${normOld}/`)) {
        const suffix = k.slice(normOld.length)
        this.files[`${normNew}${suffix}`] = this.files[k]
        delete this.files[k]
        modified = true
      }
    }
    if (modified) this.persist()
  }

  async fetchExternalUrl(url: string): Promise<ReaderArticle> {
    return {
      title: `Preview: ${url}`,
      siteName: new URL(url).hostname,
      content: `### External Link Preview\n\n**URL:** [${url}](${url})\n\nThis is a clean reader view of the requested external web link. In Docker and Desktop mode, the backend sanitizes and extracts article contents without running third-party tracking scripts.`,
      excerpt: `Article content from ${url}`,
    }
  }
}
