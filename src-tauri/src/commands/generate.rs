use std::path::Path;

use crate::filters::ext_to_language;

// ---------------------------------------------------------------------------
// Request type — sent from the frontend
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateRequest {
    /// Absolute paths of files to include, in display order
    pub file_paths: Vec<String>,
    /// Display name for the root (e.g. the folder name)
    pub root_name: String,
}

// ---------------------------------------------------------------------------
// Response type
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateResponse {
    /// The complete Markdown string
    pub markdown: String,
    /// How many files were successfully read
    pub files_included: usize,
    /// Paths that failed to read (permission errors, etc.)
    pub failed_paths: Vec<String>,
    /// Approximate token estimate (chars / 4 — rough heuristic)
    pub estimated_tokens: usize,
}

// ---------------------------------------------------------------------------
// Main generate command
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn generate_markdown(request: GenerateRequest) -> Result<GenerateResponse, String> {
    let mut output = String::with_capacity(1024 * 64); // pre-alloc 64 KB
    let mut files_included = 0usize;
    let mut failed_paths: Vec<String> = Vec::new();

    // Header
    output.push_str("# Repository Dump\n");
    output.push_str(&format!("**Source:** `{}`\n", request.root_name));
    output.push_str(&format!(
        "**Files:** {}  \n\n",
        request.file_paths.len()
    ));

    // Table of contents — quick overview before the content
    if !request.file_paths.is_empty() {
        output.push_str("## Table of Contents\n\n");
        for file_path in &request.file_paths {
            let display = make_display_path(file_path, &request.root_name);
            output.push_str(&format!("- `{display}`\n"));
        }
        output.push('\n');
    }

    output.push_str("---\n\n");

    // File contents
    for file_path in &request.file_paths {
        let path = Path::new(file_path);

        match read_file_safe(path) {
            Ok(content) => {
                let display = make_display_path(file_path, &request.root_name);
                let lang = ext_to_language(path);
                let line_count = content.lines().count();
                let byte_count = content.len();

                // Section header
                output.push_str(&format!("## File: {display}\n\n"));

                // Metadata comment above the fence
                output.push_str(&format!(
                    "<!-- {line_count} lines · {} -->\n",
                    format_bytes(byte_count)
                ));

                // Code fence
                output.push_str(&format!("```{lang}\n"));
                output.push_str(&content);

                // Ensure the file ends with a newline before closing the fence
                if !content.ends_with('\n') {
                    output.push('\n');
                }

                output.push_str("```\n\n");
                files_included += 1;
            }
            Err(err) => {
                // Emit a visible error block so the LLM knows a file was skipped
                let display = make_display_path(file_path, &request.root_name);
                output.push_str(&format!("## File: {display}\n\n"));
                output.push_str(&format!(
                    "> ⚠️ **Could not read file:** {err}\n\n"
                ));
                failed_paths.push(file_path.clone());
            }
        }
    }

    let estimated_tokens = output.len() / 4;

    Ok(GenerateResponse {
        markdown: output,
        files_included,
        failed_paths,
        estimated_tokens,
    })
}

// ---------------------------------------------------------------------------
// Token / size estimation command (fast — no file reads, just stat)
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenEstimate {
    pub total_bytes: u64,
    pub estimated_tokens: u64,
    pub file_count: usize,
}

#[tauri::command]
pub fn estimate_tokens(file_paths: Vec<String>) -> Result<TokenEstimate, String> {
    let mut total_bytes = 0u64;
    let file_count = file_paths.len();

    for path_str in &file_paths {
        if let Ok(meta) = std::fs::metadata(path_str) {
            total_bytes += meta.len();
        }
    }

    // GPT-style approximation: ~4 bytes per token for English/code
    let estimated_tokens = total_bytes / 4;

    Ok(TokenEstimate {
        total_bytes,
        estimated_tokens,
        file_count,
    })
}

// ---------------------------------------------------------------------------
// Save Markdown to disk
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn save_markdown(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Failed to write file `{path}`: {e}"))
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Read a file as UTF-8, stripping any BOM, falling back to lossy conversion
/// for files that are almost-but-not-quite UTF-8.
fn read_file_safe(path: &Path) -> Result<String, String> {
    // Bail on files over 10 MB — they'll flood the context window anyway
    const MAX_BYTES: u64 = 10 * 1024 * 1024;

    let meta = std::fs::metadata(path)
        .map_err(|e| format!("stat failed: {e}"))?;

    if meta.len() > MAX_BYTES {
        return Err(format!(
            "File too large ({}) — skipped to protect context window",
            format_bytes(meta.len() as usize)
        ));
    }

    let bytes = std::fs::read(path)
        .map_err(|e| format!("read failed: {e}"))?;

    // Detect binary content heuristically — check first 8 KB for null bytes
    let probe = &bytes[..bytes.len().min(8192)];
    if probe.contains(&0u8) {
        return Err("Binary file detected — skipped".to_string());
    }

    // Strip UTF-8 BOM if present
    let bytes = if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &bytes[3..]
    } else {
        &bytes
    };

    // Try strict UTF-8 first, fall back to lossy
    match std::str::from_utf8(bytes) {
        Ok(s) => Ok(s.to_string()),
        Err(_) => Ok(String::from_utf8_lossy(bytes).into_owned()),
    }
}

/// Trim the root prefix from an absolute path for cleaner display.
fn make_display_path(absolute: &str, root_name: &str) -> String {
    // Find the root folder name in the path and strip everything before it
    if let Some(idx) = absolute.rfind(root_name) {
        absolute[idx..].to_string()
    } else {
        // Fallback: just show the last two components
        let path = Path::new(absolute);
        let file = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(absolute);
        let parent = path
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("");
        if parent.is_empty() {
            file.to_string()
        } else {
            format!("{parent}/{file}")
        }
    }
}

/// Human-readable byte count.
fn format_bytes(bytes: usize) -> String {
    if bytes < 1024 {
        format!("{bytes} B")
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}
