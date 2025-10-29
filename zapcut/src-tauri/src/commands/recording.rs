use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;
use std::process::{Command, Stdio};
use std::path::PathBuf;
use tokio::fs;
use anyhow::Result;
use crate::utils::app_init::get_recordings_dir;
use crate::utils::ffmpeg::get_ffmpeg_path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingSettings {
    pub microphone: Option<String>,
    pub microphone_enabled: bool,
    pub webcam_enabled: bool,
    pub webcam_device: Option<String>,
    pub output_path: Option<PathBuf>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingState {
    pub is_recording: bool,
    pub current_settings: RecordingSettings,
    pub output_file: Option<String>,
}

pub struct RecordingManager {
    pub state: Mutex<RecordingState>,
}

impl Default for RecordingSettings {
    fn default() -> Self {
        Self {
            microphone: None,
            microphone_enabled: false,
            webcam_enabled: false,
            webcam_device: None,
            output_path: None,
        }
    }
}

impl RecordingManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(RecordingState {
                is_recording: false,
                current_settings: RecordingSettings::default(),
                output_file: None,
            }),
        }
    }
}

// Get available microphones (simplified - browser handles enumeration)
#[tauri::command]
pub async fn get_available_microphones() -> Result<Vec<String>, String> {
    // Return empty list - browser's enumerateDevices() handles this
    Ok(vec![])
}

// Get available webcams (simplified - browser handles enumeration)
#[tauri::command]
pub async fn get_available_webcams() -> Result<Vec<String>, String> {
    // Return empty list - browser's enumerateDevices() handles this
    Ok(vec![])
}

// Process recorded WebM data from browser and optionally re-encode to MP4
#[tauri::command]
pub async fn process_recording(
    manager: State<'_, RecordingManager>,
    data: Vec<u8>,
) -> Result<String, String> {
    eprintln!("[Recording] Processing {} bytes of WebM data", data.len());
    
    // Generate output filename
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let webm_filename = format!("recording_{}.webm", timestamp);
    let mp4_filename = format!("recording_{}.mp4", timestamp);
    
    // Get the recordings directory
    let recordings_dir = get_recordings_dir()
        .map_err(|e| format!("Failed to get recordings directory: {}", e))?;
    
    let webm_path = recordings_dir.join(&webm_filename);
    let mp4_path = recordings_dir.join(&mp4_filename);
    
    // Write WebM data to temporary file
    fs::write(&webm_path, &data)
        .await
        .map_err(|e| format!("Failed to write WebM file: {}", e))?;
    
    eprintln!("[Recording] WebM file written to: {:?}", webm_path);
    
    // Re-encode to MP4 using FFmpeg for better compression and compatibility
    let ffmpeg_path = get_ffmpeg_path().map_err(|e| format!("FFmpeg not found: {}", e))?;
    
    eprintln!("[Recording] Re-encoding to MP4...");
    
    let output = Command::new(ffmpeg_path)
        .args(&[
            "-i", webm_path.to_str().unwrap(),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",  // Better quality than recording default
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            "-y",
            mp4_path.to_str().unwrap(),
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        eprintln!("[Recording] FFmpeg error: {}", stderr);
        return Err(format!("FFmpeg re-encoding failed: {}", stderr));
    }
    
    eprintln!("[Recording] MP4 file created: {:?}", mp4_path);
    
    // Delete the temporary WebM file
    if let Err(e) = fs::remove_file(&webm_path).await {
        eprintln!("[Recording] Warning: Failed to delete temporary WebM file: {}", e);
    }
    
    // Verify output file exists and has content
    match fs::metadata(&mp4_path).await {
        Ok(metadata) => {
            eprintln!("[Recording] Output file size: {} bytes", metadata.len());
            if metadata.len() == 0 {
                return Err("Recording failed: output file is empty".to_string());
            }
        }
        Err(e) => {
            return Err(format!("Recording failed: output file not found - {}", e));
        }
    }
    
    // Update state
    let mut state = manager.state.lock().await;
    state.is_recording = false;
    state.output_file = Some(mp4_path.to_string_lossy().to_string());
    
    Ok(mp4_path.to_string_lossy().to_string())
}

// Get current recording state
#[tauri::command]
pub async fn get_recording_state(manager: State<'_, RecordingManager>) -> Result<RecordingState, String> {
    let state = manager.state.lock().await;
    Ok(state.clone())
}

// Update recording state (called from frontend when recording starts/stops)
#[tauri::command]
pub async fn update_recording_state(
    manager: State<'_, RecordingManager>,
    is_recording: bool,
    settings: Option<RecordingSettings>,
) -> Result<RecordingState, String> {
    let mut state = manager.state.lock().await;
    state.is_recording = is_recording;
    
    if let Some(settings) = settings {
        state.current_settings = settings;
    }
    
    if !is_recording {
        // Reset output file when starting a new recording
        state.output_file = None;
    }
    
    Ok(state.clone())
}

// Import recording to gallery
#[tauri::command]
pub async fn import_recording_to_gallery(
    _manager: State<'_, RecordingManager>,
    file_path: String,
) -> Result<String, String> {
    // Get the base Zapcut directory
    let file_pb = PathBuf::from(&file_path);
    let recordings_parent = file_pb.parent()
        .ok_or_else(|| "Invalid file path".to_string())?;
    let zapcut_dir = recordings_parent.parent()
        .ok_or_else(|| "Invalid file path structure".to_string())?;
    
    let gallery_path = zapcut_dir.join("exports");
    
    // Ensure gallery directory exists
    fs::create_dir_all(&gallery_path)
        .await
        .map_err(|e| format!("Failed to create gallery directory: {}", e))?;
    
    // Get the filename from the source path
    let filename = file_pb
        .file_name()
        .ok_or_else(|| "Could not extract filename".to_string())?
        .to_str()
        .ok_or_else(|| "Invalid filename".to_string())?
        .to_string();
    
    let destination = gallery_path.join(&filename);
    
    fs::copy(&file_path, &destination)
        .await
        .map_err(|e| format!("Failed to copy to gallery: {}", e))?;
    
    Ok(format!("Recording imported to gallery: {}", destination.display()))
}

// Export recording to file
#[tauri::command]
pub async fn export_recording_to_file(
    _manager: State<'_, RecordingManager>,
    source_path: String,
    destination_path: String,
) -> Result<String, String> {
    fs::copy(&source_path, &destination_path)
        .await
        .map_err(|e| format!("Failed to export recording: {}", e))?;
    
    Ok(format!("Recording exported to: {}", destination_path))
}

// Generate thumbnail for recording
#[tauri::command]
pub async fn generate_recording_thumbnail(file_path: String) -> Result<String, String> {
    use std::fs;
    
    // Create thumbnails directory in temp
    let app_data = std::env::temp_dir().join("zapcut").join("thumbnails");
    fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create thumbnails directory: {}", e))?;
    
    // Generate unique thumbnail name
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S_%N");
    let thumbnail_name = format!("recording_preview_{}.jpg", timestamp);
    let thumbnail_path = app_data.join(&thumbnail_name);
    
    // Use FFmpeg to generate thumbnail at 1 second mark
    let ffmpeg_path = get_ffmpeg_path().map_err(|e| format!("FFmpeg not found: {}", e))?;
    let output = Command::new(ffmpeg_path)
        .args(&[
            "-ss", "1",
            "-i", &file_path,
            "-vframes", "1",
            "-q:v", "2",
            "-y",
            thumbnail_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg for thumbnail: {}", e))?;
    
    if !output.status.success() {
        return Err(format!(
            "FFmpeg thumbnail failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    
    Ok(thumbnail_path.to_string_lossy().to_string())
}
