use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoInfo {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub bitrate: u64,
    pub audio_codec: Option<String>,
    pub file_size: u64,
}

#[derive(Debug, Deserialize)]
struct FFProbeOutput {
    format: FFProbeFormat,
    streams: Vec<FFProbeStream>,
}

#[derive(Debug, Deserialize)]
struct FFProbeFormat {
    duration: Option<String>,
    size: Option<String>,
    bit_rate: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FFProbeStream {
    codec_type: String,
    codec_name: String,
    width: Option<u32>,
    height: Option<u32>,
    r_frame_rate: Option<String>,
}

/// Get the path to the FFmpeg binary
/// In development mode, uses system FFmpeg
/// In production, uses bundled FFmpeg binary
pub fn get_ffmpeg_path() -> Result<PathBuf> {
    if cfg!(debug_assertions) {
        // In development, use system ffmpeg
        Ok(PathBuf::from("ffmpeg"))
    } else {
        // In production, resolve to bundled sidecar binary
        // The binary name will automatically get platform-specific suffix (.exe on Windows)
        get_sidecar_path("ffmpeg")
    }
}

/// Get the path to the FFprobe binary
/// In development mode, uses system FFprobe
/// In production, uses bundled FFprobe binary
pub fn get_ffprobe_path() -> Result<PathBuf> {
    if cfg!(debug_assertions) {
        // In development, use system ffprobe
        Ok(PathBuf::from("ffprobe"))
    } else {
        // In production, resolve to bundled sidecar binary
        get_sidecar_path("ffprobe")
    }
}

/// Helper function to get sidecar binary path
/// Constructs the path based on platform conventions
fn get_sidecar_path(binary_name: &str) -> Result<PathBuf> {
    // Get the current executable's directory
    let exe_path = std::env::current_exe()
        .context("Failed to get current executable path")?;
    let exe_dir = exe_path.parent()
        .context("Failed to get executable parent directory")?
        .to_path_buf();
    
    // Construct platform-specific binary name
    let binary_name_with_ext = if cfg!(target_os = "windows") {
        format!("{}.exe", binary_name)
    } else {
        binary_name.to_string()
    };
    
    // Try multiple locations for the binary
    let mut paths_to_try = vec![
        // Location 1: Same directory as executable (Linux, Windows in most cases)
        exe_dir.join(&binary_name_with_ext),
    ];
    
    // Location 2: Parent directory (macOS bundle root)
    if let Some(parent) = exe_dir.parent() {
        if let Some(grandparent) = parent.parent() {
            paths_to_try.push(grandparent.join(&binary_name_with_ext));
        }
    }
    
    // Location 3: Resources directory in app bundle
    if let Some(parent) = exe_dir.parent() {
        if let Some(grandparent) = parent.parent() {
            paths_to_try.push(grandparent.join("Resources").join(&binary_name_with_ext));
        }
    }
    
    // Location 4: Check if it's in a binaries subdirectory (for development)
    let arch_dir = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "macos-aarch64"
        } else {
            "macos-x86_64"
        }
    } else if cfg!(target_os = "linux") {
        "linux-x86_64"
    } else if cfg!(target_os = "windows") {
        "windows-x86_64"
    } else {
        "unknown"
    };
    
    paths_to_try.push(exe_dir.join("binaries").join(arch_dir).join(&binary_name_with_ext));
    
    // Try each path
    for path in &paths_to_try {
        if path.exists() {
            eprintln!("[FFmpeg] Found {} at: {}", binary_name, path.display());
            return Ok(path.clone());
        }
    }
    
    // If not found in any location, provide helpful error
    anyhow::bail!(
        "FFmpeg binary '{}' not found. Tried locations:\n{}\n\
         Please ensure FFmpeg is bundled with the application or installed on your system.",
        binary_name,
        paths_to_try.iter().map(|p| format!("  - {}", p.display())).collect::<Vec<_>>().join("\n")
    );
}

pub fn get_video_info(file_path: &str) -> Result<VideoInfo> {
    let ffprobe_path = get_ffprobe_path()?;
    let output = Command::new(ffprobe_path)
        .args(&[
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            file_path,
        ])
        .output()
        .context("Failed to execute ffprobe")?;

    if !output.status.success() {
        anyhow::bail!(
            "FFprobe failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    let json_str = String::from_utf8(output.stdout).context("Failed to parse ffprobe output")?;

    let probe_output: FFProbeOutput =
        serde_json::from_str(&json_str).context("Failed to parse JSON")?;

    // Extract video stream
    let video_stream = probe_output
        .streams
        .iter()
        .find(|s| s.codec_type == "video")
        .context("No video stream found")?;

    // Extract audio stream
    let audio_stream = probe_output
        .streams
        .iter()
        .find(|s| s.codec_type == "audio");

    // Parse duration
    let duration = probe_output
        .format
        .duration
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    // Parse file size
    let file_size = probe_output
        .format
        .size
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);

    // Parse bitrate
    let bitrate = probe_output
        .format
        .bit_rate
        .and_then(|b| b.parse::<u64>().ok())
        .unwrap_or(0);

    // Parse FPS
    let fps = parse_frame_rate(&video_stream.r_frame_rate).unwrap_or(30.0);

    let info = VideoInfo {
        duration,
        width: video_stream.width.unwrap_or(1920),
        height: video_stream.height.unwrap_or(1080),
        fps,
        codec: video_stream.codec_name.clone(),
        bitrate,
        audio_codec: audio_stream.map(|s| s.codec_name.clone()),
        file_size,
    };

    Ok(info)
}

fn parse_frame_rate(rate_str: &Option<String>) -> Option<f64> {
    rate_str.as_ref().and_then(|s| {
        let parts: Vec<&str> = s.split('/').collect();
        if parts.len() == 2 {
            let num = parts[0].parse::<f64>().ok()?;
            let den = parts[1].parse::<f64>().ok()?;
            Some(num / den)
        } else {
            s.parse::<f64>().ok()
        }
    })
}

pub fn generate_thumbnail(video_path: &str, output_path: &str, timestamp: f64) -> Result<()> {
    let ffmpeg_path = get_ffmpeg_path()?;
    let output = Command::new(ffmpeg_path)
        .args(&[
            "-ss",
            &timestamp.to_string(),
            "-i",
            video_path,
            "-vframes",
            "1",
            "-q:v",
            "2",
            "-y",
            output_path,
        ])
        .output()
        .context("Failed to execute ffmpeg for thumbnail")?;

    if !output.status.success() {
        anyhow::bail!(
            "FFmpeg thumbnail failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    Ok(())
}

