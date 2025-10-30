<div align="center">

# ⚡ ZapCut

### Lightning-Fast Desktop Video Editor

A modern, high-performance native video editor built with Tauri and React. Edit videos with the power of a desktop app and the elegance of a web interface.



*DEMO VIDEO: Click the image below to watch on YouTube*

<br/>

[![Demo Video](https://img.youtube.com/vi/kTmvyJ9XBmw/maxresdefault.jpg)](https://www.youtube.com/watch?v=kTmvyJ9XBmw)

*DEMO VIDEO: Click the image above to watch on YouTube*

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-Zernach/zapcut-181717?style=for-the-badge&logo=github)](https://github.com/Zernach/zapcut)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

![Version](https://img.shields.io/badge/version-0.1.0-brightgreen)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB?logo=tauri)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Rust](https://img.shields.io/badge/Rust-1.75+-orange?logo=rust)

<br/>

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🎬 **Core Editing**
- **Drag & Drop Import** - MP4, MOV, WebM, AVI support
- **Media Library** - Beautiful thumbnail previews
- **Timeline Editor** - Smooth, canvas-based editing
- **Video Player** - Hardware-accelerated playback
- **Multi-Track Support** - Layer your videos

</td>
<td width="50%">

### ⚙️ **Advanced Features**
- **Real-Time Sync** - Player and timeline in harmony
- **Clip Manipulation** - Drag, trim, rearrange with ease
- **Timeline Zoom** - Fine-tune your edits
- **FFmpeg Export** - Professional-grade output
- **Native Performance** - Built with Rust + Tauri

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

```bash
# Node.js 18+
node --version

# Rust 1.75+
rustc --version

# FFmpeg (for video processing)
ffmpeg -version
```

<details>
<summary><b>📦 Installation Instructions</b></summary>

#### Node.js
Download from [nodejs.org](https://nodejs.org/)

#### Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### FFmpeg
- **macOS**: `brew install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **Linux**: `sudo apt install ffmpeg` or `sudo dnf install ffmpeg`

</details>

### Get Started in 3 Steps

```bash
# 1️⃣ Clone the repository
git clone https://github.com/Zernach/zapcut.git
cd zapcut/zapcut

# 2️⃣ Install dependencies
npm install

# 3️⃣ Launch development mode
npm run tauri:dev
```

**That's it!** 🎉 The app will compile and launch automatically.

---

## 🏗️ Building for Production

```bash
# Build optimized production bundle
npm run tauri:build
```

Your packaged app will be available in:
```
src-tauri/target/release/bundle/
├── dmg/      # macOS installer
├── deb/      # Linux Debian package
├── rpm/      # Linux RPM package
└── msi/      # Windows installer
```

---

## 📖 Usage Guide

### Importing Videos

1. **Click Import** in the Media Library panel
2. **Or drag & drop** video files directly into the app
3. Watch as thumbnails generate automatically

### Editing on the Timeline

1. **Select a clip** from your Media Library
2. **Click "Add to Timeline"** or drag it directly
3. **Rearrange clips** by dragging them
4. **Trim clips** using the edge handles
5. **Scrub through your edit** by dragging the playhead

### Exporting Your Video

1. Click the **Export** button in the top toolbar
2. Choose your **resolution**, **format**, and **quality**
3. Select your **output location**
4. Hit **Export** and let FFmpeg work its magic ✨

---

## 🏛️ Architecture

<table>
<tr>
<td width="50%">

### Frontend Stack
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **react-konva** - Canvas-based timeline rendering
- **Lucide Icons** - Beautiful icon system

</td>
<td width="50%">

### Backend Stack
- **Tauri 2.0** - Secure, lightweight framework
- **Rust** - Systems-level performance
- **FFmpeg** - Industry-standard media processing
- **Native APIs** - File system, dialogs, shell access

</td>
</tr>
</table>

---

## 📂 Project Structure

```
zapcut/
├── 📱 src/                          # React Frontend
│   ├── components/                 # UI Components
│   │   ├── MediaLibrary/          # Import & library management
│   │   ├── Player/                # Video playback
│   │   ├── Timeline/              # Canvas-based editor
│   │   ├── Export/                # Export dialog
│   │   └── ...
│   ├── store/                     # Zustand state stores
│   ├── hooks/                     # Custom React hooks
│   ├── types/                     # TypeScript definitions
│   └── utils/                     # Helper functions
│
├── ⚙️ src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── commands/              # Tauri command handlers
│   │   │   ├── media.rs          # Video import/analysis
│   │   │   └── export.rs         # Video export pipeline
│   │   └── utils/
│   │       └── ffmpeg.rs         # FFmpeg integration
│   └── binaries/                  # Platform-specific FFmpeg
│
└── 📚 @docs/                        # Documentation
    ├── product-requirements-document.md
    ├── github-releases-guide.md
    └── tasks-checklists.md
```

---

## 🛠️ Development

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build frontend for production |
| `npm run tauri:dev` | Launch Tauri in development mode |
| `npm run tauri:build` | Build production desktop app |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

### Code Quality

- ✅ **ESLint** for code quality
- ✅ **Prettier** for consistent formatting
- ✅ **TypeScript strict mode** enabled
- ✅ **Type-safe Tauri commands**

---

## 🚢 Releases

ZapCut uses **GitHub Actions** for automated cross-platform builds.

### Creating a New Release

```bash
# 1. Update version in package.json, Cargo.toml, and tauri.conf.json
# 2. Commit your changes
git add .
git commit -m "chore: bump version to v0.2.0"

# 3. Create and push a tag
git tag v0.2.0
git push origin v0.2.0

# 4. GitHub Actions will automatically build for macOS, Windows, and Linux
# 5. Published builds appear at: https://github.com/Zernach/zapcut/releases
```

📚 See [`@docs/github-releases-guide.md`](@docs/github-releases-guide.md) for detailed instructions.

---

## 🗺️ Roadmap

### ✅ Phase 1: MVP (Current)
- [x] Video import with drag & drop
- [x] Media library with thumbnails
- [x] Interactive timeline editor
- [x] Video playback with controls
- [x] FFmpeg-powered export

### 🚀 Phase 2: Recording & Advanced Editing
- [ ] Screen recording
- [ ] Webcam recording
- [ ] Advanced clip trimming
- [ ] Split clips
- [ ] Multiple video tracks
- [ ] Audio level controls
- [ ] Waveform visualization

### 🎨 Phase 3: Professional Features
- [ ] Text overlays and titles
- [ ] Transitions and animations
- [ ] Filters and effects
- [ ] Keyboard shortcuts
- [ ] Auto-save functionality
- [ ] Undo/redo system
- [ ] Export presets
- [ ] Batch processing

---

## 🐛 Troubleshooting

<details>
<summary><b>FFmpeg Not Found</b></summary>

Make sure FFmpeg is installed and accessible in your PATH:

```bash
# macOS/Linux
which ffmpeg

# Windows
where ffmpeg
```

If not found, reinstall FFmpeg following the prerequisites section.

</details>

<details>
<summary><b>Tauri Build Fails</b></summary>

1. Verify Rust installation: `rustc --version`
2. Update Rust: `rustup update`
3. Clean build cache:
   ```bash
   cd src-tauri
   cargo clean
   cd ..
   npm run tauri:build
   ```

</details>

<details>
<summary><b>Video Import Fails</b></summary>

- Ensure FFmpeg is installed and in PATH
- Check that video format is supported (MP4, MOV, WebM, AVI)
- Check browser console for detailed error messages
- Verify file isn't corrupted by playing it in another player

</details>

<details>
<summary><b>App Won't Start</b></summary>

1. Clear and reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear Tauri cache:
   ```bash
   rm -rf src-tauri/target
   ```

3. Rebuild from scratch:
   ```bash
   npm run tauri:dev
   ```

</details>

---

## 🤝 Contributing

Contributions are welcome! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📖 Documentation improvements
- 🔧 Code contributions

Please check out our [product requirements document](@docs/product-requirements-document.md) and open an issue or pull request.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- 💻 **GitHub**: [github.com/Zernach/zapcut](https://github.com/Zernach/zapcut)
- 🐛 **Issues**: [github.com/Zernach/zapcut/issues](https://github.com/Zernach/zapcut/issues)
- 📦 **Releases**: [github.com/Zernach/zapcut/releases](https://github.com/Zernach/zapcut/releases)

---

## 🙏 Acknowledgments

Built with these amazing open-source projects:

- [**Tauri**](https://tauri.app/) - Build smaller, faster, and more secure desktop applications
- [**React**](https://react.dev/) - The library for web and native user interfaces
- [**Konva.js**](https://konvajs.org/) - 2D canvas library for the modern web
- [**FFmpeg**](https://ffmpeg.org/) - A complete, cross-platform solution to record, convert and stream
- [**Lucide**](https://lucide.dev/) - Beautiful & consistent icon toolkit
- [**Zustand**](https://github.com/pmndrs/zustand) - A small, fast and scalable bearbones state-management solution
- [**Tailwind CSS**](https://tailwindcss.com/) - A utility-first CSS framework

---

<div align="center">

Made with ⚡ by [Zernach](https://github.com/Zernach)

**Star ⭐ this repo if you find it useful!**

</div>
