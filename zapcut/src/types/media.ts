export interface ClipMetadata {
    codec: string;
    bitrate: number;
    audioCodec?: string;
    fileSize: number;
    createdAt: Date;
}

export interface Clip {
    id: string;
    name: string;
    filePath: string;
    proxyPath?: string; // path to lightweight 720p proxy for preview
    duration: number; // seconds (current playable duration on timeline)
    originalDuration: number; // original media duration (for trim constraints)
    startTime: number; // position on timeline
    trimStart: number; // trim in point (seconds from start)
    trimEnd: number; // trim out point (seconds from end)
    trackIndex: number; // which track
    width: number;
    height: number;
    fps: number;
    thumbnailPath?: string;
    metadata: ClipMetadata;
    speed: number; // playback speed multiplier (default: 1.0, range: 0.25 - 4.0)
}

export interface MediaItem {
    id: string;
    name: string;
    filePath: string;
    proxyPath?: string; // path to lightweight 720p proxy for preview
    duration: number;
    width: number;
    height: number;
    fps: number;
    thumbnailPath?: string;
    fileSize: number;
    codec: string;
    importedAt: string;
}

export interface ImportProgress {
    fileIndex: number;
    totalFiles: number;
    currentFileName: string;
    status: 'analyzing' | 'generating-thumbnail' | 'complete' | 'error';
    error?: string;
}

