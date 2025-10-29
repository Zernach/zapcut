use crate::utils::ffmpeg::get_ffmpeg_path;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct PrerenderSegment {
    pub id: String,
    pub start_time: f64,
    pub end_time: f64,
    pub clip_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SegmentClip {
    pub file_path: String,
    pub trim_start: f64,
    pub trim_end: f64,
    pub duration: f64,
    pub speed: f64,
}

/// Render a timeline segment (10 seconds) into a single cached video file
/// This allows seamless playback of complex timelines without real-time compositing
#[command]
pub async fn prerender_segment(
    segment_id: String,
    clips: Vec<SegmentClip>,
    output_path: String,
) -> Result<String, String> {
    eprintln!("[Prerender] Starting segment: {}", segment_id);
    eprintln!("[Prerender] Clips: {}", clips.len());
    
    if clips.is_empty() {
        return Err("No clips to render".to_string());
    }
    
    let ffmpeg_path = get_ffmpeg_path()
        .map_err(|e| format!("FFmpeg not found: {}", e))?;
    
    // Create temp directory for intermediate files
    let temp_dir = std::env::temp_dir().join("zapcut").join("prerender");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    // For a single clip, just trim it directly
    if clips.len() == 1 {
        return render_single_clip(&clips[0], &output_path, &ffmpeg_path);
    }
    
    // For multiple clips, build a filter_complex command
    render_multiple_clips(&clips, &output_path, &ffmpeg_path, &temp_dir)
}

/// Render a single clip segment
fn render_single_clip(
    clip: &SegmentClip,
    output_path: &str,
    ffmpeg_path: &PathBuf,
) -> Result<String, String> {
    eprintln!("[Prerender] Rendering single clip");
    
    let mut args = vec![
        "-ss".to_string(),
        format!("{:.3}", clip.trim_start),
        "-i".to_string(),
        clip.file_path.clone(),
        "-t".to_string(),
        format!("{:.3}", clip.duration),
    ];
    
    // Apply speed if needed
    if (clip.speed - 1.0).abs() > 0.001 {
        args.extend(vec![
            "-vf".to_string(),
            format!("setpts={}*PTS", 1.0 / clip.speed),
            "-af".to_string(),
            format!("atempo={}", clip.speed),
        ]);
    }
    
    args.extend(vec![
        "-c:v".to_string(),
        "libx264".to_string(),
        "-preset".to_string(),
        "ultrafast".to_string(),
        "-crf".to_string(),
        "23".to_string(),
        "-c:a".to_string(),
        "aac".to_string(),
        "-y".to_string(),
        output_path.to_string(),
    ]);
    
    let output = Command::new(ffmpeg_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        eprintln!("[Prerender] FFmpeg error: {}", error);
        return Err(format!("FFmpeg failed: {}", error));
    }
    
    eprintln!("[Prerender] Single clip rendered successfully");
    Ok(output_path.to_string())
}

/// Render multiple clips using filter_complex for optimal performance
fn render_multiple_clips(
    clips: &[SegmentClip],
    output_path: &str,
    ffmpeg_path: &PathBuf,
    _temp_dir: &PathBuf,
) -> Result<String, String> {
    eprintln!("[Prerender] Rendering {} clips with filter_complex", clips.len());
    
    // Build FFmpeg command with multiple inputs and filter_complex
    let mut args = vec![];
    
    // Add all input files
    for clip in clips {
        args.push("-ss".to_string());
        args.push(format!("{:.3}", clip.trim_start));
        args.push("-t".to_string());
        args.push(format!("{:.3}", clip.duration));
        args.push("-i".to_string());
        args.push(clip.file_path.clone());
    }
    
    // Build filter_complex for concatenation
    let mut filter_parts = vec![];
    
    for (i, clip) in clips.iter().enumerate() {
        if (clip.speed - 1.0).abs() > 0.001 {
            // Apply speed adjustment
            let video_filter = format!("[{}:v]setpts={}*PTS[v{}]", i, 1.0 / clip.speed, i);
            filter_parts.push(video_filter);
            
            // Audio speed (limit to valid atempo range)
            let mut speed = clip.speed;
            let mut audio_filters = vec![];
            while speed > 2.0 {
                audio_filters.push("atempo=2.0".to_string());
                speed /= 2.0;
            }
            while speed < 0.5 {
                audio_filters.push("atempo=0.5".to_string());
                speed /= 0.5;
            }
            if (speed - 1.0).abs() > 0.001 {
                audio_filters.push(format!("atempo={:.3}", speed));
            }
            
            if !audio_filters.is_empty() {
                let audio_filter = format!("[{}:a]{}[a{}]", i, audio_filters.join(","), i);
                filter_parts.push(audio_filter);
            } else {
                filter_parts.push(format!("[{}:a]anull[a{}]", i, i));
            }
        } else {
            // No speed adjustment
            filter_parts.push(format!("[{}:v]null[v{}]", i, i));
            filter_parts.push(format!("[{}:a]anull[a{}]", i, i));
        }
    }
    
    // Concatenate all streams
    let v_inputs: Vec<String> = (0..clips.len()).map(|i| format!("[v{}]", i)).collect();
    let _a_inputs: Vec<String> = (0..clips.len()).map(|i| format!("[a{}]", i)).collect();
    
    filter_parts.push(format!(
        "{}concat=n={}:v=1:a=1[outv][outa]",
        v_inputs.join(""),
        clips.len()
    ));
    
    let filter_complex = filter_parts.join(";");
    
    args.extend(vec![
        "-filter_complex".to_string(),
        filter_complex,
        "-map".to_string(),
        "[outv]".to_string(),
        "-map".to_string(),
        "[outa]".to_string(),
        "-c:v".to_string(),
        "libx264".to_string(),
        "-preset".to_string(),
        "ultrafast".to_string(),
        "-crf".to_string(),
        "23".to_string(),
        "-c:a".to_string(),
        "aac".to_string(),
        "-y".to_string(),
        output_path.to_string(),
    ]);
    
    eprintln!("[Prerender] Executing FFmpeg with filter_complex");
    
    let output = Command::new(ffmpeg_path)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        eprintln!("[Prerender] FFmpeg error: {}", error);
        return Err(format!("FFmpeg failed: {}", error));
    }
    
    eprintln!("[Prerender] Multiple clips rendered successfully");
    Ok(output_path.to_string())
}

/// Get the cache directory for prerendered segments
#[command]
pub fn get_prerender_cache_dir() -> Result<String, String> {
    let cache_dir = std::env::temp_dir()
        .join("zapcut")
        .join("prerender_cache");
    
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;
    
    Ok(cache_dir.to_string_lossy().to_string())
}

/// Clear prerender cache
#[command]
pub fn clear_prerender_cache() -> Result<(), String> {
    let cache_dir = std::env::temp_dir()
        .join("zapcut")
        .join("prerender_cache");
    
    if cache_dir.exists() {
        std::fs::remove_dir_all(&cache_dir)
            .map_err(|e| format!("Failed to clear cache: {}", e))?;
        
        // Recreate the directory
        std::fs::create_dir_all(&cache_dir)
            .map_err(|e| format!("Failed to recreate cache dir: {}", e))?;
    }
    
    Ok(())
}

