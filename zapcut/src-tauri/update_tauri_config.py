#!/usr/bin/env python3
"""
Script to update tauri.conf.json with platform-specific FFmpeg binary paths.
This ensures FFmpeg binaries are bundled with the application on each platform.
"""

import json
import sys
import argparse
from pathlib import Path


def update_tauri_config(platform: str, config_path: str = "tauri.conf.json"):
    """
    Update the tauri.conf.json file with platform-specific resource paths.
    
    Args:
        platform: Platform identifier (e.g., 'macos-aarch64', 'windows-x86_64')
        config_path: Path to the tauri.conf.json file
    """
    # Define platform-specific resource paths
    platform_resources = {
        "macos-aarch64": [
            "binaries/macos-aarch64/ffmpeg",
            "binaries/macos-aarch64/ffprobe"
        ],
        "macos-x86_64": [
            "binaries/macos-x86_64/ffmpeg",
            "binaries/macos-x86_64/ffprobe"
        ],
        "linux-x86_64": [
            "binaries/linux-x86_64/ffmpeg",
            "binaries/linux-x86_64/ffprobe"
        ],
        "windows-x86_64": [
            "binaries/windows-x86_64/ffmpeg.exe",
            "binaries/windows-x86_64/ffprobe.exe"
        ]
    }
    
    if platform not in platform_resources:
        print(f"Error: Unknown platform '{platform}'", file=sys.stderr)
        print(f"Valid platforms: {', '.join(platform_resources.keys())}", file=sys.stderr)
        sys.exit(1)
    
    resources = platform_resources[platform]
    
    # Read the current config
    config_file = Path(config_path)
    if not config_file.exists():
        print(f"Error: Config file '{config_path}' not found", file=sys.stderr)
        sys.exit(1)
    
    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # Update the bundle.resources field
    if 'bundle' not in config:
        config['bundle'] = {}
    
    config['bundle']['resources'] = resources
    
    # Write the updated config back
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
        f.write('\n')  # Add trailing newline
    
    print(f"Successfully updated {config_path}")
    print(f"Platform: {platform}")
    print(f"Resources: {resources}")


def main():
    parser = argparse.ArgumentParser(
        description="Update tauri.conf.json with platform-specific FFmpeg paths"
    )
    parser.add_argument(
        '--platform',
        required=True,
        choices=['macos-aarch64', 'macos-x86_64', 'linux-x86_64', 'windows-x86_64'],
        help='Target platform for the build'
    )
    parser.add_argument(
        '--config',
        default='tauri.conf.json',
        help='Path to tauri.conf.json (default: tauri.conf.json)'
    )
    
    args = parser.parse_args()
    update_tauri_config(args.platform, args.config)


if __name__ == '__main__':
    main()

