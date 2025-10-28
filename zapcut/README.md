# ZapCut - Desktop Video Editor

A high-performance, native desktop video editor built with Tauri and React.

**Website:** https://zapcut.archlife.org  
**Repository:** https://github.com/Zernach/zapcut

## Features

- ✅ **Video Import**: Drag & drop or file picker for MP4, MOV, WebM, AVI
- ✅ **Media Library**: Preview thumbnails and metadata
- ✅ **Video Player**: Hardware-accelerated playback with controls
- ✅ **Timeline Editor**: Interactive timeline with Konva.js
  - Drag clips onto timeline
  - Rearrange clips
  - Trim clips with handles
  - Multiple tracks
  - Zoom in/out
- ✅ **Player-Timeline Sync**: Real-time synchronization between player and timeline
- ✅ **Export System**: Export to MP4 with FFmpeg

## Prerequisites

### Required Tools

1. **Node.js 18+**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **Rust 1.75+**
   - Install via rustup: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
   - Verify: `rustc --version`

3. **FFmpeg**
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH
   - Verify: `ffmpeg -version`

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/Zernach/zapcut.git
cd zapcut
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run tauri:dev
```

This will:
- Start the Vite dev server on port 1420
- Compile the Rust backend
- Launch the desktop app

### 4. Build Production

```bash
npm run tauri:build
```

The packaged app will be in `src-tauri/target/release/bundle/`.

## Releases

Automated releases are configured via GitHub Actions. To create a new release:

1. Update version numbers in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`
2. Commit and tag: `git tag v0.2.0 && git push origin v0.2.0`
3. GitHub Actions will automatically build for macOS, Windows, and Linux
4. Published builds will be available at https://github.com/Zernach/zapcut/releases

For detailed release instructions, see `@docs/github-releases-guide.md`.

## Usage

### Import Videos

1. Click **Import** button in Media Library
2. Or drag & drop video files into the app

### Edit Timeline

1. Select a video in Media Library
2. Click **Add to Timeline** button
3. Drag clips on timeline to rearrange
4. Click and drag playhead to scrub
5. Use zoom buttons to adjust timeline scale

### Export Video

1. Click **Export** button in toolbar
2. Choose resolution, format, and quality
3. Select output location
4. Click **Export** and wait for completion

## Project Structure

```
zapcut/
├── src/                        # React frontend
│   ├── components/            # UI components
│   │   ├── MediaLibrary/     # Media import and library
│   │   ├── Player/           # Video player and controls
│   │   ├── Timeline/         # Timeline editor with Konva
│   │   └── Export/           # Export dialog
│   ├── store/                # Zustand state management
│   ├── types/                # TypeScript definitions
│   ├── utils/                # Utility functions
│   ├── hooks/                # Custom React hooks
│   └── App.tsx               # Main app component
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── commands/         # Tauri command handlers
│   │   │   ├── media.rs     # Video import/analysis
│   │   │   └── export.rs    # Video export
│   │   └── utils/
│   │       └── ffmpeg.rs    # FFmpeg integration
│   └── Cargo.toml
└── @docs/                    # Documentation
    ├── product-requirements-document.md
    ├── prompt.md
    └── tasks-checklists.md
```

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **State Management**: Zustand
- **Timeline Canvas**: react-konva (Canvas-based for performance)
- **Video Player**: Native HTML5 `<video>` element
- **Backend**: Tauri 2.0 (Rust)
- **Media Processing**: FFmpeg (via Tauri commands)

## Development

### Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build frontend
- `npm run tauri:dev` - Run Tauri in development mode
- `npm run tauri:build` - Build production app
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Code Style

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode enabled

### Testing

1. Import multiple video files
2. Add clips to timeline
3. Rearrange clips by dragging
4. Drag playhead to scrub timeline
5. Play video in player
6. Export timeline to MP4

## Troubleshoments

### FFmpeg Not Found

Make sure FFmpeg is installed and in your PATH:
```bash
which ffmpeg  # macOS/Linux
where ffmpeg  # Windows
```

### Tauri Build Fails

1. Make sure Rust is installed: `rustc --version`
2. Update Rust: `rustup update`
3. Clean build: `cd src-tauri && cargo clean`

### Video Import Fails

- Ensure FFmpeg is installed
- Check video format is supported (MP4, MOV, WebM, AVI)
- Check console for error messages

### App Won't Start

1. Delete `node_modules` and reinstall: `npm install`
2. Clear Tauri cache: `rm -rf src-tauri/target`
3. Rebuild: `npm run tauri:dev`

## Roadmap

### MVP (Current)
- ✅ Video import and library
- ✅ Basic timeline editing
- ✅ Video playback
- ✅ Export to MP4

### Phase 2
- [ ] Screen recording
- [ ] Webcam recording
- [ ] Advanced trimming
- [ ] Split clips
- [ ] Multiple video tracks
- [ ] Audio controls

### Phase 3
- [ ] Text overlays
- [ ] Transitions
- [ ] Filters and effects
- [ ] Keyboard shortcuts
- [ ] Auto-save
- [ ] Undo/redo

## Contributing

Contributions are welcome! Please read the [documentation](@docs/product-requirements-document.md) for details.

## License

MIT License - see LICENSE file for details

## Links

- **Website**: https://zapcut.archlife.org
- **GitHub**: https://github.com/Zernach/zapcut
- **Issues**: https://github.com/Zernach/zapcut/issues
- **Releases**: https://github.com/Zernach/zapcut/releases

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI powered by [React](https://react.dev/)
- Timeline rendering with [Konva.js](https://konvajs.org/)
- Media processing with [FFmpeg](https://ffmpeg.org/)
- Icons by [Lucide](https://lucide.dev/)

