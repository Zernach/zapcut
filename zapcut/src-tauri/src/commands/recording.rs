use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;
use std::process::{Command, Stdio};
use std::path::PathBuf;
use tokio::fs;
use anyhow::Result;
use crate::utils::app_init::get_recordings_dir;

#[cfg(target_os = "macos")]
use cocoa::base::nil;
#[cfg(target_os = "macos")]
use cocoa::foundation::NSAutoreleasePool;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingSettings {
    pub microphone: Option<String>,
    pub microphone_enabled: bool,
    pub webcam_enabled: bool,
    pub webcam_device: Option<String>,
    pub screen_device: Option<String>,
    pub output_path: Option<PathBuf>,
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
            screen_device: None,
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

// Get available screen recording devices
#[tauri::command]
pub async fn get_available_screens() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        // Use FFmpeg to get actual device list
        let output = Command::new("ffmpeg")
            .args(&["-f", "avfoundation", "-list_devices", "true", "-i", ""])
            .output()
            .map_err(|e| format!("Failed to get screen devices: {}", e))?;
        
        let stderr = String::from_utf8_lossy(&output.stderr);
        let mut screens = Vec::new();
        
        // Parse FFmpeg output for screen capture devices
        for line in stderr.lines() {
            if line.contains("AVFoundation video devices:") {
                continue;
            }
            if line.contains("[") && line.contains("]") && line.contains("Capture screen") {
                // Extract device name from line like "[1] Capture screen 0"
                if let Some(start) = line.find("] ") {
                    let device_name = line[start + 2..].trim().to_string();
                    if !device_name.is_empty() {
                        screens.push(device_name);
                    }
                }
            }
        }
        
        if screens.is_empty() {
            // Fallback to default if parsing fails
            screens.push("Primary Screen".to_string());
        }
        
        Ok(screens)
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows implementation would use DirectShow or Media Foundation
        Ok(vec![
            "Primary Screen".to_string(),
            "Secondary Screen".to_string(),
        ])
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux implementation would use X11 or Wayland
        Ok(vec![
            "Primary Screen".to_string(),
            "Secondary Screen".to_string(),
        ])
    }
}

// Get available microphones
#[tauri::command]
pub async fn get_available_microphones() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        // Use FFmpeg to get actual device list
        let output = Command::new("ffmpeg")
            .args(&["-f", "avfoundation", "-list_devices", "true", "-i", ""])
            .output()
            .map_err(|e| format!("Failed to get audio devices: {}", e))?;
        
        let stderr = String::from_utf8_lossy(&output.stderr);
        let mut microphones = Vec::new();
        
        // Parse FFmpeg output for audio devices
        for line in stderr.lines() {
            if line.contains("AVFoundation audio devices:") {
                continue;
            }
            if line.contains("[") && line.contains("]") && line.contains("audio") {
                // Extract device name from line like "[0] MacBook Pro Microphone"
                if let Some(start) = line.find("] ") {
                    let device_name = line[start + 2..].trim().to_string();
                    if !device_name.is_empty() {
                        microphones.push(device_name);
                    }
                }
            }
        }
        
        if microphones.is_empty() {
            // Fallback to default if parsing fails
            microphones.push("Default Microphone".to_string());
        }
        
        Ok(microphones)
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
        // Use FFmpeg to get actual device list
        let output = Command::new("ffmpeg")
            .args(&["-f", "avfoundation", "-list_devices", "true", "-i", ""])
            .output()
            .map_err(|e| format!("Failed to get camera devices: {}", e))?;
        
        let stderr = String::from_utf8_lossy(&output.stderr);
        let mut webcams = Vec::new();
        
        // Parse FFmpeg output for video devices (excluding screen capture)
        for line in stderr.lines() {
            if line.contains("AVFoundation video devices:") {
                continue;
            }
            if line.contains("[") && line.contains("]") && line.contains("Camera") {
                // Extract device name from line like "[0] FaceTime HD Camera"
                if let Some(start) = line.find("] ") {
                    let device_name = line[start + 2..].trim().to_string();
                    if !device_name.is_empty() && !device_name.contains("Capture screen") {
                        webcams.push(device_name);
                    }
                }
            }
        }
        
        if webcams.is_empty() {
            // Fallback to default if parsing fails
            webcams.push("Default Camera".to_string());
        }
        
        Ok(webcams)
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

// Check screen recording permission on macOS
#[tauri::command]
pub async fn check_screen_recording_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        unsafe {
            let _pool = NSAutoreleasePool::new(nil);
            
            // Use CGPreflightScreenCaptureAccess to check permission
            extern "C" {
                fn CGPreflightScreenCaptureAccess() -> bool;
            }
            
            let has_permission = CGPreflightScreenCaptureAccess();
            eprintln!("[Permission Check] CGPreflightScreenCaptureAccess returned: {}", has_permission);
            
            // Also try a test FFmpeg command to see if screen capture works
            let test_result = Command::new("ffmpeg")
                .args(&["-f", "avfoundation", "-list_devices", "true", "-i", ""])
                .output();
            
            match test_result {
                Ok(output) => {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    eprintln!("[Permission Check] FFmpeg device list test successful");
                    eprintln!("[Permission Check] FFmpeg stderr: {}", stderr);
                    
                    // If FFmpeg can list devices without permission errors, we likely have permission
                    let has_ffmpeg_access = !stderr.contains("Permission denied") && 
                                          !stderr.contains("not permitted") &&
                                          stderr.contains("Capture screen");
                    
                    eprintln!("[Permission Check] FFmpeg access check: {}", has_ffmpeg_access);
                    
                    // Return true if either the API check or FFmpeg test indicates permission
                    Ok(has_permission || has_ffmpeg_access)
                }
                Err(e) => {
                    eprintln!("[Permission Check] FFmpeg test failed: {}", e);
                    // Fall back to API result
                    Ok(has_permission)
                }
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        // On non-macOS platforms, assume permission is granted
        Ok(true)
    }
}

// Test screen recording access with FFmpeg
#[tauri::command]
pub async fn test_screen_recording_access() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        // Try to run FFmpeg with screen capture to test access
        let test_result = Command::new("ffmpeg")
            .args(&[
                "-f", "avfoundation",
                "-i", "1",  // Screen capture device
                "-t", "1",  // Record for 1 second
                "-f", "null",  // Output to null (we don't want to save)
                "-"
            ])
            .output();
        
        match test_result {
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                
                eprintln!("[Test] FFmpeg test stdout: {}", stdout);
                eprintln!("[Test] FFmpeg test stderr: {}", stderr);
                
                if stderr.contains("Permission denied") || stderr.contains("not permitted") {
                    Ok("Permission denied - screen recording access not granted".to_string())
                } else if output.status.success() {
                    Ok("Screen recording access granted - test successful".to_string())
                } else {
                    Ok(format!("Screen recording test failed with status: {}, stderr: {}", output.status, stderr))
                }
            }
            Err(e) => {
                Ok(format!("Failed to run FFmpeg test: {}", e))
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Ok("Screen recording test not applicable on this platform".to_string())
    }
}

// Test the exact FFmpeg command that would be used for recording
#[tauri::command]
pub async fn test_recording_command(settings: RecordingSettings) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        // Generate output filename
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let filename = format!("test_recording_{}.mp4", timestamp);
        
        // Get the recordings directory
        let recordings_dir = get_recordings_dir()
            .map_err(|e| format!("Failed to get recordings directory: {}", e))?;
        
        let output_file = recordings_dir.join(&filename);
        
        // Build FFmpeg command based on settings
        let mut ffmpeg_cmd = Command::new("ffmpeg");
        
        // Prevent FFmpeg from reading stdin (critical for screen recording)
        ffmpeg_cmd.arg("-nostdin");
        
        // Suppress excessive logging
        ffmpeg_cmd.arg("-loglevel").arg("error");
        
        // Set frame rate and input format
        ffmpeg_cmd.arg("-framerate").arg("30");
        ffmpeg_cmd.arg("-f").arg("avfoundation");
        
        // Specify capture pixel format (must be before -i)
        ffmpeg_cmd.arg("-pixel_format").arg("uyvy422");
        
        // Add video input (screen) - macOS uses device index for screen capture
        let screen_device_index = match &settings.screen_device {
            Some(device) => {
                // Parse device name to get index (e.g., "Capture screen 0" -> "1")
                if device.contains("Capture screen 0") {
                    "1"
                } else if device.contains("Capture screen 1") {
                    "2"
                } else {
                    "1" // Default to primary screen
                }
            }
            None => "1", // Default to primary screen
        };
        
        if settings.microphone_enabled {
            // Screen + audio input: "screen_index:audio_index" (screen + audio device)
            ffmpeg_cmd.arg("-i").arg(format!("{}:0", screen_device_index));
        } else {
            // Screen only input: "screen_index" (screen, no audio)
            ffmpeg_cmd.arg("-i").arg(screen_device_index);
        }
        
        // Video codec settings - use hardware acceleration if available
        ffmpeg_cmd.arg("-c:v").arg("libx264");
        ffmpeg_cmd.arg("-preset").arg("fast");
        ffmpeg_cmd.arg("-crf").arg("28"); // Quality setting (lower = better, 28 = good balance)
        ffmpeg_cmd.arg("-pix_fmt").arg("yuv420p"); // Explicitly set output pixel format
        
        // Audio codec settings (if microphone enabled)
        if settings.microphone_enabled {
            ffmpeg_cmd.arg("-c:a").arg("aac");
            ffmpeg_cmd.arg("-b:a").arg("128k");
            // Map video from input 0, audio from input 1 (since we use "1:0" format)
            ffmpeg_cmd.arg("-map").arg("0:v");
            ffmpeg_cmd.arg("-map").arg("0:a");
        }
        
        // MP4-specific flags for proper finalization and seek ability
        ffmpeg_cmd.arg("-movflags").arg("+faststart+empty_moov");
        
        // Overwrite output file and set output path
        ffmpeg_cmd.arg("-y");
        ffmpeg_cmd.arg(output_file.to_str().unwrap());
        
        // Get the command as a string for display
        let command_args: Vec<String> = ffmpeg_cmd.get_args().map(|s| s.to_string_lossy().to_string()).collect();
        let command_string = format!("ffmpeg {}", command_args.join(" "));
        
        // Try to run the command for 2 seconds to test it
        let test_result = Command::new("ffmpeg")
            .args(ffmpeg_cmd.get_args())
            .arg("-t").arg("2") // Record for only 2 seconds
            .output();
        
        match test_result {
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                
                Ok(format!("Command: {}\n\nTest Result:\nSTDOUT: {}\nSTDERR: {}", command_string, stdout, stderr))
            }
            Err(e) => {
                Ok(format!("Command: {}\n\nTest Failed: {}", command_string, e))
            }
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Ok("Recording command test not applicable on this platform".to_string())
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
    
    eprintln!("[Recording] Output directory: {:?}", recordings_dir);
    eprintln!("[Recording] Output file path: {:?}", output_file);
    eprintln!("[Recording] Directory exists: {}", recordings_dir.exists());
    eprintln!("[Recording] Directory writable: {:?}", std::fs::metadata(&recordings_dir).map(|m| m.permissions().readonly() == false));
    
    state.output_file = Some(output_file.to_string_lossy().to_string());
    state.current_settings = settings.clone();
    state.is_recording = true;
    state.is_paused = false;
    
    // Build FFmpeg command based on settings
    let mut ffmpeg_cmd = Command::new("ffmpeg");
    
    // Prevent FFmpeg from reading stdin (critical for screen recording)
    ffmpeg_cmd.arg("-nostdin");
    
    // Suppress excessive logging
    ffmpeg_cmd.arg("-loglevel").arg("error");
    
    // Set frame rate and input format
    ffmpeg_cmd.arg("-framerate").arg("30");
    ffmpeg_cmd.arg("-f").arg("avfoundation");
    
    // Specify capture pixel format (must be before -i)
    ffmpeg_cmd.arg("-pixel_format").arg("uyvy422");
    
    // Add video input (screen) - macOS uses device index for screen capture
    // Format: screen_index:audio_index or screen_index:none
    let screen_device_index = match &settings.screen_device {
        Some(device) => {
            // Parse device name to get index (e.g., "Capture screen 0" -> "1")
            if device.contains("Capture screen 0") {
                "1"
            } else if device.contains("Capture screen 1") {
                "2"
            } else {
                "1" // Default to primary screen
            }
        }
        None => "1", // Default to primary screen
    };
    
    if settings.microphone_enabled {
        // Screen + audio input: "screen_index:audio_index" (screen + audio device)
        ffmpeg_cmd.arg("-i").arg(format!("{}:0", screen_device_index));
    } else {
        // Screen only input: "screen_index" (screen, no audio)
        ffmpeg_cmd.arg("-i").arg(screen_device_index);
    }
    
    // Video codec settings - use hardware acceleration if available
    ffmpeg_cmd.arg("-c:v").arg("libx264");
    ffmpeg_cmd.arg("-preset").arg("fast");
    ffmpeg_cmd.arg("-crf").arg("28"); // Quality setting (lower = better, 28 = good balance)
    ffmpeg_cmd.arg("-pix_fmt").arg("yuv420p"); // Explicitly set output pixel format
    
    // Audio codec settings (if microphone enabled)
    if settings.microphone_enabled {
        ffmpeg_cmd.arg("-c:a").arg("aac");
        ffmpeg_cmd.arg("-b:a").arg("128k");
        // Map video from input 0, audio from input 1 (since we use "1:0" format)
        ffmpeg_cmd.arg("-map").arg("0:v");
        ffmpeg_cmd.arg("-map").arg("0:a");
    }
    
    // MP4-specific flags for proper finalization and seek ability
    ffmpeg_cmd.arg("-movflags").arg("+faststart+empty_moov");
    
    // Overwrite output file and set output path
    ffmpeg_cmd.arg("-y");
    ffmpeg_cmd.arg(output_file.to_str().unwrap());
    
    // Log the FFmpeg command for debugging
    eprintln!("[Recording] Starting FFmpeg with command: ffmpeg {:?}", ffmpeg_cmd.get_args().collect::<Vec<_>>());
    
    // Start the recording process
    let mut process = ffmpeg_cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start recording: {}", e))?;
    
    eprintln!("[Recording] FFmpeg process started with PID: {}", process.id());
    
    // Give FFmpeg a moment to start and check if it's still running
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // Check if the process is still running after a brief delay
    match process.try_wait() {
        Ok(Some(status)) => {
            eprintln!("[Recording] ERROR: FFmpeg process exited immediately with status: {}", status);
            return Err(format!("FFmpeg process failed to start properly. Exit code: {}", status.code().unwrap_or(-1)));
        }
        Ok(None) => {
            eprintln!("[Recording] FFmpeg process is running successfully");
        }
        Err(e) => {
            eprintln!("[Recording] ERROR: Failed to check FFmpeg process status: {}", e);
            return Err(format!("Failed to verify FFmpeg process: {}", e));
        }
    }
    
    // Capture stderr for debugging and error detection
    if let Some(stderr) = process.stderr.take() {
        let stderr_handle = std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stderr);
            let mut error_detected = false;
            
            for line in reader.lines() {
                if let Ok(line) = line {
                    eprintln!("[FFmpeg] {}", line);
                    
                    // Detect common errors and provide helpful messages
                    if line.contains("Permission denied") || line.contains("not permitted") {
                        eprintln!("[Recording] ERROR: Screen recording permission denied. Please enable in System Settings > Privacy & Security > Screen Recording");
                        error_detected = true;
                    } else if line.contains("No such file or directory") {
                        eprintln!("[Recording] ERROR: FFmpeg not found. Please install FFmpeg.");
                        error_detected = true;
                    } else if line.contains("Invalid data found") {
                        eprintln!("[Recording] ERROR: Invalid input format. Check device selection.");
                        error_detected = true;
                    } else if line.contains("error") || line.contains("Error") || line.contains("ERROR") {
                        eprintln!("[Recording] ERROR: FFmpeg error detected: {}", line);
                        error_detected = true;
                    } else if line.contains("failed") || line.contains("Failed") || line.contains("FAILED") {
                        eprintln!("[Recording] ERROR: FFmpeg failure detected: {}", line);
                        error_detected = true;
                    }
                }
            }
            
            if error_detected {
                eprintln!("[Recording] CRITICAL: FFmpeg errors detected - recording may fail");
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
    
    eprintln!("[Recording] Stopping recording, output_file: {:?}", state.output_file);
    
    // Terminate the recording process gracefully using SIGTERM
    let mut process_guard = manager.process.lock().await;
    if let Some(mut process) = process_guard.take() {
        // Get the process ID for sending signals
        let pid = process.id() as i32;
        
        // Send SIGTERM for graceful shutdown
        unsafe {
            libc::kill(pid, libc::SIGTERM);
        }
        
        // Wait for the process to finish (with a timeout of 5 seconds)
        let result = tokio::task::spawn_blocking(move || {
            use std::time::Instant;
            let start = Instant::now();
            loop {
                match process.try_wait() {
                    Ok(Some(status)) => {
                        eprintln!("FFmpeg process terminated with status: {}", status);
                        
                        // Check if FFmpeg exited successfully
                        if !status.success() {
                            eprintln!("[Recording] WARNING: FFmpeg exited with error code: {}", status.code().unwrap_or(-1));
                            return Err(format!("FFmpeg recording failed with exit code: {}", status.code().unwrap_or(-1)));
                        }
                        
                        // Wait additional time for file to be flushed to disk
                        std::thread::sleep(std::time::Duration::from_millis(1000));
                        return Ok(());
                    },
                    Ok(None) => {
                        // Process still running
                        if start.elapsed().as_secs() > 5 {
                            eprintln!("FFmpeg process did not respond to SIGTERM, force killing");
                            unsafe {
                                libc::kill(pid, libc::SIGKILL);
                            }
                            let _ = process.wait();
                            // Wait additional time for file to be flushed to disk
                            std::thread::sleep(std::time::Duration::from_millis(1000));
                            return Ok(());
                        }
                        std::thread::sleep(std::time::Duration::from_millis(100));
                    },
                    Err(e) => {
                        eprintln!("Error waiting for FFmpeg process: {}", e);
                        return Err(format!("Error waiting for FFmpeg: {}", e));
                    }
                }
            }
        }).await;
        
        if let Err(e) = result {
            eprintln!("FFmpeg process error: {}", e);
            return Err(format!("Recording failed: {}", e));
        }
    }
    
    state.is_recording = false;
    state.is_paused = false;
    
    eprintln!("[Recording] Recording stopped, returning state with output_file: {:?}", state.output_file);
    
    // Verify output file exists
    if let Some(ref output_file) = state.output_file {
        match fs::metadata(output_file).await {
            Ok(metadata) => {
                eprintln!("[Recording] Output file exists - Size: {} bytes", metadata.len());
                if metadata.len() == 0 {
                    eprintln!("[Recording] WARNING: Output file is empty!");
                    return Err("Recording failed: output file is empty".to_string());
                }
            }
            Err(e) => {
                eprintln!("[Recording] WARNING: Output file does not exist or cannot be read: {} - Path: {}", e, output_file);
                return Err(format!("Recording failed: output file not found at {}", output_file));
            }
        }
    }
    
    // Give extra time for MP4 finalization (MP4 files need proper moov atom at end)
    eprintln!("[Recording] Waiting for MP4 finalization...");
    tokio::time::sleep(tokio::time::Duration::from_millis(5000)).await;
    
    // Double-check file size after finalization
    if let Some(ref output_file) = state.output_file {
        match fs::metadata(output_file).await {
            Ok(metadata) => {
                eprintln!("[Recording] Final output file size: {} bytes", metadata.len());
            }
            Err(e) => {
                eprintln!("[Recording] WARNING: Could not read final file metadata: {}", e);
            }
        }
    }
    
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
