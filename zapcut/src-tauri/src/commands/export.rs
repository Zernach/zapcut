use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportConfig {
    pub output_path: String,
    pub resolution: String,
    pub format: String,
    pub codec: String,
    pub quality: String,
    pub fps: Option<f64>,
    pub include_audio: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Clip {
    pub id: String,
    pub file_path: String,
    pub start_time: f64,
    pub trim_start: f64,
    pub trim_end: f64,
    pub duration: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportProgress {
    pub percentage: f64,
    pub status: String,
    pub error: Option<String>,
}

lazy_static::lazy_static! {
    static ref EXPORT_PROGRESS: Arc<Mutex<ExportProgress>> = Arc::new(Mutex::new(ExportProgress {
        percentage: 0.0,
        status: "idle".to_string(),
        error: None,
    }));
}

#[command]
pub async fn export_timeline(clips: Vec<Clip>, config: ExportConfig) -> Result<String, String> {
    // Update progress
    {
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = 0.0;
        progress.status = "preparing".to_string();
        progress.error = None;
    }

    // For MVP, we'll use FFmpeg concat demuxer for simple concatenation
    // Create concat file list
    let temp_dir = std::env::temp_dir().join("zapcut");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let concat_file = temp_dir.join("concat_list.txt");
    let mut concat_content = String::new();

    // Sort clips by start_time
    let mut sorted_clips = clips.clone();
    sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());

    // For MVP: Simple concatenation without complex trimming
    for clip in sorted_clips {
        concat_content.push_str(&format!("file '{}'\n", clip.file_path));
    }

    std::fs::write(&concat_file, concat_content).map_err(|e| e.to_string())?;

    // Update progress
    {
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = 10.0;
        progress.status = "encoding".to_string();
    }

    // Build FFmpeg command
    let ffmpeg_path = if cfg!(debug_assertions) {
        "ffmpeg"
    } else {
        "ffmpeg"
    };

    let output = Command::new(ffmpeg_path)
        .args(&[
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_file.to_str().unwrap(),
            "-c",
            "copy",
            "-y",
            &config.output_path,
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.status = "error".to_string();
        progress.error = Some(error_msg.clone());
        return Err(format!("Export failed: {}", error_msg));
    }

    // Update progress to complete
    {
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = 100.0;
        progress.status = "complete".to_string();
    }

    // Clean up
    let _ = std::fs::remove_file(&concat_file);

    Ok(config.output_path)
}

#[command]
pub fn get_export_progress() -> ExportProgress {
    EXPORT_PROGRESS.lock().unwrap().clone()
}

