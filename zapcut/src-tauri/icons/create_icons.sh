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

# Create ICNS file (macOS icon) using iconset approach
if command -v iconutil &> /dev/null; then
    # Use iconutil on macOS for proper ICNS creation
    rm -rf ZapCut.iconset
    mkdir -p ZapCut.iconset
    
    magick "$SOURCE_IMAGE" -background none -resize 16x16 -gravity center -extent 16x16 PNG32:ZapCut.iconset/icon_16x16.png
    magick "$SOURCE_IMAGE" -background none -resize 32x32 -gravity center -extent 32x32 PNG32:ZapCut.iconset/icon_16x16@2x.png
    magick "$SOURCE_IMAGE" -background none -resize 32x32 -gravity center -extent 32x32 PNG32:ZapCut.iconset/icon_32x32.png
    magick "$SOURCE_IMAGE" -background none -resize 64x64 -gravity center -extent 64x64 PNG32:ZapCut.iconset/icon_32x32@2x.png
    magick "$SOURCE_IMAGE" -background none -resize 128x128 -gravity center -extent 128x128 PNG32:ZapCut.iconset/icon_128x128.png
    magick "$SOURCE_IMAGE" -background none -resize 256x256 -gravity center -extent 256x256 PNG32:ZapCut.iconset/icon_128x128@2x.png
    magick "$SOURCE_IMAGE" -background none -resize 256x256 -gravity center -extent 256x256 PNG32:ZapCut.iconset/icon_256x256.png
    magick "$SOURCE_IMAGE" -background none -resize 512x512 -gravity center -extent 512x512 PNG32:ZapCut.iconset/icon_256x256@2x.png
    magick "$SOURCE_IMAGE" -background none -resize 512x512 -gravity center -extent 512x512 PNG32:ZapCut.iconset/icon_512x512.png
    magick "$SOURCE_IMAGE" -background none -resize 1024x1024 -gravity center -extent 1024x1024 PNG32:ZapCut.iconset/icon_512x512@2x.png
    
    iconutil -c icns ZapCut.iconset
else
    # Fallback: Use ImageMagick directly (creates less optimal ICNS)
    magick "$SOURCE_IMAGE" -background none -define icon:auto-resize=1024,512,256,128,64,32,16 icon.icns
fi

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
