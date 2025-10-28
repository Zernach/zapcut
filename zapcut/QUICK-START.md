# ZapCut - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Prerequisites (One-Time Setup)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install FFmpeg (macOS)
brew install ffmpeg

# Verify installations
node --version    # Should be 18+
rustc --version   # Should be 1.75+
ffmpeg -version   # Should show version
```

### 2. Run the App

```bash
# Navigate to project
cd /Users/zernach/code/gauntlet/zapcut

# Run development mode (first time takes 5-10 min to compile)
npm run tauri:dev
```

That's it! The app will launch automatically.

---

## 📖 Usage Flow

### Import Videos
1. Click **Import** button (top right in Media Library)
2. Select video files (MP4, MOV, WebM, AVI)
3. Wait for thumbnails to generate

### Edit Timeline
1. Click on a video in Media Library to select it
2. Click **Add to Timeline** button (top toolbar)
3. Repeat for multiple clips
4. Drag clips to rearrange
5. Click and drag playhead (red line) to scrub

### Preview & Play
1. Click **Play** button (bottom player controls)
2. Use seek bar to navigate
3. Adjust volume with slider

### Export Video
1. Click **Export** button (top toolbar)
2. Choose settings:
   - Resolution: 1080p (recommended)
   - Format: MP4
   - Quality: High
3. Click **Export**
4. Choose save location
5. Wait for export to complete

---

## ⚡ Keyboard Shortcuts (Future)

*Coming in Phase 2*

---

## 🔧 Common Commands

```bash
# Development mode (hot reload)
npm run tauri:dev

# Build production app
npm run tauri:build

# Frontend only (no Tauri)
npm run dev

# Build frontend only
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

---

## 📁 Where Are Things?

```
User Interface:
  ├── Left Panel:   Media Library (import videos)
  ├── Center Top:   Video Player (preview)
  ├── Center Mid:   Player Controls (play/pause)
  └── Center Bot:   Timeline (edit sequence)

Top Toolbar:
  ├── Left:   App title
  └── Right:  Add to Timeline, Export buttons
```

---

## 🐛 Quick Fixes

### App won't start?
```bash
# Restart after installing Rust
source $HOME/.cargo/env
npm run tauri:dev
```

### Import not working?
```bash
# Check FFmpeg
ffmpeg -version

# Reinstall if needed
brew reinstall ffmpeg
```

### Weird errors?
```bash
# Clean and rebuild
rm -rf node_modules dist src-tauri/target
npm install
npm run tauri:dev
```

---

## 📚 Full Documentation

- **Usage Guide**: [README.md](README.md)
- **Installation**: [SETUP.md](SETUP.md)
- **Build Info**: [BUILD-SUMMARY.md](BUILD-SUMMARY.md)
- **Status**: [@docs/MVP-COMPLETION-STATUS.md](@docs/MVP-COMPLETION-STATUS.md)

---

## 💡 Tips

1. **First Import**: Takes a few seconds to generate thumbnails
2. **Timeline Zoom**: Use +/- buttons to zoom timeline
3. **Playhead**: Drag the red line to scrub through video
4. **Multiple Clips**: Add multiple clips, they'll append in sequence
5. **Export Time**: Depends on video length and quality

---

## 🎯 Quick Test

Try this workflow:
1. `npm run tauri:dev`
2. Click Import → select test video
3. Click "Add to Timeline"
4. Click Play to preview
5. Click Export → save as test.mp4
6. Done! ✅

---

## 🆘 Need Help?

- Check [SETUP.md](SETUP.md) for detailed installation
- Review [README.md](README.md) for full usage guide
- Open issue: https://github.com/Zernach/zapcut/issues

---

**Project**: ZapCut Desktop Video Editor  
**Version**: 0.1.0 MVP  
**Website**: https://zapcut.archlife.org  
**Repository**: https://github.com/Zernach/zapcut

