# Changelog

All notable changes to **MarkFlow** will be documented in this file.

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
