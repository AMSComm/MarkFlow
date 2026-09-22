class LocalStorageMock implements Storage {
  private store: Record<string, string> = {}

  clear(): void {
    this.store = {}
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value)
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  get length(): number {
    return Object.keys(this.store).length
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null
  }
}

// Polyfill for vitest node environment
const globalObj = globalThis as unknown as Record<string, unknown>
globalObj.localStorage = new LocalStorageMock()
globalObj.alert = (msg: string) => { console.warn('Mock alert:', msg) }
globalObj.confirm = () => true
