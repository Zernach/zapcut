# Video Loading Debug Guide

## Overview
Comprehensive debug logging has been added throughout the entire video loading and playback pipeline to identify the black screen issue and any potential infinite loops.

**Date Added**: October 29, 2025
**Issue**: Video preview shows black screen when pressing play - suspected infinite loop

## ✅ ISSUE RESOLVED (3 FIXES REQUIRED)

### Fix #1: Missing proxyPath Mapping
**Root Cause**: The `proxyPath` field was not being mapped from the backend response (`proxy_path`) to the frontend MediaItem format.

**Fix Applied**: Updated `useMediaImport.ts` to include `proxyPath: item.proxy_path` in the transformation mapping.

### Fix #2: Tauri v2 Asset Protocol Limitations
**Root Cause**: Tauri v2's `convertFileSrc` is designed for bundled assets only, not arbitrary filesystem paths. It doesn't have permission configuration for user directories, causing "unsupported URL" errors (Error Code 4: MEDIA_ERR_SRC_NOT_SUPPORTED) when trying to load videos from Downloads or temp directories.

**Fix Applied**: Implemented a custom `stream://` protocol handler in Rust that serves local video files with proper HTTP headers for streaming:
- Registered custom protocol in `main.rs` using `.register_asynchronous_uri_scheme_protocol()`
- Updated CSP in `tauri.conf.json` to allow `stream:` protocol
- Replaced all `convertFileSrc()` calls with `stream://localhost/` URLs
- Added `urlencoding` and `http` dependencies to Cargo.toml

### Fix #3: Frontend URL Generation
**Root Cause**: Multiple files were using `convertFileSrc` which doesn't work for user files in Tauri v2.

**Fix Applied**: Replaced `convertFileSrc` with custom URL generation across the codebase:
```typescript
// Old (broken):
const url = convertFileSrc(filePath);

// New (working):
const url = `stream://localhost/${encodeURIComponent(filePath)}`;
```

**Files Modified**:
- `/src-tauri/src/main.rs` - Added custom stream:// protocol handler
- `/src-tauri/Cargo.toml` - Added urlencoding and http dependencies
- `/src-tauri/tauri.conf.json` - Updated CSP to allow stream: protocol
- `/src/hooks/useMediaImport.ts` - Added proxyPath mapping
- `/src/components/Player/VideoPlayer.tsx` - Replaced convertFileSrc with stream:// URLs
- `/src/utils/webgl/TexturePool.ts` - Replaced convertFileSrc with stream:// URLs
- `/src/utils/videoURLManager.ts` - Replaced convertFileSrc with stream:// URLs

**⚠️ Important**: After modifying Tauri configuration and Rust code, you must **restart the dev server** for changes to take effect.

---

## How to Debug

1. **Open the app in dev mode**: Run `npm run tauri:dev`
2. **Open Browser DevTools**: Right-click and select "Inspect" or press `Cmd+Option+I`
3. **Open the Console tab**: This is where all logs will appear
4. **Filter logs**: Type `[VideoPlayer` in the console filter to see only video-related logs

## Log Categories

All logs are prefixed with their location for easy tracking:

### 🔵 Frontend Logs (JavaScript - Browser Console)

#### `[VideoPlayer:render]` - Component Rendering
```
[VideoPlayer:render] Component rendering { src: undefined, autoPlay: false }
```
Shows when the component re-renders. Watch for excessive re-renders (infinite loop indicator).

---

#### `[VideoPlayer:activeClip]` - Active Clip Calculation
```
[VideoPlayer:activeClip] Recomputed { 
  debouncedTime: 0, 
  clipId: 'clip-123', 
  clipName: 'MyVideo.mp4',
  totalClips: 3
}
```
Shows which clip should be active at the current playhead position. If this logs excessively, there's a render loop.

---

#### `[VideoPlayer:useEffect]` - Clip Loading Effect
```
[VideoPlayer:useEffect] Clip loading effect triggered {
  activeClipId: 'clip-123',
  hasContent: true,
  timelineDuration: 15.5
}
```
Triggered when clips need to be loaded/switched.

---

#### `[VideoPlayer:handleLoading]` - Loading Coordinator
```
[VideoPlayer:handleLoading] Starting {
  hasContent: true,
  activeClipId: 'clip-123',
  activeClipName: 'MyVideo.mp4',
  src: undefined
}

[VideoPlayer:handleLoading] Active video check {
  activeVideoIndex: 1,
  activeClipId: 'clip-123',
  loadedClipId: null,
  isCorrectClipLoaded: false,
  hasSrc: false,
  readyState: 0
}

[VideoPlayer:handleLoading] Loading active clip to active video {
  clipId: 'clip-123',
  activeVideoIndex: 1
}
```

**Watch for:**
- Repeated loading of same clip (loop indicator)
- `readyState: 0` staying at 0 (video not loading)

---

#### `[VideoPlayer:loadClipToVideo]` - Individual Clip Loading
```
[VideoPlayer:loadClipToVideo] Starting load {
  clipId: 'clip-123',
  clipName: 'MyVideo.mp4',
  hasProxy: true,
  filePath: '/path/to/video.mp4',
  proxyPath: '/tmp/proxy.mp4'
}

[VideoPlayer:loadClipToVideo] Generated URL { 
  clipId: 'clip-123', 
  videoUrl: 'asset://localhost/...'
}

[VideoPlayer:loadClipToVideo] Set video src and starting load {
  clipId: 'clip-123',
  readyState: 0
}

[VideoPlayer:loadClipToVideo] Metadata loaded successfully {
  clipId: 'clip-123',
  duration: 10.5,
  readyState: 1
}
```

**Errors to watch for:**
- `Early exit` - Missing video element or file path
- `Video load error` - File not found or can't be decoded

---

#### `[VideoPlayer:playback]` - Playback Control
```
[VideoPlayer:playback] Effect triggered {
  hasVideo: true,
  hasSrc: true,
  isPlaying: true,
  activeVideoIndex: 1,
  activeClipId: 'clip-123',
  activeClipStateId: 'clip-123',
  currentTime: 0,
  videoCurrentTime: 0,
  readyState: 4
}

[VideoPlayer:playback] Playing {
  clipId: 'clip-123',
  sourceTime: 0,
  videoCurrentTime: 0,
  needsSeek: false
}
```

**Watch for:**
- `Clip mismatch - not playing` - Loading not complete
- Excessive triggering (infinite loop)
- `readyState` less than 4 when trying to play

---

#### `[VideoPlayer:seeking]` - Seeking When Paused
```
[VideoPlayer:seeking] Effect triggered {
  isPlaying: false,
  hasVideo: true,
  activeClipId: 'clip-123',
  activeClipStateId: 'clip-123',
  currentTime: 5.2,
  videoCurrentTime: 0
}

[VideoPlayer:seeking] Seeking {
  from: 0,
  to: 5.2,
  clipId: 'clip-123'
}
```

---

#### `[VideoPlayer:timeupdate]` & `[VideoPlayer:ended]` - Playback Events
```
[VideoPlayer:timeupdate] Reached clip end {
  clipId: 'clip-123',
  clipEndTime: 10.5,
  timelineTime: 10.5
}

[VideoPlayer:ended] Video ended {
  activeClipId: 'clip-123',
  hasActiveClip: true
}

[VideoPlayer:ended] Checking timeline end {
  clipEndTime: 10.5,
  timelineDuration: 15.5,
  isEnd: false
}
```

---

#### `[VideoPlayer:blankSpace]` - Gap Playback (Animation Frame)
```
[VideoPlayer:blankSpace] Starting animation frame loop

[VideoPlayer:blankSpace] Advancing through blank space {
  deltaTime: 0.016,
  newTime: 5.2,
  timelineDuration: 15.5
}

[VideoPlayer:blankSpace] Stopping animation frame loop
```
**Watch for:** Excessive logging here indicates the animation frame is running constantly (normal when playing through gaps).

---

#### `[VideoPlayer:display]` - Display State
```
[VideoPlayer:display] Display state {
  shouldShowVideo: true,
  shouldShowBlackScreen: false,
  activeVideoIndex: 1,
  hasActiveClip: true,
  hasContent: true,
  hasSrc: false,
  video1HasSrc: true,
  video2HasSrc: false,
  video1ReadyState: 4,
  video2ReadyState: 0,
  video1Visible: true,
  video2Visible: false
}
```

**What to check:**
- `shouldShowVideo: false` when you expect video
- `shouldShowBlackScreen: true` means playhead is in a gap
- Mismatch between `activeVideoIndex` and visible video

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

