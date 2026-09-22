---
version: 1.0.0
name: MarkFlow Workspace Design Spec
description: High-performance, anti-slop, space-optimized visual language for MarkFlow Markdown & Mermaid Editor.
colors:
  bg-app: "#090d16"
  bg-sidebar: "#0f172a"
  bg-editor: "#090d16"
  bg-preview: "#0b0f19"
  bg-tab: "#111827"
  bg-tab-active: "#1e293b"
  border: "#1e293b"
  border-highlight: "#334155"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  accent: "#0ea5e9"
  accent-hover: "#38bdf8"
  accent-subtle: "#0ea5e920"
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#ef4444"
typography:
  ui:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: "400"
    lineHeight: "1.4"
  editor:
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace"
    fontSize: "14px"
    fontWeight: "400"
    lineHeight: "1.6"
  markdown:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "15px"
    fontWeight: "400"
    lineHeight: "1.7"
rounded:
  xs: "3px"
  sm: "5px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  tab-bar:
    height: "36px"
    background: "{colors.bg-sidebar}"
    borderBottom: "1px solid {colors.border}"
  sidebar:
    width: "240px"
    background: "{colors.bg-sidebar}"
    borderRight: "1px solid {colors.border}"
  side-inspector:
    width: "360px"
    background: "{colors.bg-preview}"
    borderLeft: "1px solid {colors.border}"
---

# MarkFlow — Design Specification

## Overview
MarkFlow is an ultra-fast, space-optimized desktop and web workspace for writing and reading technical Markdown documents and Mermaid diagrams. The design philosophy centers around **density, zero clutter, high contrast readability, and seamless side-by-side inspection**.

## Colors
- **App Canvas:** Deep obsidian navy (`#090d16`) provides immersive contrast without eye fatigue.
- **Chrome & Panels:** Slate navy (`#0f172a`, `#111827`, `#1e293b`).
- **Primary Accent:** Precision Electric Cyan (`#0ea5e9`, `#38bdf8`) used strictly for active states, link references, and cursor focus.
- **Rule Compliance:** Strictly adheres to the **Purple Ban** (no arbitrary purple gradients or AI-slop neon violet).

## Typography
- **Chrome UI:** Clean system sans-serif (12px - 13px) for dense, professional ergonomics.
- **Editor:** Virtualized monospace with ligatures at 14px and 1.6 line height.
- **Markdown Preview:** High-readability typography hierarchy with clear contrast for headers, quotes, tables, and code blocks.

## Layout & Space Optimization
1. **Activity Bar / Header:** Minimalist 38px bar with window controls, active workspace breadcrumbs, view mode toggles, search, and settings.
2. **Tab Strip:** Compact 36px tabs with dirty indicator dots, close buttons, and smooth horizontal scrolling.
3. **Split Workspace:** Dual-pane editor and live preview with smooth synchronized scrolling.
4. **Side Link Inspector:** An intelligent 360px drawer on the right for instantaneous preview of clicked markdown cross-references or web links without breaking focus.

## Do's and Don'ts
- **DO** keep margins tight and borders subtle (`1px solid #1e293b`).
- **DO** provide instant keyboard shortcuts for toggling every panel (`Ctrl+B` for sidebar, `Ctrl+\` for inspector).
- **DON'T** use heavy drop shadows or unnecessary animations that degrade frame rate.
- **DON'T** disrupt the user's active editor when they click links; open them directly in the Side Inspector.
