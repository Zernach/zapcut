# GitHub Releases Setup Guide

This document explains the GitHub Actions workflows configured for automated builds and releases of ZapCut.

## Overview

The project now has two GitHub Actions workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`) - Runs on PRs and main branch pushes
2. **Release Workflow** (`.github/workflows/release.yml`) - Builds and publishes releases

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

## Optional: Code Signing Setup

For production releases, you should set up code signing:

### Tauri Updater Signing

1. Generate a signing keypair:
```bash
npm run tauri signer generate -- -w ~/.tauri/myapp.key
```

2. Add to GitHub Secrets:
   - `TAURI_SIGNING_PRIVATE_KEY` - The private key content
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - The key password

### macOS Code Signing (Optional)

Uncomment the macOS signing environment variables in `.github/workflows/release.yml` and add these secrets:

- `APPLE_CERTIFICATE` - Your Apple Developer certificate (base64 encoded .p12)
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_SIGNING_IDENTITY` - Your signing identity
- `APPLE_ID` - Your Apple ID email
- `APPLE_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Your Apple Team ID

### Windows Code Signing (Optional)

If you have a Windows code signing certificate, add:
- `WINDOWS_CERTIFICATE` - Your certificate (base64 encoded .pfx)
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

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

### Release Not Creating
- Verify the tag follows the pattern `v*` (e.g., `v1.0.0`)
- Check that GitHub Actions is enabled in repository settings
- Ensure the workflow file is on the default branch before pushing the tag

## Resources

- [Tauri GitHub Action](https://github.com/tauri-apps/tauri-action)
- [Tauri Building Guide](https://tauri.app/v1/guides/building/)
- [Semantic Versioning](https://semver.org/)

