#!/bin/bash
set -e

echo "Downloading FFmpeg binaries for all platforms..."
echo ""

# macOS Apple Silicon
echo "Downloading FFmpeg for macOS Apple Silicon..."
cd macos-aarch64
curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o ffmpeg.zip
curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o ffprobe.zip
unzip -o ffmpeg.zip
unzip -o ffprobe.zip
rm ffmpeg.zip ffprobe.zip
chmod +x ffmpeg ffprobe
echo "✓ macOS Apple Silicon complete"
cd ..

# macOS Intel
echo ""
echo "Downloading FFmpeg for macOS Intel..."
cd macos-x86_64
curl -L https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip -o ffmpeg.zip
curl -L https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip -o ffprobe.zip
unzip -o ffmpeg.zip
unzip -o ffprobe.zip
rm ffmpeg.zip ffprobe.zip
chmod +x ffmpeg ffprobe
echo "✓ macOS Intel complete"
cd ..

# Linux
echo ""
echo "Downloading FFmpeg for Linux..."
cd linux-x86_64
wget -q --show-progress https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg .
mv ffmpeg-*-amd64-static/ffprobe .
rm -rf ffmpeg-*-amd64-static*
chmod +x ffmpeg ffprobe
echo "✓ Linux complete"
cd ..

# Windows
echo ""
echo "For Windows, please download manually from:"
echo "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
echo "Extract ffmpeg.exe and ffprobe.exe to windows-x86_64/"
echo ""

echo "FFmpeg downloads complete!"
echo ""
echo "Verifying binaries..."
./macos-aarch64/ffmpeg -version | head -1
./macos-x86_64/ffmpeg -version | head -1
./linux-x86_64/ffmpeg -version | head -1
echo ""
echo "✓ All done!"

