# ZapCut Setup Guide

## Prerequisites Installation

### 1. Install Node.js (Required)

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

**Windows:**
- Download installer from https://nodejs.org/
- Run installer and follow prompts

**Verify:**
```bash
node --version  # Should show v18 or higher
npm --version   # Should show v9 or higher
```

### 2. Install Rust (Required)

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Windows:**
- Download rustup-init.exe from https://rustup.rs/
- Run installer and follow prompts

**After Installation:**
```bash
# Add to current shell
source $HOME/.cargo/env

# Verify
rustc --version  # Should show 1.75 or higher
cargo --version
```

### 3. Install FFmpeg (Required)

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to PATH:
   - Open System Properties → Environment Variables
   - Edit PATH variable
   - Add new entry: `C:\ffmpeg\bin`
   - Restart terminal

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verify:**
```bash
ffmpeg -version
ffprobe -version
```

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/Zernach/zapcut.git
cd zapcut
```

### 2. Install Dependencies

```bash
npm install
```

This will install all frontend dependencies.

### 3. Test Frontend Build

```bash
npm run build
```

Should complete without errors.

### 4. Run Development

```bash
npm run tauri:dev
```

First run will:
- Download Rust dependencies (may take 5-10 minutes)
- Compile Rust backend
- Start Vite dev server
- Launch desktop app

## Troubleshooting

### "cargo: command not found"

**Solution:**
```bash
# Add Cargo to PATH (run in current terminal)
source $HOME/.cargo/env

# Permanently add to shell profile
echo 'source $HOME/.cargo/env' >> ~/.bashrc  # or ~/.zshrc
```

### "ffmpeg: command not found"

**Solution:**
- Install FFmpeg (see Prerequisites above)
- Verify it's in PATH: `which ffmpeg` (macOS/Linux) or `where ffmpeg` (Windows)

### npm Cache Errors

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Or fix permissions (macOS)
sudo chown -R $(whoami) ~/.npm
```

### Tauri Build Fails

**Solution:**
```bash
# Update Rust
rustup update

# Clean Rust build
cd src-tauri
cargo clean
cd ..

# Rebuild
npm run tauri:dev
```

### Port 1420 Already in Use

**Solution:**
```bash
# Kill process using port 1420
# macOS/Linux:
lsof -ti:1420 | xargs kill -9

# Windows:
netstat -ano | findstr :1420
taskkill /PID <PID> /F
```

## Build for Production

### Development Build

```bash
npm run tauri:dev
```

### Production Build

```bash
npm run tauri:build
```

Output locations:
- **macOS**: `src-tauri/target/release/bundle/dmg/`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `appimage/`

## System Requirements

### Minimum
- OS: macOS 10.15+, Windows 10+, Linux (recent distro)
- RAM: 4GB
- Disk: 2GB free space
- CPU: Dual-core processor

### Recommended
- RAM: 8GB+
- Disk: 5GB+ free space (for video editing)
- CPU: Quad-core processor
- GPU: Dedicated graphics card

## Next Steps

1. Verify all prerequisites are installed
2. Run `npm install`
3. Run `npm run tauri:dev`
4. Test video import and editing
5. See [README.md](README.md) for usage instructions

## Getting Help

- Check [README.md](README.md) for usage
- Review [product-requirements-document.md](@docs/product-requirements-document.md) for architecture
- Open issue: https://github.com/Zernach/zapcut/issues

