#!/bin/bash
# Create app icons from zapcut-app-icon.jpg using ImageMagick
set -e

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed. Please install it using:"
    echo "  brew install imagemagick"
    exit 1
fi

SOURCE_IMAGE="../../src/images/zapcut-app-icon.jpg"

# Check if source image exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image not found at $SOURCE_IMAGE"
    exit 1
fi

echo "Creating icon files from $SOURCE_IMAGE..."

# Create PNG icons at different sizes (using PNG32 for proper RGBA format required by Tauri)
magick "$SOURCE_IMAGE" -depth 8 -background none -resize 32x32 -gravity center -extent 32x32 PNG32:32x32.png
magick "$SOURCE_IMAGE" -depth 8 -background none -resize 128x128 -gravity center -extent 128x128 PNG32:128x128.png
magick "$SOURCE_IMAGE" -depth 8 -background none -resize 256x256 -gravity center -extent 256x256 PNG32:128x128@2x.png

# Create ICO file (multi-resolution Windows icon)
magick "$SOURCE_IMAGE" -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico

# Create ICNS file (macOS icon) using magick
magick "$SOURCE_IMAGE" icon.icns

# Clean up any temporary files
rm -f icon.png
rm -rf ZapCut.iconset

echo "✓ 32x32.png created"
echo "✓ 128x128.png created"
echo "✓ 128x128@2x.png created"
echo "✓ icon.ico created"
echo "✓ icon.icns created"
echo ""
echo "Icon files created successfully!"
