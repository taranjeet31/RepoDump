use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::filters::{classify_file, is_blacklisted_dir, Tier};

// ---------------------------------------------------------------------------
// Shared data types (mirrored in TypeScript on the frontend)
// ---------------------------------------------------------------------------

/// A single node in the file tree — either a file or a directory container.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    /// Unique stable ID — the full absolute path
    pub id: String,
    /// Display name (just the file/dir name, not the full path)
    pub name: String,
    /// Full absolute path on disk
    pub path: String,
    /// Whether this is a directory
    pub is_dir: bool,
    /// Tier classification (None for directories themselves)
    pub tier: Option<Tier>,
    /// Whether this node is checked for export (default driven by tier)
    pub checked: bool,
    /// Whether this node is included in the exported structure outline
    pub structure_checked: bool,
    /// Children — empty vec for files, populated for directories
    pub children: Vec<FileNode>,
    /// File size in bytes (None for directories)
    pub size_bytes: Option<u64>,
    /// Depth relative to the root of the scan
    pub depth: usize,
}

impl FileNode {
    fn new_dir(path: &Path, depth: usize) -> Self {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        Self {
            id: path.to_string_lossy().to_string(),
            name,
            path: path.to_string_lossy().to_string(),
            is_dir: true,
            tier: None,
            checked: true, // dirs are always "checked" (folders expand, files inside drive export)
            structure_checked: true,
            children: Vec::new(),
            size_bytes: None,
            depth,
        }
    }

    fn new_file(path: &Path, tier: Tier, size_bytes: u64, depth: usize) -> Self {
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();
        let checked = matches!(tier, Tier::CoreText);
        Self {
            id: path.to_string_lossy().to_string(),
            name,
            path: path.to_string_lossy().to_string(),
            is_dir: false,
            tier: Some(tier),
            checked,
            structure_checked: true,
            children: Vec::new(),
            size_bytes: Some(size_bytes),
            depth,
        }
    }
}

// ---------------------------------------------------------------------------
// Scan command
// ---------------------------------------------------------------------------

/// Scans a directory and returns a nested FileNode tree.
/// Blacklisted directories and files are completely excluded.
/// The root itself is the first element in the returned Vec.
#[tauri::command]
pub fn scan_directory(path: String) -> Result<FileNode, String> {
    let root = PathBuf::from(&path);

    if !root.exists() {
        return Err(format!("Path does not exist: {path}"));
    }
    if !root.is_dir() {
        return Err(format!("Path is not a directory: {path}"));
    }

    build_tree(&root, 0).map_err(|e| format!("Scan error: {e}"))
}

/// Recursively build the FileNode tree for a directory.
fn build_tree(dir: &Path, depth: usize) -> std::io::Result<FileNode> {
    let mut node = FileNode::new_dir(dir, depth);

    // Read directory entries and sort: dirs first, then files, both alphabetical
    let mut entries: Vec<_> = std::fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .collect();

    entries.sort_by(|a, b| {
        let a_is_dir = a.path().is_dir();
        let b_is_dir = b.path().is_dir();
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    for entry in entries {
        let entry_path = entry.path();
        let entry_name = entry
            .file_name()
            .to_string_lossy()
            .to_string();

        // Skip hidden files/dirs (except ones we want like .gitignore, .env, etc.)
        // We handle this by checking if classify_file returns Blacklisted
        if entry_path.is_dir() {
            if is_blacklisted_dir(&entry_name) {
                continue; // Hard skip — never recurse
            }
            // Recursively build subtree
            match build_tree(&entry_path, depth + 1) {
                Ok(child) => node.children.push(child),
                Err(_) => continue, // Skip unreadable dirs silently
            }
        } else {
            let tier = classify_file(&entry_path);
            if matches!(tier, Tier::Blacklisted) {
                continue; // Hard skip — never show
            }
            let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
            node.children.push(FileNode::new_file(
                &entry_path,
                tier,
                size_bytes,
                depth + 1,
            ));
        }
    }

    Ok(node)
}

// ---------------------------------------------------------------------------
// Flat scan (for large repos — returns a flat list with depth info)
// Used as a faster alternative when the tree is huge
// ---------------------------------------------------------------------------

/// Returns a flat list of all non-blacklisted files under a root path.
/// Useful for token counting passes.
#[tauri::command]
pub fn scan_directory_flat(path: String) -> Result<Vec<FileNode>, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("Path does not exist: {path}"));
    }

    let mut results = Vec::new();

    let walker = WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                let name = e.file_name().to_string_lossy();
                !is_blacklisted_dir(&name)
            } else {
                true
            }
        });

    for entry in walker.filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let path = entry.path();
            let tier = classify_file(path);
            if !matches!(tier, Tier::Blacklisted) {
                let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
                let depth = entry.depth();
                results.push(FileNode::new_file(path, tier, size_bytes, depth));
            }
        }
    }

    Ok(results)
}
