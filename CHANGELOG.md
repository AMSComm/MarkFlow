# Changelog

All notable changes to **MarkFlow** will be documented in this file.

## [v0.1.4] - 2026-09-25

### 🔍 In-File Search & Replace
- **Floating Toolbar**: Sleek, token-compliant floating Search & Replace toolbar (`Cmd+F` / `Cmd+H`) positioned in the top-right corner with smooth transitions.
- **Full Search Suite**: Supports Case Sensitive (`Aa` / `Alt+C`), Whole Word (`W` / `Alt+W`), and Regular Expression (`.*` / `Alt+R`) searching.
- **Find & Replace in Editor**: Replace current match or Replace All across the document with dirty tracking and instant CodeMirror 6 sync.
- **Live Preview Highlighting**: Highlights all occurrences in Reader and Split preview modes with smooth scroll-to-match navigation.
- **Global Shortcuts**: `Cmd+F` to find, `Cmd+H` / `Cmd+Option+F` to replace, `Enter` / `Shift+Enter` for next/previous match, and `Escape` to dismiss.

---

## [v0.1.3] - 2026-09-23

### 📖 Reading Experience & Outline Navigation
- **Outline Heading Jump**: Clicking any heading in the Outline sidebar now scrolls directly to that heading in Reader (Preview) mode, Split mode, and Editor mode with an animated accent glow.
- **Active Heading Highlight**: The active outline item dynamically highlights when clicked, providing instant visual feedback.
- **Default Reader Mode**: MarkFlow now opens documents in Reader (`Read`) mode by default for an uncluttered reading experience.

### ⚙️ Quick Preferences
- **Escape Key Dismissal**: Pressing `Escape` or clicking outside now smoothly closes the Preferences & Settings popover.

---

## [v0.1.2] - 2026-09-23

### 🎨 Visual & Identity
- **Clean App Icon**: Removed blurry outer glow and surrounding dark background, featuring a sharp, clean squircle logo across all platforms.
- **Universal App Icon Assets**: Regenerated icons for macOS (`.icns`), Windows (`.ico`, Appx assets), and Linux/Web.

### 🚀 Direct In-App Auto-Update
- **One-Click Update & Relaunch**: Upgraded `UpdateDialog` with live download progress tracking and automatic application restart via `tauri-plugin-process`.
- **Automated Update Artifacts**: Enabled `createUpdaterArtifacts` in Tauri bundler configuration for automated signed binary distributions.
- **Permission & Capability Matrix**: Configured `process:default` in desktop capability declarations to support seamless in-app relaunch.

---

## [v0.1.1] - 2026-09-23

### 🚀 Features & Enhancements
- **Workspace Persistence**: Automatically remembers and restores the last opened workspace folder across desktop app restarts.
- **Browser-Style Zoom Control**: Integrated zoom in (`Cmd/Ctrl +`), zoom out (`Cmd/Ctrl -`), and reset (`Cmd/Ctrl 0`) ranging from 50% to 200% with a responsive status bar widget.
- **Live Link Hover Inspection**: Displays the complete URL in the status bar whenever hovering over markdown or external links.
- **Anchor Section Slicing**: Clicking an internal `#section` anchor link extracts and renders only the targeted header section in the preview inspector instead of the entire document.
- **Native File Associations & "Open With"**: Native desktop integration for `.md`, `.markdown`, `.mdown`, `.mkdn`, and `.txt` files across macOS, Windows, and Linux.
- **Uncapped File Paths**: Expanded header and status bar layouts to show complete file names and full relative paths without ellipsis truncation.

### 🐛 Bug Fixes & Cross-Platform Stability
- **Cross-Platform Event Compatibility**: Gated macOS-specific `RunEvent::Opened` to fix desktop build failures on Linux and Windows runners.
- **Windows UNC Path Normalization**: Automatically strips Windows `\\?\` prefix from canonicalized paths to maintain seamless filesystem consistency.
- **Tab Initialization Guard**: Eliminated race conditions when launching MarkFlow directly via a file argument, replacing blank welcome tabs cleanly.

---

## [v0.1.0] - 2026-09-22

### 🚀 Initial Desktop Release
- **Zero-lag Markdown Editing**: CodeMirror 6 architecture with fast syntax highlighting and optional Vim keybindings.
- **Off-Thread Mermaid Diagrams**: Async diagram rendering with SHA-256 caching for zero UI stutters.
- **Interactive Outline & TOC**: Real-time table of contents for quick document navigation.
- **Native File Watching**: Real-time file system watchers with smart change synchronization.
- **Multi-Platform Packages**: Universal binaries for macOS (.dmg), Windows (.msi, .exe NSIS), and Linux (.deb, .AppImage, .rpm).
