# FFmpeg Binaries

This directory contains FFmpeg binaries that will be bundled with the ZapCut application for each platform.

## Directory Structure

- `macos-aarch64/` - FFmpeg binaries for Apple Silicon Macs (M1, M2, M3, etc.)
- `macos-x86_64/` - FFmpeg binaries for Intel Macs
- `linux-x86_64/` - FFmpeg binaries for Linux (64-bit)
- `windows-x86_64/` - FFmpeg binaries for Windows (64-bit)

## Required Binaries

Each platform directory should contain:
- `ffmpeg` (or `ffmpeg.exe` on Windows) - Main FFmpeg binary for encoding/decoding
- `ffprobe` (or `ffprobe.exe` on Windows) - FFprobe binary for media analysis

## Download Instructions

### macOS (Apple Silicon - aarch64)

```bash
# Download FFmpeg static build for macOS ARM64
cd macos-aarch64
curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o ffmpeg.zip
curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o ffprobe.zip

# Extract
unzip ffmpeg.zip
unzip ffprobe.zip

# Clean up
rm ffmpeg.zip ffprobe.zip

# Make executable
chmod +x ffmpeg ffprobe
```

### macOS (Intel - x86_64)

```bash
# Download FFmpeg static build for macOS x86_64
cd macos-x86_64
curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o ffmpeg.zip
curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o ffprobe.zip

# Extract
unzip ffmpeg.zip
unzip ffprobe.zip

# Clean up
rm ffmpeg.zip ffprobe.zip

# Make executable
chmod +x ffmpeg ffprobe
```

### Linux (x86_64)

```bash
# Download FFmpeg static build for Linux
cd linux-x86_64

# Option 1: Using John Van Sickle's static builds (recommended)
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg .
mv ffmpeg-*-amd64-static/ffprobe .
rm -rf ffmpeg-*-amd64-static*

# Make executable
chmod +x ffmpeg ffprobe
```

### Windows (x86_64)

```bash
# Download FFmpeg static build for Windows
cd windows-x86_64

# Download from gyan.dev (recommended Windows builds)
# Visit: https://www.gyan.dev/ffmpeg/builds/
# Download the "ffmpeg-release-essentials.zip"
# Extract ffmpeg.exe and ffprobe.exe from the bin/ folder into this directory

# Or use PowerShell:
# Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile "ffmpeg.zip"
# Expand-Archive -Path "ffmpeg.zip" -DestinationPath "."
# Move-Item -Path "ffmpeg-*\bin\ffmpeg.exe" -Destination "."
# Move-Item -Path "ffmpeg-*\bin\ffprobe.exe" -Destination "."
# Remove-Item -Recurse -Force "ffmpeg-*", "ffmpeg.zip"
```

## Automated Download Script

For convenience, run the automated download script from the `binaries/` directory:

```bash
./download_ffmpeg.sh
```

## Verification

After downloading, verify the binaries work:

```bash
# macOS/Linux
./macos-aarch64/ffmpeg -version
./macos-x86_64/ffmpeg -version
./linux-x86_64/ffmpeg -version

# Windows (PowerShell)
.\windows-x86_64\ffmpeg.exe -version
```

## File Sizes

Approximate file sizes (may vary by version):
- macOS ffmpeg: ~70-90 MB
- macOS ffprobe: ~70-90 MB
- Linux ffmpeg: ~80-100 MB
- Linux ffprobe: ~80-100 MB
- Windows ffmpeg.exe: ~90-110 MB
- Windows ffprobe.exe: ~90-110 MB

## Important Notes

1. **License**: FFmpeg is licensed under LGPL 2.1+ or GPL 2+. Ensure compliance with these licenses when distributing.
2. **Updates**: Check for FFmpeg updates periodically and refresh these binaries.
3. **Size**: These binaries are large. Consider using git-lfs if committing to version control.
4. **.gitignore**: Add these directories to .gitignore if binaries should not be committed.

## Alternative: Download on CI/CD

Instead of committing binaries, you can download them during the GitHub Actions build process. See the release workflow for an example of downloading FFmpeg during builds.

