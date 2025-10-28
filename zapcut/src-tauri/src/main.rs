// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod utils;

use commands::media::{import_video, import_videos, validate_video_file, get_thumbnail_base64, read_video_file};
use commands::export::{export_timeline, get_export_progress};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            import_video,
            import_videos,
            validate_video_file,
            get_thumbnail_base64,
            read_video_file,
            export_timeline,
            get_export_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

