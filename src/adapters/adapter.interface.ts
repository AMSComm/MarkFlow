export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileEntry[];
  size?: number;
  updatedAt?: number;
}

export interface ReaderArticle {
  title: string;
  content: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
}

export interface FileSystemAdapter {
  getWorkspaceRoot(): Promise<string>;
  listDirectory(path?: string): Promise<FileEntry[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  createFile(path: string, initialContent?: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  deleteEntry(path: string): Promise<void>;
  renameEntry(oldPath: string, newPath: string): Promise<void>;
  fetchExternalUrl(url: string): Promise<ReaderArticle>;
}
