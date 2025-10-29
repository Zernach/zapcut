// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod utils;

use commands::media::{import_video, import_videos, validate_video_file, get_thumbnail_base64, read_video_file, read_binary_file};
use commands::export::{export_timeline, export_timeline_optimized, get_export_progress};
use commands::recording::{
    RecordingManager,
    get_available_microphones, get_available_webcams,
    process_recording, update_recording_state,
    get_recording_state, import_recording_to_gallery, export_recording_to_file,
    generate_recording_thumbnail,
};
use commands::app::init_app;
use commands::prerender::{prerender_segment, get_prerender_cache_dir, clear_prerender_cache};

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
            export_timeline_optimized,
            get_export_progress,
            get_available_microphones,
            get_available_webcams,
            process_recording,
            update_recording_state,
            get_recording_state,
            import_recording_to_gallery,
            export_recording_to_file,
            generate_recording_thumbnail,
            init_app,
            prerender_segment,
            get_prerender_cache_dir,
            clear_prerender_cache,
        ])
        .register_asynchronous_uri_scheme_protocol("stream", |_app, request, responder| {
            use std::fs;
            use http::header::*;
            
            tauri::async_runtime::spawn(async move {
                // Extract file path from the URL
                let path = request.uri().path();
                // Remove leading '/' to get actual file path
                let file_path = urlencoding::decode(&path[1..]).unwrap_or_default().to_string();
                
                match fs::read(&file_path) {
                    Ok(data) => {
                        // Detect content type from file extension
                        let content_type = if file_path.ends_with(".mp4") {
                            "video/mp4"
                        } else if file_path.ends_with(".mov") {
                            "video/quicktime"
                        } else if file_path.ends_with(".webm") {
                            "video/webm"
                        } else if file_path.ends_with(".avi") {
                            "video/x-msvideo"
                        } else if file_path.ends_with(".mkv") {
                            "video/x-matroska"
                        } else {
                            "application/octet-stream"
                        };
                        
                        let response = http::Response::builder()
                            .header(CONTENT_TYPE, content_type)
                            .header(ACCEPT_RANGES, "bytes")
                            .header(CONTENT_LENGTH, data.len())
                            .status(200)
                            .body(data)
                            .unwrap();
                        
                        responder.respond(response);
                    }
                    Err(_e) => {
                        let response = http::Response::builder()
                            .status(404)
                            .body(Vec::new())
                            .unwrap();
                        responder.respond(response);
                    }
                }
            });
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

