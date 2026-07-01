mod commands;
mod filters;

// tauri::generate_handler! requires bare function names in scope —
// it cannot resolve path syntax like commands::fn_name.
use commands::generate::{estimate_tokens, generate_markdown, save_markdown};
use commands::scan::{scan_directory, scan_directory_flat};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            scan_directory_flat,
            generate_markdown,
            estimate_tokens,
            save_markdown,
        ])
        .run(tauri::generate_context!())
        .expect("error while running RepoDump");
}
