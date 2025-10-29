export interface ExportConfig {
    outputPath: string;
    resolution: '720p' | '1080p' | '1440p' | '4K' | 'source';
    format: 'mp4' | 'mov' | 'webm';
    codec: 'h264' | 'h265';
    quality: 'low' | 'medium' | 'high';
    fps?: number;
    includeAudio: boolean;
}

export interface ExportProgress {
    percentage: number;
    status: 'idle' | 'preparing' | 'trimming clips' | 'concatenating' | 'finalizing' | 'complete' | 'error';
    error?: string;
}

