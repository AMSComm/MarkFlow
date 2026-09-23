import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '../stores/workspaceStore'

describe('WorkspaceStore - Panel Resizing & Proportions', () => {
  beforeEach(() => {
    localStorage.clear()
    useWorkspaceStore.getState().resetPanelSizes()
  })

  it('initializes with correct default sizes and 50% outline ratio', () => {
    const state = useWorkspaceStore.getState()
    expect(state.sidebarWidth).toBe(224)
    expect(state.splitRatio).toBe(50)
    expect(state.inspectorWidth).toBe(380)
    expect(state.outlineRatio).toBe(50)
  })

  it('updates sidebar width with delta and clamps within [160, 600]', () => {
    const { changeSidebarWidth, setSidebarWidth } = useWorkspaceStore.getState()

    // Delta expansion
    changeSidebarWidth(50)
    expect(useWorkspaceStore.getState().sidebarWidth).toBe(274)

    // Delta shrink
    changeSidebarWidth(-30)
    expect(useWorkspaceStore.getState().sidebarWidth).toBe(244)

    // Clamp minimum (160)
    changeSidebarWidth(-200)
    expect(useWorkspaceStore.getState().sidebarWidth).toBe(160)

    // Clamp maximum (600)
    changeSidebarWidth(600)
    expect(useWorkspaceStore.getState().sidebarWidth).toBe(600)

    // Direct reset
    setSidebarWidth(224)
    expect(useWorkspaceStore.getState().sidebarWidth).toBe(224)
  })

  it('updates split ratio with deltaPercent and clamps within [15, 85]', () => {
    const { changeSplitRatio, setSplitRatio } = useWorkspaceStore.getState()

    // Delta shift right
    changeSplitRatio(10)
    expect(useWorkspaceStore.getState().splitRatio).toBe(60)

    // Delta shift left
    changeSplitRatio(-25)
    expect(useWorkspaceStore.getState().splitRatio).toBe(35)

    // Minimum clamp
    changeSplitRatio(-50)
    expect(useWorkspaceStore.getState().splitRatio).toBe(15)

    // Maximum clamp
    changeSplitRatio(90)
    expect(useWorkspaceStore.getState().splitRatio).toBe(85)

    // Direct set
    setSplitRatio(50)
    expect(useWorkspaceStore.getState().splitRatio).toBe(50)
  })

  it('updates outline ratio with deltaPercent for 50/50 vertical split', () => {
    const { changeOutlineRatio, setOutlineRatio } = useWorkspaceStore.getState()

    expect(useWorkspaceStore.getState().outlineRatio).toBe(50)

    // Drag down reduces outline ratio
    changeOutlineRatio(-15)
    expect(useWorkspaceStore.getState().outlineRatio).toBe(35)

    // Drag up increases outline ratio
    changeOutlineRatio(25)
    expect(useWorkspaceStore.getState().outlineRatio).toBe(60)

    // Clamps between 15% and 85%
    changeOutlineRatio(50)
    expect(useWorkspaceStore.getState().outlineRatio).toBe(85)

    changeOutlineRatio(-90)
    expect(useWorkspaceStore.getState().outlineRatio).toBe(15)

    // Reset to default 50/50
    setOutlineRatio(50)
    expect(useWorkspaceStore.getState().outlineRatio).toBe(50)
  })

  it('updates inspector width with delta and clamps within [260, 800]', () => {
    const { changeInspectorWidth, setInspectorWidth } = useWorkspaceStore.getState()

    // Expand
    changeInspectorWidth(60)
    expect(useWorkspaceStore.getState().inspectorWidth).toBe(440)

    // Shrink
    changeInspectorWidth(-100)
    expect(useWorkspaceStore.getState().inspectorWidth).toBe(340)

    // Clamp minimum (260)
    changeInspectorWidth(-300)
    expect(useWorkspaceStore.getState().inspectorWidth).toBe(260)

    // Clamp maximum (800)
    changeInspectorWidth(800)
    expect(useWorkspaceStore.getState().inspectorWidth).toBe(800)

    setInspectorWidth(380)
    expect(useWorkspaceStore.getState().inspectorWidth).toBe(380)
  })

  it('persists and restores panel sizes in localStorage', () => {
    const { changeSidebarWidth, changeSplitRatio, changeOutlineRatio } = useWorkspaceStore.getState()

    changeSidebarWidth(30) // 254
    changeSplitRatio(5)   // 55
    changeOutlineRatio(-10) // 40

    const raw = localStorage.getItem('markflow_panel_sizes_v1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.sidebarWidth).toBe(254)
    expect(parsed.splitRatio).toBe(55)
    expect(parsed.outlineRatio).toBe(40)
  })
})

describe('WorkspaceStore - Tabs & File Management', () => {
  beforeEach(async () => {
    const store = useWorkspaceStore.getState()
    await store.initWorkspace()
  })

  it('loads sample files into fileTree and opens welcome tab', () => {
    const state = useWorkspaceStore.getState()
    expect(state.fileTree.length).toBeGreaterThan(0)
    expect(state.tabs.length).toBeGreaterThan(0)
    expect(state.activeTabId).toBeTruthy()
  })

  it('switches tabs, avoids duplicate tabs, and marks content changes as dirty', async () => {
    const store = useWorkspaceStore.getState()
    
    // Open architecture.md
    await store.openFile('/architecture.md')
    const initialTabsCount = useWorkspaceStore.getState().tabs.length
    const currentActiveTab = useWorkspaceStore.getState().tabs.find(t => t.id === useWorkspaceStore.getState().activeTabId)
    expect(currentActiveTab?.path).toBe('/architecture.md')

    // Open architecture.md again - should not duplicate tab
    await store.openFile('/architecture.md')
    expect(useWorkspaceStore.getState().tabs.length).toBe(initialTabsCount)

    // Edit content
    store.updateContent(currentActiveTab!.id, '# Modified Title\nNew text')
    const activeTab = useWorkspaceStore.getState().tabs.find(t => t.id === currentActiveTab!.id)
    expect(activeTab?.isDirty).toBe(true)
    expect(activeTab?.content).toContain('# Modified Title')

    // Save active file
    await store.saveActiveFile()
    const savedTab = useWorkspaceStore.getState().tabs.find(t => t.id === currentActiveTab!.id)
    expect(savedTab?.isDirty).toBe(false)
  })

  it('creates and deletes files in workspace', async () => {
    const store = useWorkspaceStore.getState()
    const testPath = '/test-unit.md'

    await store.createFile(testPath)
    expect(useWorkspaceStore.getState().tabs.some(t => t.path === testPath)).toBe(true)

    // Delete file
    await store.deleteFile(testPath)
    expect(useWorkspaceStore.getState().tabs.some(t => t.path === testPath)).toBe(false)
  })

  it('manages side inspector state correctly with target anchor', async () => {
    const store = useWorkspaceStore.getState()

    // Test doc inspector with anchor
    await store.openInspector('doc', '/diagrams.md#flowchart')
    let inspector = useWorkspaceStore.getState().inspector
    expect(inspector.isOpen).toBe(true)
    expect(inspector.type).toBe('doc')
    expect(inspector.targetAnchor).toBe('flowchart')
    expect(inspector.title).toContain('#flowchart')
    expect(inspector.content).toBeTruthy()

    store.closeInspector()
    inspector = useWorkspaceStore.getState().inspector
    expect(inspector.isOpen).toBe(false)
  })

  it('navigates to anchor line and sets targetAnchor in openFile and scrollToAnchor', async () => {
    const store = useWorkspaceStore.getState()
    
    // Open document with anchor
    await store.openFile('/welcome.md', 'key-highlights')
    const state = useWorkspaceStore.getState()
    expect(state.targetAnchor).toBe('key-highlights')
    expect(state.targetScrollLine).toBe(7)

    // Scroll to another anchor in active tab
    store.scrollToAnchor('live-mermaid-diagram-test')
    expect(useWorkspaceStore.getState().targetAnchor).toBe('live-mermaid-diagram-test')
    expect(useWorkspaceStore.getState().targetScrollLine).toBe(17)
  })
})

describe('WorkspaceStore - External File Changes & Conflict Resolution', () => {
  beforeEach(async () => {
    localStorage.clear()
    const store = useWorkspaceStore.getState()
    await store.initWorkspace()
  })

  it('auto-reloads tab if file is changed on disk and tab has no unsaved changes', async () => {
    const store = useWorkspaceStore.getState()
    await store.openFile('/welcome.md')

    const activeTab = useWorkspaceStore.getState().tabs.find((t) => t.path === '/welcome.md')!
    expect(activeTab.isDirty).toBe(false)

    // Simulate external edit to /welcome.md on disk
    const { getFileSystemAdapter } = await import('../adapters')
    const adapter = getFileSystemAdapter()
    await adapter.writeFile('/welcome.md', '# Modified externally')

    // Trigger check
    await store.checkForExternalFileChanges()

    const updatedTab = useWorkspaceStore.getState().tabs.find((t) => t.path === '/welcome.md')!
    expect(updatedTab.content).toBe('# Modified externally')
    expect(updatedTab.initialContent).toBe('# Modified externally')
    expect(updatedTab.isDirty).toBe(false)
    expect(updatedTab.hasExternalConflict).toBeFalsy()
  })

  it('detects conflict if file changed on disk AND user has unsaved local edits', async () => {
    const store = useWorkspaceStore.getState()
    await store.openFile('/welcome.md')

    const activeTab = useWorkspaceStore.getState().tabs.find((t) => t.path === '/welcome.md')!

    // User edits file in MarkFlow (making it dirty)
    store.updateContent(activeTab.id, '# My local unsaved edits')
    expect(useWorkspaceStore.getState().tabs.find((t) => t.id === activeTab.id)!.isDirty).toBe(true)

    // Concurrently, external program edits the file on disk
    const { getFileSystemAdapter } = await import('../adapters')
    const adapter = getFileSystemAdapter()
    await adapter.writeFile('/welcome.md', '# External disk change')

    // Trigger check
    await store.checkForExternalFileChanges()

    const conflictTab = useWorkspaceStore.getState().tabs.find((t) => t.id === activeTab.id)!
    expect(conflictTab.hasExternalConflict).toBe(true)
    expect(conflictTab.externalDiskContent).toBe('# External disk change')
    expect(conflictTab.content).toBe('# My local unsaved edits') // preserves user edits!
  })

  it('resolves conflict: reloadTabFromDisk discards local edits and takes disk version', async () => {
    const store = useWorkspaceStore.getState()
    await store.openFile('/welcome.md')
    const activeTab = useWorkspaceStore.getState().tabs.find((t) => t.path === '/welcome.md')!

    store.updateContent(activeTab.id, '# Local edits')
    const { getFileSystemAdapter } = await import('../adapters')
    await getFileSystemAdapter().writeFile('/welcome.md', '# Fresh disk version')

    await store.checkForExternalFileChanges()
    expect(useWorkspaceStore.getState().tabs.find((t) => t.id === activeTab.id)!.hasExternalConflict).toBe(true)

    // User chooses: Reload from Disk
    await store.reloadTabFromDisk(activeTab.id)

    const resolvedTab = useWorkspaceStore.getState().tabs.find((t) => t.id === activeTab.id)!
    expect(resolvedTab.content).toBe('# Fresh disk version')
    expect(resolvedTab.hasExternalConflict).toBe(false)
    expect(resolvedTab.isDirty).toBe(false)
  })

  it('resolves conflict: resolveConflictKeepLocal keeps local edits to overwrite disk on save', async () => {
    const store = useWorkspaceStore.getState()
    await store.openFile('/welcome.md')
    const activeTab = useWorkspaceStore.getState().tabs.find((t) => t.path === '/welcome.md')!

    store.updateContent(activeTab.id, '# My local changes')
    const { getFileSystemAdapter } = await import('../adapters')
    await getFileSystemAdapter().writeFile('/welcome.md', '# External disk content')

    await store.checkForExternalFileChanges()
    expect(useWorkspaceStore.getState().tabs.find((t) => t.id === activeTab.id)!.hasExternalConflict).toBe(true)

    // User chooses: Keep My Version
    store.resolveConflictKeepLocal(activeTab.id)

    const keptTab = useWorkspaceStore.getState().tabs.find((t) => t.id === activeTab.id)!
    expect(keptTab.hasExternalConflict).toBe(false)
    expect(keptTab.isDirty).toBe(true)
    expect(keptTab.content).toBe('# My local changes')

    // Now save and verify disk is overwritten with local version
    await store.saveActiveFile()
    const diskContent = await getFileSystemAdapter().readFile('/welcome.md')
    expect(diskContent).toBe('# My local changes')
  })

  it('resolves conflict: resolveConflictCompareInInspector opens disk version in inspector', async () => {
    const store = useWorkspaceStore.getState()
    await store.openFile('/welcome.md')
    const activeTab = useWorkspaceStore.getState().tabs.find((t) => t.path === '/welcome.md')!

    store.updateContent(activeTab.id, '# Distinct local changes to trigger conflict')
    const { getFileSystemAdapter } = await import('../adapters')
    await getFileSystemAdapter().writeFile('/welcome.md', '# External version to compare')

    await store.checkForExternalFileChanges()
    store.resolveConflictCompareInInspector(activeTab.id)

    const inspector = useWorkspaceStore.getState().inspector
    expect(inspector.isOpen).toBe(true)
    expect(inspector.title).toContain('[Disk Version]')
    expect(inspector.content).toBe('# External version to compare')
  })

  it('openDroppedFilePaths opens external files into active tabs', async () => {
    const { getFileSystemAdapter } = await import('../adapters')
    await getFileSystemAdapter().writeFile('/external-note.md', '# External Note\nSome content')

    const store = useWorkspaceStore.getState()
    await store.openDroppedFilePaths(['/external-note.md'])

    const tabs = useWorkspaceStore.getState().tabs
    const openedTab = tabs.find((t) => t.path === '/external-note.md')
    expect(openedTab).toBeDefined()
    expect(openedTab?.title).toBe('external-note.md')
    expect(openedTab?.content).toBe('# External Note\nSome content')
    expect(useWorkspaceStore.getState().activeTabId).toBe(openedTab?.id)
  })

  it('initWorkspace prioritizes getOpenedFiles when desktop passes initial files', async () => {
    const { getFileSystemAdapter, MockFileSystemAdapter } = await import('../adapters')
    const adapter = getFileSystemAdapter() as InstanceType<typeof MockFileSystemAdapter>
    await adapter.writeFile('/opened-via-os.md', '# Opened via OS Open With')
    adapter.setOpenedFilesForTest(['/opened-via-os.md'])

    const store = useWorkspaceStore.getState()
    await store.initWorkspace()

    const tabs = useWorkspaceStore.getState().tabs
    const openedTab = tabs.find((t) => t.path === '/opened-via-os.md')
    expect(openedTab).toBeDefined()
    expect(openedTab?.content).toBe('# Opened via OS Open With')
    expect(useWorkspaceStore.getState().activeTabId).toBe(openedTab?.id)
  })

  it('openDroppedFilePaths switches workspace root when a folder is dropped', async () => {
    const store = useWorkspaceStore.getState()
    const folderPath = '/my-custom-project'
    await store.openDroppedFilePaths([folderPath])

    expect(localStorage.getItem('markflow_last_workspace_root')).toBe(folderPath)
    expect(useWorkspaceStore.getState().statusMessage).toContain('Opened folder: my-custom-project')
  })

  it('initWorkspace restores saved workspace root from localStorage', async () => {
    localStorage.setItem('markflow_last_workspace_root', '/restored-project')

    const store = useWorkspaceStore.getState()
    await store.initWorkspace()

    const { getFileSystemAdapter } = await import('../adapters')
    const root = await getFileSystemAdapter().getWorkspaceRoot()
    expect(root).toBe('/restored-project')
  })

  it('updates and clears hoveredLinkUrl in state', () => {
    const store = useWorkspaceStore.getState()
    expect(store.hoveredLinkUrl).toBeNull()

    store.setHoveredLinkUrl('https://example.com/guide')
    expect(useWorkspaceStore.getState().hoveredLinkUrl).toBe('https://example.com/guide')

    store.setHoveredLinkUrl(null)
    expect(useWorkspaceStore.getState().hoveredLinkUrl).toBeNull()
  })
})

describe('WorkspaceStore - Default Reader Mode & Outline Navigation', () => {
  beforeEach(async () => {
    localStorage.clear()
    const store = useWorkspaceStore.getState()
    await store.initWorkspace()
  })

  it('defaults to preview (read) viewMode', () => {
    const store = useWorkspaceStore.getState()
    expect(store.viewMode).toBe('preview')
  })

  it('scrollToHeading sets targetScrollLine, targetAnchor and targetHeading with timestamp', () => {
    const store = useWorkspaceStore.getState()
    const before = Date.now()

    store.scrollToHeading({
      line: 12,
      text: 'Architecture Overview',
      slug: 'architecture-overview',
    })

    const state = useWorkspaceStore.getState()
    expect(state.targetScrollLine).toBe(12)
    expect(state.targetAnchor).toBe('architecture-overview')
    expect(state.targetHeading).toBeDefined()
    expect(state.targetHeading?.line).toBe(12)
    expect(state.targetHeading?.text).toBe('Architecture Overview')
    expect(state.targetHeading?.slug).toBe('architecture-overview')
    expect(state.targetHeading?.timestamp).toBeGreaterThanOrEqual(before)
  })

  it('scrollToLine automatically detects heading text and slug when line matches', () => {
    const store = useWorkspaceStore.getState()
    const content = '# Title\n\nSome intro text\n\n## Key Highlights\nContent here'
    const tabId = 'test_tab_heading'
    useWorkspaceStore.setState({
      tabs: [
        {
          id: tabId,
          path: '/test.md',
          title: 'test.md',
          content,
          initialContent: content,
          isDirty: false,
        },
      ],
      activeTabId: tabId,
    })

    // In content, line 5 is "## Key Highlights"
    store.scrollToLine(5)

    const state = useWorkspaceStore.getState()
    expect(state.targetScrollLine).toBe(5)
    expect(state.targetHeading?.line).toBe(5)
    expect(state.targetHeading?.text).toBe('Key Highlights')
    expect(state.targetHeading?.slug).toBe('key-highlights')
    expect(state.targetAnchor).toBe('key-highlights')
  })
})




