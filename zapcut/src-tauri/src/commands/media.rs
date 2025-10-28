use crate::utils::ffmpeg::{generate_thumbnail, get_video_info, VideoInfo};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::command;
use base64::{engine::general_purpose, Engine as _};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MediaItem {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub thumbnail_path: Option<String>,
    pub file_size: u64,
    pub codec: String,
    pub imported_at: String,
}

#[command]
pub async fn import_video(file_path: String) -> Result<MediaItem, String> {
    // Validate file exists
    if !Path::new(&file_path).exists() {
        return Err("File does not exist".to_string());
    }

    // Get video info via FFprobe
    let info = get_video_info(&file_path).map_err(|e| format!("Failed to analyze video: {}", e))?;

    // Generate unique ID
    let id = uuid::Uuid::new_v4().to_string();

    // Get file name
    let name = Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    // Generate thumbnail
    let thumbnail_path = generate_thumbnail_for_import(&file_path, &id, &info).ok();

    let item = MediaItem {
        id,
        name,
        file_path: file_path.clone(),
        duration: info.duration,
        width: info.width,
        height: info.height,
        fps: info.fps,
        thumbnail_path,
        file_size: info.file_size,
        codec: info.codec,
        imported_at: chrono::Utc::now().to_rfc3339(),
    };

    Ok(item)
}

#[command]
pub async fn import_videos(file_paths: Vec<String>) -> Result<Vec<MediaItem>, String> {
    let mut items = Vec::new();

    for path in file_paths {
        match import_video(path).await {
            Ok(item) => items.push(item),
            Err(e) => eprintln!("Failed to import: {}", e),
        }
    }

    if items.is_empty() {
        return Err("No videos imported successfully".to_string());
    }

    Ok(items)
}

fn generate_thumbnail_for_import(
    video_path: &str,
    id: &str,
    info: &VideoInfo,
) -> Result<String, String> {
    // Create thumbnails directory in temp
    let app_data = std::env::temp_dir().join("zapcut").join("thumbnails");
    fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;

    let thumbnail_name = format!("{}.jpg", id);
    let thumbnail_path = app_data.join(&thumbnail_name);

    // Generate thumbnail at 1 second (or 10% of duration)
    let timestamp = (info.duration * 0.1).min(1.0);

    generate_thumbnail(video_path, thumbnail_path.to_str().unwrap(), timestamp)
        .map_err(|e| format!("Failed to generate thumbnail: {}", e))?;

    Ok(thumbnail_path.to_string_lossy().to_string())
}

#[command]
pub async fn get_thumbnail_base64(thumbnail_path: String) -> Result<String, String> {
    use std::fs;
    
    // Read the thumbnail file
    let file_data = fs::read(&thumbnail_path)
        .map_err(|e| format!("Failed to read thumbnail file: {}", e))?;
    
    // Convert to base64
    let base64 = general_purpose::STANDARD.encode(&file_data);
    
    Ok(format!("data:image/jpeg;base64,{}", base64))
}

#[command]
pub async fn read_video_file(file_path: String) -> Result<Vec<u8>, String> {
    use std::fs;
    
    // Read the video file
    let file_data = fs::read(&file_path)
        .map_err(|e| format!("Failed to read video file: {}", e))?;
    
    Ok(file_data)
}

#[command]
pub async fn validate_video_file(file_path: String) -> Result<bool, String> {
    // Check file extension
    let valid_extensions = vec!["mp4", "mov", "webm", "avi", "mkv"];
    let extension = Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    match extension {
        Some(ext) if valid_extensions.contains(&ext.as_str()) => {
            // Try to get video info (validates codec support)
            get_video_info(&file_path)
                .map(|_| true)
                .map_err(|e| format!("Invalid video file: {}", e))
        }
        _ => Err("Unsupported file format".to_string()),
    }
}

// Read binary file and return as Vec<u8>
#[tauri::command]
pub async fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    use std::path::Path;
    
    // First check if file exists
    if !Path::new(&path).exists() {
        return Err(format!("File does not exist at path: {}", path));
    }
    
    // Get file metadata for debugging
    match fs::metadata(&path) {
        Ok(metadata) => {
            eprintln!("[read_binary_file] File exists - Size: {} bytes", metadata.len());
        }
        Err(e) => {
            return Err(format!("Failed to read file metadata: {} - Path: {}", e, path));
        }
    }
    
    std::fs::read(&path)
        .map_err(|e| format!("Failed to read file: {} - Path: {}", e, path))
}

