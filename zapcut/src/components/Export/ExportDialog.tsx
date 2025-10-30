import { useState, useEffect } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useTimelineStore } from '../../store/timelineStore';
import { useAppStore } from '../../store/appStore';
import { ExportConfig } from '../../types/export';
import { X, FileVideo, Loader2 } from 'lucide-react';

export function ExportDialog() {
    const showExportDialog = useAppStore((state) => state.showExportDialog);
    const setShowExportDialog = useAppStore((state) => state.setShowExportDialog);
    const clips = useTimelineStore((state) => state.clips);
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<string>('idle');
    const [currentClip, setCurrentClip] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressInterval, setProgressInterval] = useState<number | null>(null);

    const [config, setConfig] = useState<Partial<ExportConfig>>({
        resolution: '1080p',
        format: 'mp4',
        codec: 'h264',
        quality: 'high',
        includeAudio: true,
    });

    // Cleanup interval on unmount or when dialog closes
    useEffect(() => {
        return () => {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
        };
    }, [progressInterval]);

    if (!showExportDialog) return null;

    const handleExport = async () => {
        try {
            setIsExporting(true);
            setError(null);
            setProgress(0);
            setStatus('preparing');

            // Open save dialog
            const outputPath = await save({
                filters: [
                    {
                        name: 'Video',
                        extensions: ['mp4'],
                    },
                ],
                defaultPath: 'output.mp4',
            });

            if (!outputPath) {
                setIsExporting(false);
                return;
            }

            // Prepare clips for export
            const exportClips = clips.map((clip) => ({
                id: clip.id,
                file_path: clip.filePath,
                start_time: clip.startTime,
                trim_start: clip.trimStart,
                trim_end: clip.trimEnd,
                duration: clip.duration,
                speed: clip.speed || 1.0,
            }));

            const exportConfig = {
                output_path: outputPath,
                resolution: config.resolution || '1080p',
                format: config.format || 'mp4',
                codec: config.codec || 'h264',
                quality: config.quality || 'high',
                include_audio: config.includeAudio !== false,
            };

            // Start export
            await invoke('export_timeline', {
                clips: exportClips,
                config: exportConfig,
            });

            // Poll for progress
            const interval = setInterval(async () => {
                const prog = await invoke<{
                    percentage: number;
                    status: string;
                    error?: string;
                    current_clip?: string;
                }>('get_export_progress');

                setProgress(prog.percentage);
                setStatus(prog.status);
                setCurrentClip(prog.current_clip || null);

                if (prog.status === 'complete') {
                    clearInterval(interval);
                    setProgressInterval(null);
                    setIsExporting(false);
                    setShowExportDialog(false);
                    alert('Export completed successfully!');
                } else if (prog.status === 'error') {
                    clearInterval(interval);
                    setProgressInterval(null);
                    setIsExporting(false);
                    setError(prog.error || 'Export failed');
                }
            }, 500);

            setProgressInterval(interval);

            // Cleanup interval after 5 minutes max
            setTimeout(() => {
                clearInterval(interval);
                setProgressInterval(null);
            }, 300000);
        } catch (err) {
            setIsExporting(false);
            setError(err instanceof Error ? err.message : 'Export failed');
        }
    };

    const handleClose = () => {
        if (!isExporting) {
            setShowExportDialog(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-panel rounded-lg shadow-xl w-[500px] max-h-[80vh] overflow-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <FileVideo size={20} />
                        <h2 className="text-lg font-semibold">Export Video</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                        disabled={isExporting}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Resolution */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Resolution</label>
                        <select
                            value={config.resolution}
                            onChange={(e) => setConfig({ ...config, resolution: e.target.value as any })}
                            className="w-full bg-background border border-border rounded px-3 py-2"
                            disabled={isExporting}
                        >
                            <option value="720p">720p (1280x720)</option>
                            <option value="1080p">1080p (1920x1080)</option>
                            <option value="1440p">1440p (2560x1440)</option>
                            <option value="4K">4K (3840x2160)</option>
                            <option value="source">Source Resolution</option>
                        </select>
                    </div>

                    {/* Format */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Format</label>
                        <select
                            value={config.format}
                            onChange={(e) => setConfig({ ...config, format: e.target.value as any })}
                            className="w-full bg-background border border-border rounded px-3 py-2"
                            disabled={isExporting}
                        >
                            <option value="mp4">MP4</option>
                            <option value="mov">MOV</option>
                            <option value="webm">WebM</option>
                        </select>
                    </div>

                    {/* Quality */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Quality</label>
                        <select
                            value={config.quality}
                            onChange={(e) => setConfig({ ...config, quality: e.target.value as any })}
                            className="w-full bg-background border border-border rounded px-3 py-2"
                            disabled={isExporting}
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                    {/* Include Audio */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="include-audio"
                            checked={config.includeAudio}
                            onChange={(e) => setConfig({ ...config, includeAudio: e.target.checked })}
                            className="rounded"
                            disabled={isExporting}
                        />
                        <label htmlFor="include-audio" className="text-sm">
                            Include Audio
                        </label>
                    </div>

                    {/* Progress */}
                    {isExporting && (
                        <div className="space-y-3 p-4 bg-background rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                                <Loader2 className="animate-spin text-blue-500" size={20} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-medium capitalize">
                                            {status === 'validating' && 'Validating clips...'}
                                            {status === 'preparing' && 'Preparing export...'}
                                            {status === 'processing clips' && 'Processing clips...'}
                                            {status === 'concatenating' && 'Combining clips...'}
                                            {status === 'finalizing' && 'Finalizing video...'}
                                            {status === 'validating output' && 'Validating output...'}
                                            {status === 'complete' && 'Complete!'}
                                        </span>
                                        <span className="text-sm font-semibold text-blue-400">
                                            {Math.round(progress)}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-gray-400">
                                {status === 'processing clips' && currentClip ? (
                                    <span>Processing clip {currentClip}</span>
                                ) : (
                                    <span>This may take a few moments depending on video length and quality settings...</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-900/30 border border-red-800 rounded text-sm text-red-300">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 hover:bg-gray-700 rounded transition-colors"
                        disabled={isExporting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded transition-colors"
                        disabled={isExporting || clips.length === 0}
                    >
                        {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                </div>
            </div>
        </div>
    );
}

