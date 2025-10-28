use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;

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

pub fn get_ffmpeg_path() -> String {
    if cfg!(debug_assertions) {
        "ffmpeg".to_string()
    } else {
        // TODO: Use bundled binary path
        "ffmpeg".to_string()
    }
}

pub fn get_ffprobe_path() -> String {
    if cfg!(debug_assertions) {
        "ffprobe".to_string()
    } else {
        // TODO: Use bundled binary path
        "ffprobe".to_string()
    }
}

pub fn get_video_info(file_path: &str) -> Result<VideoInfo> {
    let output = Command::new(get_ffprobe_path())
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
    let output = Command::new(get_ffmpeg_path())
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

