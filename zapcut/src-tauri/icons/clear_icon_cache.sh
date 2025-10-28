#!/bin/bash
# Clear macOS icon cache to force reload of app icons

set -e

echo "================================================"
echo "Clearing macOS Icon Cache"
echo "================================================"
echo ""

# Clear system icon cache (requires sudo)
echo "1. Clearing system icon cache (requires password)..."
sudo rm -rf /Library/Caches/com.apple.iconservices.store
echo "   ✓ System cache cleared"
echo ""

# Clear user icon cache
echo "2. Clearing user icon cache..."
rm -rf ~/Library/Caches/com.apple.iconservices.store
echo "   ✓ User cache cleared"
echo ""

# Also clear some other caches that might hold icon data
echo "3. Clearing additional caches..."
rm -rf ~/Library/Caches/com.apple.LaunchServices*
echo "   ✓ LaunchServices cache cleared"
echo ""

# Rebuild LaunchServices database
echo "4. Rebuilding LaunchServices database..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain local -domain system -domain user
echo "   ✓ LaunchServices database rebuilt"
echo ""

# Kill and restart relevant system processes
echo "5. Restarting Finder, Dock, and SystemUIServer..."
killall Finder
killall Dock
killall SystemUIServer 2>/dev/null || true
echo "   ✓ System processes restarted"
echo ""

echo "================================================"
echo "✓ Icon cache cleared successfully!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Delete your old app bundle if it exists"
echo "2. Run: cd ../.. && npm run tauri build"
echo "3. If icons still don't update, restart your Mac"
echo ""

