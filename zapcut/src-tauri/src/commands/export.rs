use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::command;
use crate::utils::ffmpeg::get_ffmpeg_path;

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
    pub speed: f64,
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

    // Create temp directory for intermediate files
    let temp_dir = std::env::temp_dir().join("zapcut");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    // Sort clips by start_time to maintain timeline order
    let mut sorted_clips = clips.clone();
    sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());

    // Update progress
    {
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = 10.0;
        progress.status = "trimming clips".to_string();
    }

    // Get FFmpeg binary path
    let ffmpeg_path = match get_ffmpeg_path() {
        Ok(path) => path,
        Err(e) => {
            let mut progress = EXPORT_PROGRESS.lock().unwrap();
            progress.status = "error".to_string();
            progress.error = Some(format!("FFmpeg not found: {}", e));
            return Err(format!("FFmpeg not found: {}", e));
        }
    };

    // Step 1: Trim each clip and save as intermediate files
    let mut trimmed_files = Vec::new();
    let total_clips = sorted_clips.len();
    
    for (index, clip) in sorted_clips.iter().enumerate() {
        let trimmed_file = temp_dir.join(format!("clip_{}.mp4", index));
        
        // Build FFmpeg command to extract trimmed segment
        // -ss: start time in source (trimStart seconds from beginning)
        // -t: duration to extract (the clip's playable duration)
        let mut ffmpeg_args = vec![
            "-ss".to_string(),
            format!("{:.3}", clip.trim_start),
            "-i".to_string(),
            clip.file_path.clone(),
            "-t".to_string(),
            format!("{:.3}", clip.duration),
        ];
        
        // Apply encoding settings based on config
        if config.codec == "h264" {
            ffmpeg_args.extend(vec![
                "-c:v".to_string(),
                "libx264".to_string(),
            ]);
        } else if config.codec == "h265" {
            ffmpeg_args.extend(vec![
                "-c:v".to_string(),
                "libx265".to_string(),
            ]);
        }
        
        // Handle audio
        if config.include_audio {
            ffmpeg_args.extend(vec![
                "-c:a".to_string(),
                "aac".to_string(),
            ]);
        } else {
            ffmpeg_args.extend(vec![
                "-an".to_string(),
            ]);
        }
        
        // Add quality settings
        let crf = match config.quality.as_str() {
            "low" => "28",
            "medium" => "23",
            "high" => "18",
            _ => "23",
        };
        ffmpeg_args.extend(vec![
            "-crf".to_string(),
            crf.to_string(),
        ]);
        
        // Build video filter chain
        let mut video_filters = Vec::new();
        
        // Add speed adjustment if not 1.0
        if (clip.speed - 1.0).abs() > 0.001 {
            // setpts filter: speed up or slow down video
            // For speed > 1.0 (faster): multiply PTS by 1/speed
            // For speed < 1.0 (slower): multiply PTS by 1/speed
            video_filters.push(format!("setpts={}*PTS", 1.0 / clip.speed));
        }
        
        // Add resolution scaling if needed
        if config.resolution != "source" {
            let scale = match config.resolution.as_str() {
                "720p" => "1280:720",
                "1080p" => "1920:1080",
                "1440p" => "2560:1440",
                "4K" => "3840:2160",
                _ => "1920:1080",
            };
            video_filters.push(format!("scale={}:force_original_aspect_ratio=decrease,pad={}:(ow-iw)/2:(oh-ih)/2", scale, scale));
        }
        
        // Apply video filters if any
        if !video_filters.is_empty() {
            ffmpeg_args.extend(vec![
                "-vf".to_string(),
                video_filters.join(","),
            ]);
        }
        
        // Add audio filter for speed if needed
        if (clip.speed - 1.0).abs() > 0.001 && config.include_audio {
            // atempo filter for audio speed (can only handle 0.5-2.0 range per filter)
            // For speeds outside this range, we need to chain multiple atempo filters
            let mut audio_filters = Vec::new();
            let mut remaining_speed = clip.speed;
            
            // Chain atempo filters to achieve the desired speed
            while remaining_speed > 2.0 {
                audio_filters.push("atempo=2.0".to_string());
                remaining_speed /= 2.0;
            }
            while remaining_speed < 0.5 {
                audio_filters.push("atempo=0.5".to_string());
                remaining_speed /= 0.5;
            }
            if (remaining_speed - 1.0).abs() > 0.001 {
                audio_filters.push(format!("atempo={:.3}", remaining_speed));
            }
            
            if !audio_filters.is_empty() {
                ffmpeg_args.extend(vec![
                    "-af".to_string(),
                    audio_filters.join(","),
                ]);
            }
        }
        
        ffmpeg_args.extend(vec![
            "-y".to_string(),
            trimmed_file.to_str().unwrap().to_string(),
        ]);
        
        let output = Command::new(&ffmpeg_path)
            .args(&ffmpeg_args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Failed to execute FFmpeg for clip {}: {}", index, e))?;
        
        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
            let mut progress = EXPORT_PROGRESS.lock().unwrap();
            progress.status = "error".to_string();
            progress.error = Some(error_msg.clone());
            
            // Clean up any created files
            for file in &trimmed_files {
                let _ = std::fs::remove_file(file);
            }
            
            return Err(format!("Failed to trim clip {}: {}", index, error_msg));
        }
        
        trimmed_files.push(trimmed_file);
        
        // Update progress
        let trim_progress = 10.0 + (index as f64 / total_clips as f64) * 40.0;
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = trim_progress;
    }

    // Update progress
    {
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = 50.0;
        progress.status = "concatenating".to_string();
    }

    // Step 2: Create concat file for trimmed clips
    let concat_file = temp_dir.join("concat_list.txt");
    let mut concat_content = String::new();
    
    for file in &trimmed_files {
        concat_content.push_str(&format!("file '{}'\n", file.to_str().unwrap()));
    }
    
    std::fs::write(&concat_file, concat_content).map_err(|e| e.to_string())?;

    // Update progress
    {
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = 60.0;
        progress.status = "finalizing".to_string();
    }

    // Step 3: Concatenate all trimmed clips
    let output = Command::new(&ffmpeg_path)
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
        .map_err(|e| format!("Failed to execute FFmpeg for concatenation: {}", e))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr).to_string();
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.status = "error".to_string();
        progress.error = Some(error_msg.clone());
        
        // Clean up
        for file in &trimmed_files {
            let _ = std::fs::remove_file(file);
        }
        let _ = std::fs::remove_file(&concat_file);
        
        return Err(format!("Export failed during concatenation: {}", error_msg));
    }

    // Update progress to complete
    {
        let mut progress = EXPORT_PROGRESS.lock().unwrap();
        progress.percentage = 100.0;
        progress.status = "complete".to_string();
    }

    // Clean up temporary files
    for file in &trimmed_files {
        let _ = std::fs::remove_file(file);
    }
    let _ = std::fs::remove_file(&concat_file);

    Ok(config.output_path)
}

#[command]
pub fn get_export_progress() -> ExportProgress {
    EXPORT_PROGRESS.lock().unwrap().clone()
}

