use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;
use std::process::{Command, Stdio};
use std::path::PathBuf;
use tokio::fs;
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingSettings {
    pub microphone: Option<String>,
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
    pub output_file: Option<PathBuf>,
}

pub struct RecordingManager {
    pub state: Mutex<RecordingState>,
    pub process: Mutex<Option<std::process::Child>>,
}

impl Default for RecordingSettings {
    fn default() -> Self {
        Self {
            microphone: None,
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
    let output_file = settings.output_path
        .clone()
        .unwrap_or_else(|| PathBuf::from(format!("recording_{}.mp4", timestamp)));
    
    state.output_file = Some(output_file.clone());
    state.current_settings = settings.clone();
    state.is_recording = true;
    state.is_paused = false;
    
    // Build FFmpeg command based on settings
    let mut ffmpeg_cmd = Command::new("ffmpeg");
    ffmpeg_cmd.arg("-f").arg("avfoundation"); // macOS screen capture
    
    // Add video input (screen)
    match settings.screen_area {
        ScreenArea::FullScreen => {
            ffmpeg_cmd.arg("-i").arg("1:0"); // Screen capture on macOS
        },
        ScreenArea::CurrentWindow => {
            ffmpeg_cmd.arg("-i").arg("1:0"); // Simplified for now
        },
        ScreenArea::Custom { x, y, width, height } => {
            ffmpeg_cmd.arg("-i").arg("1:0");
            ffmpeg_cmd.arg("-vf").arg(format!("crop={}:{}:{}:{}", width, height, x, y));
        },
    }
    
    // Add audio input if microphone is specified
    if let Some(ref mic) = settings.microphone {
        ffmpeg_cmd.arg("-f").arg("avfoundation");
        ffmpeg_cmd.arg("-i").arg(format!(":{}", mic));
    }
    
    // Add webcam if enabled
    if settings.webcam_enabled {
        if let Some(ref webcam) = settings.webcam_device {
            ffmpeg_cmd.arg("-f").arg("avfoundation");
            ffmpeg_cmd.arg("-i").arg(format!("{}:0", webcam));
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
    
    // Output settings
    ffmpeg_cmd.arg("-c:v").arg("libx264");
    ffmpeg_cmd.arg("-preset").arg("fast");
    ffmpeg_cmd.arg("-c:a").arg("aac");
    ffmpeg_cmd.arg("-y"); // Overwrite output file
    ffmpeg_cmd.arg(&output_file);
    
    // Start the recording process
    let process = ffmpeg_cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start recording: {}", e))?;
    
    // Store the process handle
    let mut process_guard = manager.process.lock().await;
    *process_guard = Some(process);
    
    Ok(format!("Recording started: {}", output_file.display()))
}

// Stop recording
#[tauri::command]
pub async fn stop_recording(manager: State<'_, RecordingManager>) -> Result<String, String> {
    let mut state = manager.state.lock().await;
    
    if !state.is_recording {
        return Err("No recording in progress".to_string());
    }
    
    // Terminate the recording process
    let mut process_guard = manager.process.lock().await;
    if let Some(mut process) = process_guard.take() {
        process.kill().map_err(|e| format!("Failed to stop recording: {}", e))?;
    }
    
    state.is_recording = false;
    state.is_paused = false;
    
    let output_file = state.output_file.clone().unwrap_or_else(|| PathBuf::from("unknown.mp4"));
    Ok(format!("Recording stopped: {}", output_file.display()))
}

// Pause recording
#[tauri::command]
pub async fn pause_recording(manager: State<'_, RecordingManager>) -> Result<String, String> {
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
    Ok("Recording paused".to_string())
}

// Resume recording
#[tauri::command]
pub async fn resume_recording(manager: State<'_, RecordingManager>) -> Result<String, String> {
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
    Ok("Recording resumed".to_string())
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
    // This would typically copy the file to a gallery directory
    // and add metadata to a database
    let gallery_path = PathBuf::from("gallery").join(PathBuf::from(&file_path).file_name().unwrap());
    
    fs::copy(&file_path, &gallery_path)
        .await
        .map_err(|e| format!("Failed to copy to gallery: {}", e))?;
    
    Ok(format!("Recording imported to gallery: {}", gallery_path.display()))
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
