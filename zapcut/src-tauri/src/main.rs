// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod utils;

use commands::media::{import_video, import_videos, validate_video_file, get_thumbnail_base64, read_video_file, read_binary_file};
use commands::export::{export_timeline, get_export_progress};
use commands::recording::{
    RecordingManager,
    get_available_screens, get_available_microphones, get_available_webcams,
    start_recording, stop_recording, pause_recording, resume_recording,
    get_recording_state, import_recording_to_gallery, export_recording_to_file,
    generate_recording_thumbnail, check_screen_recording_permission, test_screen_recording_access,
    test_recording_command,
};
use commands::app::init_app;

fn main() {
    tauri::Builder::default()
        .manage(RecordingManager::new())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            import_video,
            import_videos,
            validate_video_file,
            get_thumbnail_base64,
            read_video_file,
            read_binary_file,
            export_timeline,
            get_export_progress,
            get_available_screens,
            get_available_microphones,
            get_available_webcams,
            check_screen_recording_permission,
            test_screen_recording_access,
            test_recording_command,
            start_recording,
            stop_recording,
            pause_recording,
            resume_recording,
            get_recording_state,
            import_recording_to_gallery,
            export_recording_to_file,
            generate_recording_thumbnail,
            init_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

