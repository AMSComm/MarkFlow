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

