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
- Builds for multiple platforms:
  - macOS (Apple Silicon - aarch64)
  - macOS (Intel - x86_64)
  - Windows (x64)
  - Linux (Ubuntu 22.04)
- Creates a GitHub release as a draft
- Uploads built artifacts to the release

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

After a successful release build, the following artifacts are created:

### macOS
- `ZapCut_<version>_aarch64.dmg` - Apple Silicon installer
- `ZapCut_<version>_x64.dmg` - Intel Mac installer
- `.app.tar.gz` files for both architectures

### Windows
- `ZapCut_<version>_x64-setup.exe` - Windows installer
- `ZapCut_<version>_x64_en-US.msi` - MSI installer

### Linux
- `zapcut_<version>_amd64.deb` - Debian package
- `zapcut_<version>_amd64.AppImage` - AppImage (portable)

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

### Release Not Creating
- Verify the tag follows the pattern `v*` (e.g., `v1.0.0`)
- Check that GitHub Actions is enabled in repository settings
- Ensure the workflow file is on the default branch before pushing the tag

## Resources

- [Tauri GitHub Action](https://github.com/tauri-apps/tauri-action)
- [Tauri Building Guide](https://tauri.app/v1/guides/building/)
- [Semantic Versioning](https://semver.org/)

