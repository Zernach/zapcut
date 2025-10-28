use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;
use std::process::{Command, Stdio};
use std::path::PathBuf;
use tokio::fs;
use anyhow::Result;
use crate::utils::app_init::get_recordings_dir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingSettings {
    pub microphone: Option<String>,
    pub microphone_enabled: bool,
    pub webcam_enabled: bool,
    pub webcam_device: Option<String>,
    pub screen_area: ScreenArea,
    pub aspect_ratio: AspectRatio,
    pub output_path: Option<PathBuf>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum ScreenArea {
    FullScreen,
    CurrentWindow,
    Custom { x: i32, y: i32, width: u32, height: u32 },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum AspectRatio {
    Ratio16_9,
    Ratio4_3,
    Ratio1_1,
    Custom { width: u32, height: u32 },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingState {
    pub is_recording: bool,
    pub is_paused: bool,
    pub current_settings: RecordingSettings,
    pub output_file: Option<String>,
}

pub struct RecordingManager {
    pub state: Mutex<RecordingState>,
    pub process: Mutex<Option<std::process::Child>>,
}

impl Default for RecordingSettings {
    fn default() -> Self {
        Self {
            microphone: None,
            microphone_enabled: false,
            webcam_enabled: false,
            webcam_device: None,
            screen_area: ScreenArea::FullScreen,
            aspect_ratio: AspectRatio::Ratio16_9,
            output_path: None,
        }
    }
}

impl RecordingManager {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(RecordingState {
                is_recording: false,
                is_paused: false,
                current_settings: RecordingSettings::default(),
                output_file: None,
            }),
            process: Mutex::new(None),
        }
    }
}

// Get available microphones
#[tauri::command]
pub async fn get_available_microphones() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        let _output = Command::new("system_profiler")
            .args(&["SPAudioDataType", "-json"])
            .output()
            .map_err(|e| format!("Failed to get audio devices: {}", e))?;
        
        // Parse JSON output to extract microphone names
        // This is a simplified implementation
        Ok(vec![
            "Default Microphone".to_string(),
            "Built-in Microphone".to_string(),
        ])
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows implementation would use PowerShell or DirectSound
        Ok(vec![
            "Default Microphone".to_string(),
            "Microphone Array".to_string(),
        ])
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux implementation would use PulseAudio or ALSA
        Ok(vec![
            "Default Microphone".to_string(),
            "USB Microphone".to_string(),
        ])
    }
}

// Get available webcams
#[tauri::command]
pub async fn get_available_webcams() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        // Use system_profiler to get camera devices
        Ok(vec![
            "Default Camera".to_string(),
            "Built-in Camera".to_string(),
        ])
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows implementation would use DirectShow or Media Foundation
        Ok(vec![
            "Default Camera".to_string(),
            "USB Camera".to_string(),
        ])
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux implementation would use V4L2
        Ok(vec![
            "Default Camera".to_string(),
            "USB Camera".to_string(),
        ])
    }
}

// Start recording
#[tauri::command]
pub async fn start_recording(
    manager: State<'_, RecordingManager>,
    settings: RecordingSettings,
) -> Result<String, String> {
    let mut state = manager.state.lock().await;
    
    if state.is_recording {
        return Err("Recording is already in progress".to_string());
    }
    
    // Generate output filename
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("recording_{}.mp4", timestamp);
    
    // Get the recordings directory
    let recordings_dir = get_recordings_dir()
        .map_err(|e| format!("Failed to get recordings directory: {}", e))?;
    
    let output_file = settings.output_path
        .clone()
        .unwrap_or_else(|| recordings_dir.join(&filename));
    
    state.output_file = Some(output_file.to_string_lossy().to_string());
    state.current_settings = settings.clone();
    state.is_recording = true;
    state.is_paused = false;
    
    // Build FFmpeg command based on settings
    let mut ffmpeg_cmd = Command::new("ffmpeg");
    
    // Set frame rate and other video options before input
    ffmpeg_cmd.arg("-framerate").arg("30");
    ffmpeg_cmd.arg("-f").arg("avfoundation");
    
    // Add video input (screen)
    match settings.screen_area {
        ScreenArea::FullScreen => {
            ffmpeg_cmd.arg("-i").arg("1:0"); // Screen capture on macOS (1 = first screen)
        },
        ScreenArea::CurrentWindow => {
            ffmpeg_cmd.arg("-i").arg("1:0"); // Simplified for now
        },
        ScreenArea::Custom { x, y, width, height } => {
            ffmpeg_cmd.arg("-i").arg("1:0");
            ffmpeg_cmd.arg("-vf").arg(format!("crop={}:{}:{}:{}", width, height, x, y));
        },
    }
    
    // Add audio input if microphone is enabled
    if settings.microphone_enabled {
        ffmpeg_cmd.arg("-f").arg("avfoundation");
        ffmpeg_cmd.arg("-i").arg(":0"); // Default microphone on macOS
    }
    
    // Add webcam if enabled
    if settings.webcam_enabled {
        if let Some(ref _webcam) = settings.webcam_device {
            ffmpeg_cmd.arg("-f").arg("avfoundation");
            ffmpeg_cmd.arg("-i").arg("0:0"); // Default camera
        }
    }
    
    // Set aspect ratio
    match settings.aspect_ratio {
        AspectRatio::Ratio16_9 => {
            ffmpeg_cmd.arg("-aspect").arg("16:9");
        },
        AspectRatio::Ratio4_3 => {
            ffmpeg_cmd.arg("-aspect").arg("4:3");
        },
        AspectRatio::Ratio1_1 => {
            ffmpeg_cmd.arg("-aspect").arg("1:1");
        },
        AspectRatio::Custom { width, height } => {
            ffmpeg_cmd.arg("-aspect").arg(format!("{}:{}", width, height));
        },
    }
    
    // Video codec settings
    ffmpeg_cmd.arg("-c:v").arg("libx264");
    ffmpeg_cmd.arg("-preset").arg("fast");
    ffmpeg_cmd.arg("-crf").arg("28"); // Quality setting
    
    // Audio codec settings (if audio input exists)
    if settings.microphone_enabled || settings.webcam_enabled {
        ffmpeg_cmd.arg("-c:a").arg("aac");
    }
    
    // Overwrite output file and set output path
    ffmpeg_cmd.arg("-y");
    ffmpeg_cmd.arg(output_file.to_str().unwrap());
    
    // Start the recording process
    let mut process = ffmpeg_cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start recording: {}", e))?;
    
    // Capture stderr for debugging
    if let Some(stderr) = process.stderr.take() {
        let stderr_handle = std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    eprintln!("[FFmpeg] {}", line);
                }
            }
        });
        // Detach the thread so it doesn't block
        let _ = stderr_handle;
    }
    
    // Store the process handle
    let mut process_guard = manager.process.lock().await;
    *process_guard = Some(process);
    
    Ok(format!("Recording started: {}", output_file.display()))
}

// Stop recording
#[tauri::command]
pub async fn stop_recording(manager: State<'_, RecordingManager>) -> Result<RecordingState, String> {
    let mut state = manager.state.lock().await;
    
    if !state.is_recording {
        return Err("No recording in progress".to_string());
    }
    
    // Terminate the recording process gracefully by sending 'q' to stdin
    let mut process_guard = manager.process.lock().await;
    if let Some(mut process) = process_guard.take() {
        // Send 'q' command to stdin to gracefully quit FFmpeg
        if let Some(mut stdin) = process.stdin.take() {
            use std::io::Write;
            let _ = stdin.write_all(b"q\n");
            let _ = stdin.flush();
        }
        
        // Wait for the process to finish (with a timeout)
        let result = tokio::task::spawn_blocking(move || {
            process.wait()
        }).await;
        
        if result.is_err() {
            // If waiting fails, just log it - the process should still have written the file
            eprintln!("Warning: Could not wait for FFmpeg process to finish");
        }
    }
    
    state.is_recording = false;
    state.is_paused = false;
    
    Ok(state.clone())
}

// Pause recording
#[tauri::command]
pub async fn pause_recording(manager: State<'_, RecordingManager>) -> Result<RecordingState, String> {
    let mut state = manager.state.lock().await;
    
    if !state.is_recording {
        return Err("No recording in progress".to_string());
    }
    
    if state.is_paused {
        return Err("Recording is already paused".to_string());
    }
    
    // Send SIGSTOP to pause the process
    let mut process_guard = manager.process.lock().await;
    if let Some(ref mut process) = process_guard.as_mut() {
        unsafe {
            libc::kill(process.id() as i32, libc::SIGSTOP);
        }
    }
    
    state.is_paused = true;
    Ok(state.clone())
}

// Resume recording
#[tauri::command]
pub async fn resume_recording(manager: State<'_, RecordingManager>) -> Result<RecordingState, String> {
    let mut state = manager.state.lock().await;
    
    if !state.is_recording {
        return Err("No recording in progress".to_string());
    }
    
    if !state.is_paused {
        return Err("Recording is not paused".to_string());
    }
    
    // Send SIGCONT to resume the process
    let mut process_guard = manager.process.lock().await;
    if let Some(ref mut process) = process_guard.as_mut() {
        unsafe {
            libc::kill(process.id() as i32, libc::SIGCONT);
        }
    }
    
    state.is_paused = false;
    Ok(state.clone())
}

// Get current recording state
#[tauri::command]
pub async fn get_recording_state(manager: State<'_, RecordingManager>) -> Result<RecordingState, String> {
    let state = manager.state.lock().await;
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
    
    // Get video duration first
    let ffprobe_output = Command::new("ffprobe")
        .args(&[
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1:noprint_names=1",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to get video duration: {}", e))?;
    
    let duration_str = String::from_utf8_lossy(&ffprobe_output.stdout);
    let duration: f64 = duration_str.trim().parse().unwrap_or(1.0);
    
    // Generate thumbnail at 10% of the duration (or 1 second minimum)
    let timestamp_seconds = (duration * 0.1).max(1.0).min(duration);
    
    // Use FFmpeg to generate thumbnail
    let output = Command::new("ffmpeg")
        .args(&[
            "-ss", &timestamp_seconds.to_string(),
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
