# GitHub Releases Setup Guide

This document explains the GitHub Actions workflows configured for automated builds and releases of ZapCut.

## Overview

The project now has two GitHub Actions workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`) - Runs on PRs and main branch pushes
2. **Release Workflow** (`.github/workflows/release.yml`) - Builds and publishes releases

### macOS Signing Status

✅ **Intelligent Signing Implemented**: The workflow automatically provides the best possible signing based on available credentials:
- With full Apple Developer credentials → Full code signing + notarization
- Without credentials → Ad-hoc signing (users right-click to open)

See the "macOS Code Signing and Notarization" section below for details.

## CI Workflow

**Triggers:** Push to main, Pull Requests to main

**Actions:**
- Runs on macOS, Ubuntu, and Windows
- Installs dependencies
- Runs linting and type checking
- Builds the Tauri app in debug mode (test build)

This ensures all code changes are validated before merging.

## Release Workflow

**Triggers:** 
- Push of version tags (e.g., `v1.0.0`, `v0.1.1`)
- Manual workflow dispatch

**Actions:**
- Downloads FFmpeg binaries for each platform during build
- Builds for multiple platforms:
  - macOS (Apple Silicon - aarch64)
  - macOS (Intel - x86_64)
  - Windows (x64)
  - Linux (Ubuntu 22.04)
- Renames artifacts to user-friendly names (e.g., "MacBook-AppleSilicon" instead of "aarch64")
- Creates a GitHub release as a draft
- Uploads built artifacts with friendly names to the release

**Important:** FFmpeg binaries are automatically downloaded and bundled during the GitHub Actions build. No manual setup required for releases.

## Creating a Release

### Step 1: Update Version Numbers

Update version in both files:

```bash
cd zapcut

# Update package.json
# Change: "version": "0.1.0" to "version": "0.2.0"

# Update src-tauri/tauri.conf.json
# Change: "version": "0.1.0" to "version": "0.2.0"

# Update src-tauri/Cargo.toml
# Change: version = "0.1.0" to version = "0.2.0"
```

### Step 2: Commit and Tag

```bash
# Commit the version bump
git add .
git commit -m "chore: bump version to 0.2.0"

# Create a tag
git tag v0.2.0

# Push commits and tags
git push origin main
git push origin v0.2.0
```

### Step 3: Monitor the Build

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Watch the "Release" workflow run
4. Wait for all platform builds to complete (10-20 minutes)

### Step 4: Publish the Release

1. Go to "Releases" in your GitHub repository
2. Find the draft release created by the workflow
3. Review the release notes and assets
4. Edit release notes if needed
5. Click "Publish release"

## Available Artifacts

After a successful release build, the following artifacts are created with user-friendly names:

### macOS
- `ZapCut_<version>_MacBook-AppleSilicon.dmg` - Apple Silicon (M1/M2/M3) installer
- `ZapCut_<version>_MacBook-Intel.dmg` - Intel Mac installer
- `.app.tar.gz` files for both architectures (with friendly names)

### Windows
- `ZapCut_<version>_Windows-setup.exe` - Windows installer
- `ZapCut_<version>_Windows_en-US.msi` - MSI installer

### Linux
- `zapcut_<version>_Linux.deb` - Debian package
- `zapcut_<version>_Linux.AppImage` - AppImage (portable)

**Note:** All artifacts now use friendly, user-understandable names instead of technical architecture identifiers.

## FFmpeg Bundling

ZapCut requires FFmpeg for video processing. The application is configured to bundle FFmpeg binaries automatically:

### GitHub Actions (Automated)

When building via GitHub Actions (releases), FFmpeg binaries are automatically downloaded during the build process for each platform:
- macOS: Downloaded from evermeet.cx
- Linux: Downloaded from John Van Sickle's static builds
- Windows: Downloaded from gyan.dev

The workflow uses a Python script (`zapcut/src-tauri/update_tauri_config.py`) to safely update the `tauri.conf.json` file with platform-specific FFmpeg binary paths. This ensures each platform build correctly bundles the appropriate binaries.

No manual intervention is required for GitHub releases.

### Local Development

For local development, you need FFmpeg installed on your system:

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html or use Chocolatey:
```bash
choco install ffmpeg
```

### Local Builds (Production)

If you want to build the production app locally with bundled FFmpeg:

1. Navigate to `zapcut/src-tauri/binaries/`
2. Run the download script:
   ```bash
   ./download_ffmpeg.sh
   ```
   (Note: Windows FFmpeg must be downloaded manually - see `binaries/README.md`)

3. Build the app:
   ```bash
   cd zapcut
   npm run tauri build
   ```

The FFmpeg binaries will be automatically included in the app bundle.

## macOS Code Signing and Notarization

### Current Status

The release workflow is configured with **intelligent signing** that automatically adapts based on available credentials:

- **With Apple Developer credentials**: Full signing + notarization (users can double-click to open)
- **Without credentials**: Ad-hoc signing (users must right-click → Open on first launch)

### Why This Matters

macOS Gatekeeper blocks apps downloaded from the internet unless they're signed and notarized by Apple. Without proper signing, users see:
> "ZapCut.app" is damaged and can't be opened.

This is a security feature, not an actual problem with the app.

### Option 1: User Workarounds (Current Builds)

If you download an unsigned or ad-hoc signed build, bypass Gatekeeper using **any** of these methods:

**Method A - Right-Click to Open (Easiest)**
1. Locate `ZapCut.app` in Finder
2. Right-click (or Control+click) the app
3. Select "Open" from the menu
4. Click "Open" in the security dialog
5. App will open and be trusted from then on

**Method B - System Settings**
1. Try to open the app normally (it will be blocked)
2. Go to System Settings → Privacy & Security
3. Scroll down to see "ZapCut was blocked..."
4. Click "Open Anyway"
5. Confirm in the dialog

**Method C - Terminal Command**
```bash
xattr -cr /Applications/ZapCut.app
# Or if the app is elsewhere:
xattr -cr /path/to/ZapCut.app
```

**Important**: These workarounds are **safe** and only needed on first launch. The "damaged" message is misleading — the app works perfectly.

### Option 2: Full Code Signing (Recommended for Production)

To build fully signed and notarized apps that users can double-click to open:

#### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Enroll at https://developer.apple.com/programs/

2. **Developer ID Application Certificate**
   - Open Xcode → Settings → Accounts
   - Select your Apple ID → Manage Certificates
   - Click + → "Developer ID Application"
   - Or create via https://developer.apple.com/account/resources/certificates/

3. **Export Certificate as .p12**
   ```bash
   # In Keychain Access:
   # 1. Find your "Developer ID Application" certificate
   # 2. Right-click → Export "Developer ID Application..."
   # 3. Save as .p12 with a password
   ```

4. **App-Specific Password for Notarization**
   - Visit https://appleid.apple.com
   - Sign in → Security → App-Specific Passwords
   - Click + to generate a new password
   - Save it securely (you'll need it for GitHub Secrets)

5. **Find Your Team ID**
   - Visit https://developer.apple.com/account
   - Click "Membership" in sidebar
   - Copy your 10-character Team ID

#### Add GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | How to Get Value |
|------------|------------------|
| `APPLE_CERTIFICATE` | `base64 -i /path/to/certificate.p12 \| pbcopy` (macOS)<br>Then paste into secret field |
| `APPLE_CERTIFICATE_PASSWORD` | Password you set when exporting the .p12 |
| `APPLE_SIGNING_IDENTITY` | Full name from certificate, e.g.:<br>`Developer ID Application: Your Name (TEAM123456)` |
| `APPLE_ID` | Your Apple ID email address |
| `APPLE_PASSWORD` | The app-specific password you generated |
| `APPLE_TEAM_ID` | Your 10-character Team ID from developer.apple.com |

**Note**: The workflow automatically detects these secrets. If all are present, it performs full signing and notarization. If any are missing, it falls back to ad-hoc signing.

#### How Signing Works

The improved signing process now:

1. **Signs all embedded binaries first** - FFmpeg, ffprobe, and any other executables are signed individually with hardened runtime
2. **Signs all dynamic libraries** - Any .dylib files in the bundle are signed
3. **Signs the main app bundle** - The app is signed with proper entitlements including:
   - Screen capture, camera, and microphone permissions
   - JIT compilation support (for media processing)
   - Unsigned executable memory (required by FFmpeg)
   - Disabled library validation (for bundled binaries)
4. **Verifies the signature** - Ensures everything is properly signed before notarization
5. **Submits for notarization** - Sends to Apple's notary service with detailed logging
6. **Staples the ticket** - Attaches the notarization ticket to the app bundle

This comprehensive approach ensures Apple's notarization service accepts the app.

#### Verify Signing is Working

After adding secrets and triggering a release:

1. Check the GitHub Actions logs for: ✅ App signed and notarized successfully
2. Download the DMG from the release
3. Double-click to open (should work without right-click workaround)
4. Verify signature locally:
   ```bash
   codesign --verify --verbose /Applications/ZapCut.app
   spctl -a -vvv -t install /Applications/ZapCut.app
   ```

### Option 3: Tauri Updater Signing (For Auto-Updates)

If you plan to implement auto-updates in the future:

1. Generate a signing keypair:
```bash
npm run tauri signer generate -- -w ~/.tauri/myapp.key
```

2. Add to GitHub Secrets:
   - `TAURI_SIGNING_PRIVATE_KEY` - The private key content
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - The key password

This is independent of macOS code signing and used for secure update delivery.

### Windows Code Signing (Optional)

For Windows SmartScreen reputation (reduces "Unknown Publisher" warnings):

1. Obtain a code signing certificate from a Certificate Authority
2. Export as .pfx file
3. Add to GitHub Secrets:
   - `WINDOWS_CERTIFICATE` - Base64 encoded .pfx (`certutil -encode cert.pfx cert.txt` on Windows)
   - `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

Note: Windows signing is not yet implemented in the workflow. The workflow would need to be extended similar to macOS signing.

## Manual Release Trigger

You can also trigger a release manually:

1. Go to Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Select the branch
5. Click "Run workflow"

This is useful for testing the release process without creating a tag.

## Version Numbering

Follow semantic versioning (semver):
- **Major** (1.0.0): Breaking changes
- **Minor** (0.2.0): New features, backward compatible
- **Patch** (0.1.1): Bug fixes, backward compatible

## Troubleshooting

### macOS: "App is damaged and can't be opened"

**Symptom**: When opening ZapCut on macOS, you see:
> "ZapCut.app" is damaged and can't be opened. You should move it to the Trash.

**Cause**: The app is not code-signed by an Apple Developer certificate. macOS Gatekeeper blocks it for security.

**Solution**: This is **not** a real problem with the app. Choose any fix below:

1. **Right-click the app** → Select "Open" → Click "Open" in the dialog ✅ (Easiest)
2. **System Settings** → Privacy & Security → Click "Open Anyway"
3. **Terminal**: `xattr -cr /Applications/ZapCut.app`

After using any method once, the app will open normally from then on.

See the "macOS Code Signing and Notarization" section above for details on implementing full code signing to eliminate this message entirely.

### App Crashes on Startup or When Importing Videos

**Cause:** FFmpeg binaries are missing or not properly bundled.

**For Development:**
- Ensure FFmpeg is installed on your system (see "Local Development" section above)
- Test with: `ffmpeg -version` in terminal

**For Production Builds:**
- Verify FFmpeg binaries exist in `zapcut/src-tauri/binaries/<platform>/`
- Check that `tauri.conf.json` includes the binaries in the `bundle.resources` section
- For GitHub releases, verify the FFmpeg download step completed successfully in Actions logs

**For End Users:**
If users report the app crashes when trying to import or process videos, the FFmpeg binaries may not have been bundled correctly. Check the build artifacts and rebuild if necessary.

### Build Fails on Ubuntu
Ensure all webkit2gtk dependencies are installed. The workflow already includes them, but local builds need:
```bash
sudo apt-get install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### Build Fails on macOS
If targeting Apple Silicon from Intel Mac or vice versa, ensure the Rust target is installed:
```bash
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin
```

### Build Fails on Windows
Ensure you have the MSVC build tools installed via Visual Studio.

### FFmpeg Download Fails in GitHub Actions
- Check if the FFmpeg download URLs are still valid
- macOS: https://evermeet.cx/ffmpeg/
- Linux: https://johnvansickle.com/ffmpeg/
- Windows: https://www.gyan.dev/ffmpeg/builds/
- Update URLs in `.github/workflows/release.yml` if they've changed

### Python Syntax Error in Config Update
If you see Python syntax errors related to `$RESOURCES`, this means the workflow is incorrectly trying to use shell variables in Python. The fix is to use the `update_tauri_config.py` script which properly handles JSON modification using Python's `json` module. This script is called with the `--platform` flag to specify which platform's binaries to bundle.

### Release Not Creating
- Verify the tag follows the pattern `v*` (e.g., `v1.0.0`)
- Check that GitHub Actions is enabled in repository settings
- Ensure the workflow file is on the default branch before pushing the tag

## Resources

- [Tauri GitHub Action](https://github.com/tauri-apps/tauri-action)
- [Tauri Building Guide](https://tauri.app/v1/guides/building/)
- [Semantic Versioning](https://semver.org/)

