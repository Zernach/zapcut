# Changelog

All notable changes to ZapCut will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Screen Recording Architecture Migration** (2025-10-29)
  - Migrated from FFmpeg/AVFoundation to browser-based `navigator.mediaDevices.getDisplayMedia()`
  - Removed system permission requirements (browser handles prompts)
  - Simplified recording to start/stop only (removed pause/resume)
  - Hybrid approach: Browser captures WebM, backend re-encodes to MP4
  - Cross-platform support without OS-specific code
  - Removed ~600 lines of permission handling code

### Added
- GitHub Actions workflows for automated releases
- CI pipeline for testing builds on all platforms
- New `process_recording` Tauri command for WebM processing
- `update_recording_state` command for frontend state sync
- Browser MediaRecorder integration in useRecording hook

### Removed
- FFmpeg AVFoundation screen capture (macOS)
- System permission checks and UI warnings
- Screen device selection dropdown (browser picker handles this)
- `get_available_screens`, `check_screen_recording_permission`, `test_screen_recording_access`, `test_recording_command` commands
- `start_recording`, `stop_recording`, `pause_recording`, `resume_recording` Tauri commands
- `screen_device` and `is_paused` fields from types

## [0.1.0] - 2024-10-28

### Added
- Initial MVP release
- Video import (MP4, MOV, WebM, AVI)
- Media library with thumbnails
- Hardware-accelerated video player
- Interactive timeline editor with Konva.js
- Drag and drop clips
- Trim clips with handles
- Multiple tracks support
- Zoom in/out on timeline
- Player-timeline synchronization
- Export to MP4 with FFmpeg
- Basic export settings (resolution, format, quality)

### Technical
- Tauri 2.0 backend (Rust)
- React 18 + TypeScript frontend
- Zustand state management
- Tailwind CSS styling
- FFmpeg integration for media processing

[Unreleased]: https://github.com/Zernach/zapcut/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Zernach/zapcut/releases/tag/v0.1.0

