# Video Loading Debug Guide

## Overview
Comprehensive debug logging has been added throughout the entire video loading and playback pipeline to identify issues with the video preview.

## How to Debug

1. **Open the app in dev mode**: Run `npm run tauri dev`
2. **Open Browser DevTools**: Right-click and select "Inspect" or press `Cmd+Option+I`
3. **Open the Console tab**: This is where all logs will appear
4. **Check the Terminal**: Backend logs (Rust) will appear in the terminal where you ran the dev command

## Log Categories

### 🔴 Backend Logs (Rust - Terminal Output)

#### `[read_video_file]` - Video File Reading
Located in: `src-tauri/src/commands/media.rs`

```
[read_video_file] START - Path: /path/to/video.mp4
[read_video_file] File exists - Size: 1234567 bytes (1.18 MB)
[read_video_file] SUCCESS - Read 1234567 bytes
```

**Errors to watch for:**
- `File does not exist at path:` - File path is wrong or file was deleted
- `Failed to read file metadata:` - Permission issues or file is locked
- `Failed to read video file:` - I/O error reading the file

---

### 🔵 Frontend Logs (JavaScript - Browser Console)

#### `[loadVideoBlob]` - Blob Creation from Backend Data
Located in: `src/components/Player/VideoPlayer.tsx`

```
[loadVideoBlob] START - Path: /path/to/video.mp4
[loadVideoBlob] Invoking read_video_file command...
[loadVideoBlob] Received video data - Length: 1234567 bytes
[loadVideoBlob] Created Uint8Array - Length: 1234567 bytes
[loadVideoBlob] Created Blob - Size: 1234567 bytes, Type: video/mp4
[loadVideoBlob] SUCCESS - Blob URL created: blob:http://localhost:1420/...
```

**Errors to watch for:**
- `ERROR:` - Failed to invoke backend command or data conversion failed

---

#### `[loadClipToVideo]` - Loading Clip into Video Element
```
[loadClipToVideo] START - Clip: MyVideo.mp4 Path: /path/to/video.mp4
[loadClipToVideo] Loading video blob...
[loadClipToVideo] Setting blob URL in state
[loadClipToVideo] Setting video.src to blob URL
[loadClipToVideo] Calling video.load() and waiting for metadata...
[loadClipToVideo] Metadata loaded! { duration: 10.5, videoWidth: 1920, videoHeight: 1080, readyState: 4, networkState: 2 }
[loadClipToVideo] SUCCESS - Clip loaded: MyVideo.mp4
```

**Errors to watch for:**
- `ERROR: Video ref is null` - Video element not in DOM
- `ERROR: Clip has no file path` - Clip data is corrupted
- `Video error event:` - Browser failed to decode video (codec issue)
  - Code 3 = MEDIA_ERR_DECODE (format not supported)
  - Code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (file corrupted or wrong format)

---

#### `[handleLoading]` - Main Loading Coordinator
```
[handleLoading] START - hasContent: true activeClip: MyVideo.mp4 currentTime: 0
[handleLoading] Active clip: MyVideo.mp4 activeClipState: null activeVideoIndex: 1
[handleLoading] needsActiveLoad: true
[handleLoading] Loading active clip to active video...
[handleLoading] Next clip available: MyVideo2.mp4 inactiveClipState: null
[handleLoading] Preloading next clip to inactive video...
[handleLoading] COMPLETE - duration set to: 20.5
```

**Errors to watch for:**
- `No timeline content` - No clips in timeline
- `Timeline has content but no active clip at current time` - Playhead is in a gap between clips
- `Cannot play - clip not loaded yet` - Trying to play before loading completes

---

#### `[Playback Effect]` - Play Button Logic
```
[Playback Effect] Triggered: { isPlaying: true, activeClip: MyVideo.mp4, activeClipState: MyVideo.mp4, activeVideoIndex: 1, hasVideoElement: true, videoSrc: blob:..., videoReadyState: 4, currentTime: 0 }
[Playback Effect] User wants to play
[Playback Effect] Correct clip is loaded - starting playback
[Playback Effect] Source time calculated: 0 video.currentTime: 0
[Playback Effect] Calling video.play()...
[Playback Effect] video.play() SUCCESS
```

**Errors to watch for:**
- `No video element available` - Video element not mounted
- `Video element has no src` - No video loaded yet
- `Cannot play - clip not loaded yet` - activeClip and activeClipState IDs don't match
- `video.play() ERROR:` - Browser blocked autoplay or video is corrupted

---

#### `VideoPlayer state:` - Overall State Monitoring
```
VideoPlayer state: {
  currentTime: 0,
  clipsCount: 2,
  hasContent: true,
  activeClip: MyVideo.mp4,
  activeClipState: MyVideo.mp4,
  timelineDuration: 20.5,
  activeVideoIndex: 1
}
```

**What to check:**
- `clipsCount: 0` - No clips added to timeline
- `activeClip: undefined` - Playhead not on any clip
- `activeClipState: undefined` - Video hasn't loaded yet
- Mismatch between `activeClip` and `activeClipState` - Loading in progress

---

## Common Issues and Solutions

### Issue: Black screen with "No video selected"
**Logs to check:**
1. Look for `[handleLoading] No timeline content` - You haven't added clips to timeline
2. Look for `[handleLoading] Timeline has content but no active clip` - Move playhead to time 0

### Issue: Video not loading
**Logs to check:**
1. Check backend logs for `[read_video_file] ERROR:` - File path or permission issue
2. Check for `[loadVideoBlob] ERROR:` - Backend communication failed
3. Check for `Video error event: code: 3 or 4` - Video format not supported by browser

### Issue: Play button doesn't work
**Logs to check:**
1. Look for `[Playback Effect] Cannot play - clip not loaded yet` - Wait for loading to complete
2. Look for `[Playback Effect] video.play() ERROR:` - Check the specific error message
3. Verify `videoReadyState: 4` in logs - anything less means video isn't ready

### Issue: Video loads but stays black
**Logs to check:**
1. Check `videoWidth` and `videoHeight` in metadata - should not be 0
2. Check `readyState: 4` - anything less means not fully loaded
3. Look for visibility/opacity issues in `shouldShowVideo` checks

---

## Video ReadyState Values
- `0` = HAVE_NOTHING - No data loaded
- `1` = HAVE_METADATA - Duration and dimensions known
- `2` = HAVE_CURRENT_DATA - Data for current position available
- `3` = HAVE_FUTURE_DATA - Enough data to play for a bit
- `4` = HAVE_ENOUGH_DATA - Enough data to play through (✅ Good!)

## Video NetworkState Values
- `0` = NETWORK_EMPTY - Not initialized
- `1` = NETWORK_IDLE - Loaded and ready
- `2` = NETWORK_LOADING - Actively loading (✅ Normal during load)
- `3` = NETWORK_NO_SOURCE - No source or source failed

---

## Steps to Diagnose

1. **Add a clip to timeline** and watch console:
   - Should see `[handleLoading] START`
   - Should see `[loadVideoBlob] START`
   - Should see `[read_video_file] START` in terminal
   - Should see `[loadClipToVideo] Metadata loaded!`

2. **Press play button** and watch console:
   - Should see `[Playback Effect] User wants to play`
   - Should see `[Playback Effect] Calling video.play()...`
   - Should see `[Playback Effect] video.play() SUCCESS`

3. **If anything fails**, the logs will show exactly where and why

---

## Remove Debug Logs (After Fixing)

Once the issue is identified and fixed, you can remove or comment out the console.log statements to reduce noise. Search for:
- `console.log('[loadVideoBlob]'`
- `console.log('[loadClipToVideo]'`
- `console.log('[handleLoading]'`
- `console.log('[Playback Effect]'`
- `eprintln!("[read_video_file]"`

And either delete them or change to `console.debug()` so they only show when DevTools is set to "Verbose" level.

