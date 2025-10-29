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

### Python Syntax Error When Building Multi-Platform Releases

**Error Message:**
```
SyntaxError: invalid syntax
  File "<stdin>", line 6
    resources = $RESOURCES
                ^
```

**Cause:** Shell variables must be properly escaped when passed to Python. The original workflow tried to interpolate `$RESOURCES` directly into Python code, which doesn't work.

**Fix Applied:** The workflow now uses `json.loads('''$RESOURCES''')` to properly parse the JSON array from the shell variable. The triple quotes allow shell variable expansion while treating the result as a raw JSON string for Python to parse.

**How It Works:**
1. Bash sets the `RESOURCES` variable as a JSON string: `'["binaries/macos-aarch64/ffmpeg", "binaries/macos-aarch64/ffprobe"]'`
2. The Python here-document receives this via shell expansion: `json.loads('''...EXPANDED_VALUE...''')`
3. Python's `json.loads()` safely parses the JSON string into a Python list
4. The list is assigned to the tauri config

**Prevention:** Always use `json.loads()` to parse JSON strings in Python when they come from shell variables, rather than trying to use them directly in Python expressions.

## Platform-Specific Build Process

### Build Matrix

The release workflow builds for 4 platform-architecture combinations:

| Platform | Runner | Rust Target | Friendly Name | FFmpeg Source |
|----------|--------|-------------|---------------|---------------|
| macOS (Apple Silicon) | macos-latest | aarch64-apple-darwin | MacBook-AppleSilicon | evermeet.cx |
| macOS (Intel) | macos-latest | x86_64-apple-darwin | MacBook-Intel | evermeet.cx |
| Linux (x86-64) | ubuntu-22.04 | (default) | Linux | johnvansickle.com |
| Windows (x86-64) | windows-latest | (default) | Windows | gyan.dev |

### Per-Platform FFmpeg Configuration

Each build:
1. Downloads the appropriate FFmpeg binaries during the workflow
2. Updates `tauri.conf.json` with **only** the binaries for that platform
3. Builds and bundles the app with those binaries
4. Creates platform-specific installers/packages

This ensures each release only includes the FFmpeg binaries needed for that platform, reducing bundle size.

### Build Logs to Monitor

Watch for these key steps in GitHub Actions:

1. **FFmpeg Download** - Should complete without 404 or connection errors
2. **tauri.conf.json Update** - Should show the resources array being updated
3. **FFmpeg Verification** - Should verify binaries exist before building
4. **Tauri Build** - Builds the Rust backend and bundles the frontend
5. **Asset Renaming** - Renames technical names to user-friendly names

## Debugging Failed Builds

### Check GitHub Actions Logs

1. Go to your repository
2. Click **Actions** tab
3. Find the failed workflow run
4. Click on the specific platform job
5. Expand each step to see logs

### Common Build Failures and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `curl: (22) HTTP 404` (FFmpeg download) | URL changed or moved | Update FFmpeg URLs in workflow |
| `cannot find module` (Node) | Dependencies not installed | Ensure `npm ci` runs before build |
| `undefined reference to` (Rust) | Missing native dependency | Check platform-specific dependency installation |
| `certificate not found` (macOS) | Code signing issue | Disable code signing or set up certificates |
| `python: command not found` | Python 3 not available | Use `python3` explicitly (workflow already does this) |

### Re-running Failed Builds

GitHub Actions allows you to re-run failed jobs:

1. Open the failed workflow run
2. Click **Re-run failed jobs** button
3. The workflow will re-run only the failed platform builds

This is faster than waiting for all platforms to rebuild.

## FFmpeg Verification Commands

### Verify Downloaded FFmpeg

After FFmpeg downloads, these commands verify it works:

```bash
# macOS/Linux
./ffmpeg -version
./ffprobe -version

# Windows
ffmpeg.exe -version
ffprobe.exe -version
```

Expected output starts with:
```
ffmpeg version N-##### ...
```

### Verify FFmpeg in Bundle

After building the app locally, verify FFmpeg is included:

```bash
# macOS
ls -la "ZapCut.app/Contents/Resources/binaries/macos-aarch64/"

# Linux
unzip -l zapcut_*.AppImage | grep ffmpeg

# Windows
dir "ZapCut\Resources\binaries\windows-x86_64\"
```

## Version Management and Release Process

### Semantic Versioning

Follow [semantic versioning](https://semver.org/) for all releases:

- **MAJOR.MINOR.PATCH** (e.g., `1.2.3`)
- **MAJOR**: Breaking changes to user experience or API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, internal improvements

### Pre-Release Versions

For testing before final release, use pre-release tags:

```bash
# Alpha release
git tag v1.0.0-alpha.1

# Beta release  
git tag v1.0.0-beta.1

# Release candidate
git tag v1.0.0-rc.1
```

These are still recognized by the workflow but marked as pre-releases on GitHub.

## Resources

- [Tauri GitHub Action](https://github.com/tauri-apps/tauri-action)
- [Tauri Building Guide](https://tauri.app/v1/guides/building/)
- [Semantic Versioning](https://semver.org/)

