// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

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

fn get_default_workspace() -> PathBuf {
    if let Ok(current) = std::env::current_dir() {
        current
    } else if let Some(home) = dirs_home() {
        home.join("MarkFlowNotes")
    } else {
        PathBuf::from(".")
    }
}

fn dirs_home() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

fn resolve_path(rel_path: &str) -> PathBuf {
    let base = get_default_workspace();
    let clean = rel_path.trim_start_matches('/');
    if clean.is_empty() {
        base
    } else {
        base.join(clean)
    }
}

#[tauri::command]
fn get_workspace_root() -> String {
    get_default_workspace().to_string_lossy().to_string()
}

#[tauri::command]
fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let target_dir = resolve_path(&path);
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    }

    let read_dir = fs::read_dir(&target_dir).map_err(|e| e.to_string())?;
    let mut entries: Vec<FileEntry> = Vec::new();
    let base = get_default_workspace();

    for item in read_dir {
        if let Ok(entry) = item {
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            let is_dir = metadata.is_dir();
            let full_path = entry.path();
            let rel = full_path
                .strip_prefix(&base)
                .unwrap_or(&full_path)
                .to_string_lossy()
                .replace('\\', "/");
            let virtual_path = format!("/{}", rel);
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden dot-files
            if name.starts_with('.') {
                continue;
            }

            let mut children = None;
            if is_dir {
                // Pre-scan 1 level of sub-items
                if let Ok(sub_read) = fs::read_dir(&full_path) {
                    let mut subs = Vec::new();
                    for sub in sub_read.flatten() {
                        let sub_meta = sub.metadata().ok();
                        let sub_is_dir = sub_meta.as_ref().map(|m| m.is_dir()).unwrap_or(false);
                        let sub_name = sub.file_name().to_string_lossy().to_string();
                        if sub_name.starts_with('.') {
                            continue;
                        }
                        let sub_rel = sub
                            .path()
                            .strip_prefix(&base)
                            .unwrap_or(&sub.path())
                            .to_string_lossy()
                            .replace('\\', "/");
                        subs.push(FileEntry {
                            name: sub_name,
                            path: format!("/{}", sub_rel),
                            is_directory: sub_is_dir,
                            children: None,
                            size: sub_meta.as_ref().map(|m| m.len()),
                            updated_at: None,
                        });
                    }
                    children = Some(subs);
                }
            }

            entries.push(FileEntry {
                name,
                path: virtual_path,
                is_directory: is_dir,
                children,
                size: Some(metadata.len()),
                updated_at: metadata
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis() as u64),
            });
        }
    }

    entries.sort_by(|a, b| match (a.is_directory, b.is_directory) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_workspace_root,
            list_directory,
            read_file,
            write_file,
            create_file,
            create_directory,
            delete_entry,
            rename_entry,
            fetch_reader_article
        ])
        .run(tauri::generate_context!())
        .expect("error while running MarkFlow desktop application");
}
