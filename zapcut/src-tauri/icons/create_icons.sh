#!/bin/bash
# Create minimal valid PNG files (1x1 blue pixel)
base64 -d << 'PNGDATA' > icon.png
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==
PNGDATA

# Copy for all required sizes
cp icon.png 32x32.png
cp icon.png 128x128.png
cp icon.png "128x128@2x.png"

# Create ICO and ICNS (just use PNG as placeholder for now)
cp icon.png icon.ico
cp icon.png icon.icns

echo "Icons created!"
