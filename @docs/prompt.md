Build a Desktop Video Editor 

**Project Links:**
- GitHub: https://github.com/Zernach/zapcut

Create an in-depth plan in the product-requirements-document.md and tasks-checklists.md files

We are building a Desktop Video Editor
We are creating a streamlined interface focused on the essentials: trim, splice, add effects, export.
A native desktop application where creators can record their screen, import clips, arrange them on a timeline, and export professional-looking videos — all without leaving the app.
You'll build a desktop video editor using Tauri and React Native that handles screen recording, webcam capture, clip import, timeline editing, and video export.
Focus on the fundamentals: import, display, trim, export.
Build for a solid rust foundation that ensures the app is unbelievably fast and optimized.
Focus on the core loop: Record → Import → Arrange → Export.
Step #1: MVP Requirements
Desktop app that launches (Tauri and React Native)
Basic video import (drag & drop or file picker for MP4/MOV)
Simple timeline view showing imported clips
Video preview player that plays imported clips
Basic trim functionality (set in/out points on a single clip)
Export to MP4
Built and packaged as a native app
Minimum Architecture
You'll need to invoke Rust commands to access screen capture (using platform-specific APIs like AVFoundation on macOS or Windows.Graphics.Capture on Windows). For webcam, use web APIs via getUserMedia() in the frontend.
Desktop framework (Electron with React/Vue or Tauri with your frontend choice)
Media processing library (FFmpeg via fluent-ffmpeg, @ffmpeg/ffmpeg, and/or native Tauri commands)
Timeline UI component (canvas-based or DOM-based with draggable clips)
Video player (HTML5 video element or VideoJS)
File system access for import/export
Core Features
Recording Features
app must support native recording:
Screen recording (full screen or window selection)
Webcam recording (access system camera)
Simultaneous screen + webcam (picture-in-picture style)
Audio capture from microphone
Record, stop, and save recordings directly to timeline

Import & Media Management
Support multiple ways to add content:
Drag and drop video files (MP4, MOV, WebM)
File picker for importing from disk
Media library panel showing imported clips
Thumbnail previews of clips
Basic metadata display (duration, resolution, file size)
Timeline Editor
Visual timeline with playhead (current time indicator)
Drag clips onto timeline
Arrange clips in sequence
Trim clips (adjust start/end points)
Split clips at playhead position
Delete clips from timeline
Multiple tracks (at least 2: main video + overlay/PiP)
Zoom in/out on timeline for precision editing
Snap-to-grid or snap-to-clip edges
Preview & Playback
Real-time preview of timeline composition
Play/pause controls
Scrubbing (drag playhead to any position)
Audio playback synchronized with video
Preview window shows current frame at playhead
Export & Sharing
Users need to get their videos out:
Export timeline to MP4
Resolution options (720p, 1080p, or source resolution)
Progress indicator during export
Save to local file system
Technical hint: FFmpeg is essential for encoding. You'll need to stitch clips, apply cuts, and render to final format.

User Stories
Usage Scenarios that must be solved:
Recording a 30-second screen capture and adding it to timeline
Importing 3 video clips and arranging them in sequence
Trimming clips and splitting at various points
Exporting a 2-minute video with multiple clips
Using webcam recording and overlay on screen recording
Testing on both Mac and Windows if possible


Step #2: Additional Features
Text overlays with custom fonts and animations
Transitions between clips (fade, slide, etc.)
Audio controls (volume adjustment, fade in/out)
Filters and effects (brightness, contrast, saturation)
Export presets for different platforms (YouTube, Instagram, TikTok)
Keyboard shortcuts for common actions
Auto-save project state
Undo/redo functionality
Performance Targets
Timeline UI remains responsive with 10+ clips
Preview playback is smooth (30 fps minimum)
Export completes without crashes
App launch time under 5 seconds
No memory leaks during extended editing sessions (test for 15+ minutes)
File size: Exported videos should maintain reasonable quality (not bloated)
Technical Stack
Desktop Framework: Tauri (Rust-based, smaller, faster)
Frontend: React, React Native
Media Processing: FFmpeg (fluent-ffmpeg for Node, @ffmpeg/ffmpeg for browser context, or native commands in Tauri)
Timeline UI: react-konva Konva.js
Video Player: → Native <video> element, Zero-friction playback, hardware-accelerated, simple API, start with plain <video> for MVP, Add Video.js/Plyr in Step #2 for nicer controls and HLS/MSE

Build Strategy
Start with Import and Preview
Get video files loading and displaying first. This validates your media pipeline.
Build the Timeline
Timeline is your core interface. Get clips draggable, trimmable, and deletable before adding complex features.
Add Recording Last
Recording is not critical for MVP. Once import/timeline/export works, add screen and webcam capture.
Test Export Early
FFmpeg encoding can be tricky. Test export with a single clip as soon as possible to avoid surprises.
Package and Test on Real Hardware
Don't wait until the last minute to build your distributable. Test the packaged app, not just dev mode.

