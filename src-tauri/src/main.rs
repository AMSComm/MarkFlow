// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::{OnceLock, RwLock};
use tauri::{Emitter, Manager};

static ACTIVE_WORKSPACE: OnceLock<RwLock<PathBuf>> = OnceLock::new();
static PENDING_OPENED_FILES: OnceLock<RwLock<Vec<String>>> = OnceLock::new();

fn get_pending_files_lock() -> &'static RwLock<Vec<String>> {
    PENDING_OPENED_FILES.get_or_init(|| RwLock::new(Vec::new()))
}

fn add_pending_file(path: String) {
    if let Ok(mut list) = get_pending_files_lock().write() {
        if !list.contains(&path) {
            list.push(path);
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "updatedAt")]
    pub updated_at: Option<u64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReaderArticle {
    pub title: String,
    pub content: String,
    #[serde(rename = "siteName")]
    pub site_name: Option<String>,
}

fn dirs_home() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

fn get_config_file_path() -> Option<PathBuf> {
    dirs_home().map(|h| h.join(".markflow_workspace"))
}

fn get_default_workspace() -> PathBuf {
    let home_opt = dirs_home();
    // 1. If current_dir is a valid custom user folder (e.g. CLI opened in custom folder)
    if let Ok(current) = std::env::current_dir() {
        let s = current.to_string_lossy();
        let is_home = home_opt.as_ref().map(|h| h == &current).unwrap_or(false);
        if !s.is_empty()
            && s != "/"
            && !is_home
            && !s.starts_with("/Applications")
            && !s.contains(".app")
            && !s.starts_with("/System")
        {
            return current;
        }
    }

    // 2. Check if a previously opened workspace was saved
    if let Some(cfg) = get_config_file_path() {
        if let Ok(saved) = fs::read_to_string(&cfg) {
            let p = PathBuf::from(saved.trim());
            if p.exists() && p.is_dir() {
                return p;
            }
        }
    }

    // 3. Fallback to ~/Documents/MarkFlow
    if let Some(home) = home_opt {
        let docs = home.join("Documents").join("MarkFlow");
        if !docs.exists() {
            let _ = fs::create_dir_all(&docs);
        }
        let welcome = docs.join("welcome.md");
        if !welcome.exists() {
            let _ = fs::write(
                &welcome,
                "# Welcome to MarkFlow\n\nHigh-Performance Markdown & Mermaid Workspace.\n\n```mermaid\ngraph TD\n  A[Start Note] --> B(Brainstorm)\n  B --> C{Idea Valid?}\n  C -->|Yes| D[Draft Doc]\n  C -->|No| B\n```\n\n- Zero-lag live markdown editor\n- Draggable Table of Contents outline\n- Fast off-thread Mermaid diagram preview\n",
            );
        }
        docs
    } else {
        PathBuf::from(".")
    }
}

fn get_workspace_lock() -> &'static RwLock<PathBuf> {
    ACTIVE_WORKSPACE.get_or_init(|| RwLock::new(get_default_workspace()))
}

fn get_current_workspace() -> PathBuf {
    get_workspace_lock()
        .read()
        .map(|p| p.clone())
        .unwrap_or_else(|_| get_default_workspace())
}

fn clean_canonical_path(p: PathBuf) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let s = p.to_string_lossy();
        if let Some(stripped) = s.strip_prefix(r"\\?\") {
            return PathBuf::from(stripped);
        }
    }
    p
}

fn set_current_workspace(new_path: PathBuf) {
    let cleaned = clean_canonical_path(new_path);
    if let Ok(mut lock) = get_workspace_lock().write() {
        *lock = cleaned.clone();
    }
    if let Some(cfg) = get_config_file_path() {
        let _ = fs::write(cfg, cleaned.to_string_lossy().as_bytes());
    }
}

fn resolve_path(rel_path: &str) -> PathBuf {
    let base = get_current_workspace();
    let clean = rel_path.trim_start_matches('/');
    if clean.is_empty() {
        return base;
    }
    let p = PathBuf::from(rel_path);
    if p.is_absolute() && (p.starts_with(&base) || p.exists()) {
        return p;
    }
    base.join(clean)
}

#[tauri::command]
fn get_workspace_root() -> String {
    get_current_workspace().to_string_lossy().to_string()
}

#[tauri::command]
fn set_workspace_root(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    let dir = if p.is_file() {
        p.parent().unwrap_or(&p).to_path_buf()
    } else {
        p
    };
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    let canonical = dir.canonicalize().unwrap_or(dir);
    let cleaned = clean_canonical_path(canonical);
    let s = cleaned.to_string_lossy().to_string();
    set_current_workspace(cleaned);
    Ok(s)
}

#[tauri::command]
fn read_absolute_file(path: String) -> Result<String, String> {
    let p = PathBuf::from(&path);
    fs::read_to_string(&p).map_err(|e| e.to_string())
}

fn scan_directory(
    dir: &PathBuf,
    base: &PathBuf,
    depth: usize,
    max_depth: usize,
) -> Result<Vec<FileEntry>, String> {
    let read_dir = fs::read_dir(dir).map_err(|e| e.to_string())?;
    let mut entries: Vec<FileEntry> = Vec::new();

    for item in read_dir {
        let entry = match item {
            Ok(e) => e,
            Err(_) => continue,
        };

        let name = entry.file_name().to_string_lossy().to_string();
        // Skip hidden dot-files and heavy build/node folders
        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "dist"
            || name == "build"
            || name == ".git"
        {
            continue;
        }

        let full_path = entry.path();
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let is_dir = metadata.is_dir();
        let rel = full_path
            .strip_prefix(base)
            .unwrap_or(&full_path)
            .to_string_lossy()
            .replace('\\', "/");
        let virtual_path = if rel.starts_with('/') {
            rel
        } else {
            format!("/{}", rel)
        };

        let children = if is_dir && depth < max_depth {
            scan_directory(&full_path, base, depth + 1, max_depth).ok()
        } else {
            None
        };

        entries.push(FileEntry {
            name,
            path: virtual_path,
            is_directory: is_dir,
            children,
            size: if is_dir { None } else { Some(metadata.len()) },
            updated_at: metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64),
        });
    }

    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let target_dir = resolve_path(&path);
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    }

    let base = get_current_workspace();
    scan_directory(&target_dir, &base, 0, 5)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let full = resolve_path(&path);
    fs::read_to_string(full).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let full = resolve_path(&path);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(full, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(path: String, content: String) -> Result<(), String> {
    let full = resolve_path(&path);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(full, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    let full = resolve_path(&path);
    fs::create_dir_all(full).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_entry(path: String) -> Result<(), String> {
    let full = resolve_path(&path);
    if full.is_dir() {
        fs::remove_dir_all(full).map_err(|e| e.to_string())
    } else {
        fs::remove_file(full).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    let old_full = resolve_path(&old_path);
    let new_full = resolve_path(&new_path);
    if let Some(parent) = new_full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(old_full, new_full).map_err(|e| e.to_string())
}

#[tauri::command]
fn fetch_reader_article(url: String) -> Result<ReaderArticle, String> {
    Ok(ReaderArticle {
        title: format!("Preview: {}", url),
        content: format!(
            "### Native Link Preview\n\n**URL:** [{}]({})\n\nClean reader content fetched via native Desktop subsystem.",
            url, url
        ),
        site_name: Some("External Web".to_string()),
    })
}

#[tauri::command]
fn get_opened_files() -> Vec<String> {
    if let Ok(mut list) = get_pending_files_lock().write() {
        let files = list.clone();
        list.clear();
        files
    } else {
        Vec::new()
    }
}

fn main() {
    // Scan startup arguments for file or folder paths passed directly
    for arg in std::env::args().skip(1) {
        if !arg.starts_with('-') {
            let p = PathBuf::from(&arg);
            if p.is_file() {
                if let Ok(canonical) = p.canonicalize() {
                    add_pending_file(clean_canonical_path(canonical).to_string_lossy().to_string());
                } else {
                    add_pending_file(arg);
                }
            } else if p.is_dir() {
                if let Ok(canonical) = p.canonicalize() {
                    set_current_workspace(clean_canonical_path(canonical));
                } else {
                    set_current_workspace(p);
                }
            }
        }
    }

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_workspace_root,
            set_workspace_root,
            read_absolute_file,
            list_directory,
            read_file,
            write_file,
            create_file,
            create_directory,
            delete_entry,
            rename_entry,
            fetch_reader_article,
            get_opened_files
        ])
        .build(tauri::generate_context!())
        .expect("error while building MarkFlow desktop application");

    app.run(|_app_handle, _event| {
        #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
        if let tauri::RunEvent::Opened { urls } = _event {
            let mut paths = Vec::new();
            for url in urls {
                if let Ok(path) = url.to_file_path() {
                    let path_str = path.to_string_lossy().to_string();
                    if path.is_dir() {
                        if let Ok(canonical) = path.canonicalize() {
                            set_current_workspace(clean_canonical_path(canonical));
                        } else {
                            set_current_workspace(path);
                        }
                    } else {
                        add_pending_file(path_str.clone());
                    }
                    let _ = _app_handle.emit("open-file-path", &path_str);
                    paths.push(path_str);
                }
            }
            if !paths.is_empty() {
                let _ = _app_handle.emit("open-file-paths", &paths);
                for (_label, window) in _app_handle.webview_windows() {
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_path_workspace_root() {
        let base = get_current_workspace();
        assert_eq!(resolve_path("/"), base);
        assert_eq!(resolve_path(""), base);
    }

    #[test]
    fn test_resolve_path_virtual_files() {
        let base = get_current_workspace();
        assert_eq!(resolve_path("/welcome.md"), base.join("welcome.md"));
        assert_eq!(resolve_path("welcome.md"), base.join("welcome.md"));
        assert_eq!(resolve_path("/notes/todo.md"), base.join("notes/todo.md"));
    }

    #[test]
    fn test_set_workspace_root_directory() {
        let temp_dir = std::env::temp_dir().join("markflow_test_dir");
        let _ = fs::create_dir_all(&temp_dir);
        let res = set_workspace_root(temp_dir.to_string_lossy().to_string());
        assert!(res.is_ok());
        let current = get_current_workspace();
        let expected = clean_canonical_path(temp_dir.canonicalize().unwrap());
        assert_eq!(current, expected);
        let _ = fs::remove_dir_all(&temp_dir);
    }
}

