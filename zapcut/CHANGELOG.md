# Changelog

All notable changes to ZapCut will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions workflows for automated releases
- CI pipeline for testing builds on all platforms

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

