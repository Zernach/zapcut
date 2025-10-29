import React, { useState, useEffect, useRef } from 'react';
import { useRecording, RecordingSettings } from '../../hooks/useRecording';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useMediaImport } from '../../hooks/useMediaImport';

interface RecordingControlsProps {
    className?: string;
}

// Reusable Video Preview Component
const VideoPreview: React.FC<{ filePath: string }> = ({ filePath }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const activeUrlRef = useRef<string | null>(null);

    useEffect(() => {
    }, [filePath]);

    useEffect(() => {
        const loadVideo = async () => {
            try {
                const trimmedPath = filePath.trim();

                // Retry logic: try up to 5 times with increasing delays to ensure file is ready
                let lastError: unknown = '';
                for (let attempt = 0; attempt < 5; attempt++) {
                    try {
                        const delay = 200 + (attempt * 300); // 200ms, 500ms, 800ms, 1100ms, 1400ms
                        await new Promise(resolve => setTimeout(resolve, delay));

                        // Read file as binary via backend command
                        const data = await invoke<number[]>('read_binary_file', { path: trimmedPath });

                        // Convert array to Uint8Array
                        const uint8Array = new Uint8Array(data);
                        // Create a blob URL from the binary data
                        const blob = new Blob([uint8Array], { type: 'video/mp4' });
                        const url = URL.createObjectURL(blob);

                        // Revoke the old URL only after we've successfully created the new one
                        if (activeUrlRef.current && activeUrlRef.current !== url) {
                            URL.revokeObjectURL(activeUrlRef.current);
                        }

                        activeUrlRef.current = url;
                        setVideoUrl(url);
                        setError(null);
                        return; // Success, exit
                    } catch (error) {
                        lastError = error;
                        if (attempt === 4) {
                            throw lastError; // Throw on final attempt
                        }
                    }
                }
            } catch (error) {
                const errorMessage = `Failed to load video: ${error}`;
                setError(errorMessage);
                setVideoUrl(null);
            }
        };

        if (filePath) {
            setVideoUrl(null); // Reset URL when path changes
            setError(null);
            loadVideo();
        }

        // Cleanup: revoke blob URL when component unmounts
        return () => {
            if (activeUrlRef.current) {
                URL.revokeObjectURL(activeUrlRef.current);
                activeUrlRef.current = null;
            }
        };
    }, [filePath]);

    const handlePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play().catch((err) => {
                    setError(`Failed to play video: ${err.message}`);
                });
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        const errorCode = video.error?.code;
        const errorMessages: { [key: number]: string } = {
            1: 'MEDIA_ERR_ABORTED - Video loading was aborted',
            2: 'MEDIA_ERR_NETWORK - Network error occurred',
            3: 'MEDIA_ERR_DECODE - Video decoding failed',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Video format not supported or URL invalid',
        };
        const message = errorMessages[errorCode || 0] || `Video loading error: ${errorCode}`;
        setError(message);
    };

    const formatTime = (seconds: number): string => {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700 mb-3">
                {error ? (
                    <div className="text-red-400 text-center p-4">
                        <p className="font-semibold mb-2">Error Loading Video</p>
                        <p className="text-sm break-words">{error}</p>
                    </div>
                ) : videoUrl ? (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="max-w-full max-h-full object-contain"
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                        onError={handleVideoError}
                    />
                ) : (
                    <div className="text-gray-400">
                        <p className="text-sm">Loading video...</p>
                    </div>
                )}
            </div>

            {/* Video Controls */}
            {videoUrl && !error && (
                <div className="space-y-2">
                    {/* Play/Pause and Time Display */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePlayPause}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                        >
                            {isPlaying ? '⏸ Pause' : '▶ Play'}
                        </button>
                        <span className="text-xs text-gray-400">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Seek Bar */}
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-gray-700 rounded cursor-pointer accent-blue-600"
                    />
                </div>
            )}
        </div>
    );
};

export const RecordingControls: React.FC<RecordingControlsProps> = ({ className = '' }) => {
    const {
        recordingState,
        availableMicrophones,
        availableWebcams,
        getMicrophones,
        getWebcams,
        startRecording,
        stopRecording,
        importToGallery,
        exportToFile,
        getCompositedCanvas,
        getWebcamStream,
        getDisplayStream,
    } = useRecording();

    const { importFromPaths } = useMediaImport();

    const [settings, setSettings] = useState<RecordingSettings>({
        screen_recording_enabled: true,
        microphone: undefined,
        microphone_enabled: false,
        webcam_enabled: false,
        webcam_device: undefined,
        output_path: undefined,
    });

    const [livePreviewCanvas, setLivePreviewCanvas] = useState<HTMLCanvasElement | null>(null);
    const [livePreviewStream, setLivePreviewStream] = useState<MediaStream | null>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);

    // Load devices on component mount
    useEffect(() => {
        loadDevices();
    }, []);

    // Update live preview when recording state changes
    useEffect(() => {
        if (recordingState.is_recording) {
            // Priority 1: Check for composited canvas (screen + webcam)
            const canvas = getCompositedCanvas();
            if (canvas) {
                setLivePreviewCanvas(canvas);
                setLivePreviewStream(null);
                return;
            }

            // Priority 2: Check for webcam stream (webcam-only or screen-only)
            const webcamStream = getWebcamStream();
            const displayStream = getDisplayStream();

            // Use webcam if available and no screen, or use screen if available
            if (webcamStream && !displayStream) {
                setLivePreviewStream(webcamStream);
                setLivePreviewCanvas(null);
            } else if (displayStream) {
                setLivePreviewStream(displayStream);
                setLivePreviewCanvas(null);
            } else {
                setLivePreviewCanvas(null);
                setLivePreviewStream(null);
            }
        } else {
            // Clear live preview when recording stops
            setLivePreviewCanvas(null);
            setLivePreviewStream(null);
        }
    }, [recordingState.is_recording, getCompositedCanvas, getWebcamStream, getDisplayStream]);

    // Render canvas or stream to video element for preview
    useEffect(() => {
        if (!previewVideoRef.current) return;

        // Handle canvas preview (composited PiP)
        if (livePreviewCanvas) {
            const stream = livePreviewCanvas.captureStream(30);
            previewVideoRef.current.srcObject = stream;
            previewVideoRef.current.play().catch(err =>
                console.error('Error playing canvas preview:', err)
            );
        }
        // Handle direct stream preview (webcam-only or screen-only)
        else if (livePreviewStream) {
            previewVideoRef.current.srcObject = livePreviewStream;
            previewVideoRef.current.play().catch(err =>
                console.error('Error playing stream preview:', err)
            );
        }

        return () => {
            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = null;
            }
        };
    }, [livePreviewCanvas, livePreviewStream]);

    const loadDevices = async () => {
        await Promise.all([
            getMicrophones(),
            getWebcams(),
        ]);
    };

    const handleStartRecording = async () => {
        try {
            await startRecording(settings);
        } catch (error) {
            alert(`Failed to start recording: ${error}`);
        }
    };

    const handleStopRecording = async () => {
        try {
            await stopRecording();
            // State will update automatically via the hook after processing
        } catch (error) {
            alert(`Failed to stop recording: ${error}`);
        }
    };

    const handleImportToGallery = async () => {
        if (recordingState.output_file) {
            try {
                // First, copy the file to the gallery directory via backend
                const result = await importToGallery(recordingState.output_file);

                // Then, add it to the media store so it appears in the edit screen
                await importFromPaths([recordingState.output_file]);

                alert('Recording imported to gallery successfully!');
            } catch (error) {
                alert('Failed to import recording to gallery');
            }
        }
    };

    const handleExportToFile = async () => {
        if (recordingState.output_file) {
            try {
                // Generate default filename from the recording file
                const defaultFilename = recordingState.output_file
                    .split('/')
                    .pop()
                    ?.split('\\')
                    .pop() || 'recording.mp4';

                // Open file save dialog
                const destination = await save({
                    filters: [
                        {
                            name: 'Video',
                            extensions: ['mp4'],
                        },
                    ],
                    defaultPath: defaultFilename,
                });

                if (destination) {
                    await exportToFile(recordingState.output_file, destination);
                    alert('Recording exported successfully!');
                }
            } catch (error) {
                alert('Failed to export recording');
            }
        }
    };

    return (
        <div className={`recording-controls ${className}`}>
            {/* Info Banner */}
            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-blue-400">Full Screen Recording</h3>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                    When you start recording, your browser will show a permission dialog.
                    <strong className="text-blue-300"> Please select "Entire Screen"</strong> to record your full display.
                </p>
                <p className="text-xs text-gray-400">
                    Browser security requires this one-time selection for your privacy protection.
                </p>
            </div>

            <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                {/* Recording Status */}
                <div className="flex items-center gap-2">
                    <div
                        className={`w-3 h-3 rounded-full ${recordingState.is_recording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
                            }`}
                    />
                    <span className="text-sm font-medium text-gray-100">
                        {recordingState.is_recording ? 'Recording' : 'Not Recording'}
                    </span>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2">
                    {!recordingState.is_recording ? (
                        <button
                            onClick={handleStartRecording}
                            disabled={!settings.screen_recording_enabled && !settings.microphone_enabled && !settings.webcam_enabled}
                            className={`px-4 py-2 text-white rounded transition-colors ${!settings.screen_recording_enabled && !settings.microphone_enabled && !settings.webcam_enabled
                                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                                : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            Start Recording
                        </button>
                    ) : (
                        <button
                            onClick={handleStopRecording}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                            Stop
                        </button>
                    )}
                </div>

                {/* Import/Export Buttons */}
                {recordingState.output_file && !recordingState.is_recording && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleImportToGallery}
                            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                            Import to Gallery
                        </button>
                        <button
                            onClick={handleExportToFile}
                            className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        >
                            Export to File
                        </button>
                    </div>
                )}
            </div>

            {/* Settings and Preview Row */}
            <div className="mt-4 flex gap-4">
                {/* Settings Panel - 50% Width */}
                <div className="w-1/2 p-4 bg-gray-800 border rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-100">Recording Settings</h3>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Screen Recording Settings */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-100">Screen Recording</label>
                            <div className="space-y-2">
                                <label className="flex items-center text-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={settings.screen_recording_enabled}
                                        onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                            ...prev,
                                            screen_recording_enabled: e.target.checked
                                        }))}
                                        disabled={recordingState.is_recording}
                                        className="mr-2"
                                    />
                                    Enable Screen Recording
                                </label>
                            </div>
                        </div>

                        {/* Microphone Settings */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-100">Microphone</label>
                            <div className="space-y-2">
                                <label className="flex items-center text-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={settings.microphone_enabled}
                                        onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                            ...prev,
                                            microphone_enabled: e.target.checked
                                        }))}
                                        disabled={recordingState.is_recording}
                                        className="mr-2"
                                    />
                                    Enable Microphone
                                </label>
                                {settings.microphone_enabled && availableMicrophones.length > 0 && (
                                    <select
                                        value={settings.microphone || ''}
                                        onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                            ...prev,
                                            microphone: e.target.value || undefined
                                        }))}
                                        disabled={recordingState.is_recording}
                                        className="w-full p-2 border rounded bg-gray-700 text-gray-100"
                                    >
                                        <option value="">Default Microphone</option>
                                        {availableMicrophones.map((mic) => (
                                            <option key={mic.deviceId} value={mic.deviceId}>
                                                {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Webcam Settings */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-100">Webcam</label>
                            <div className="space-y-2">
                                <label className="flex items-center text-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={settings.webcam_enabled}
                                        onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                            ...prev,
                                            webcam_enabled: e.target.checked
                                        }))}
                                        disabled={recordingState.is_recording}
                                        className="mr-2"
                                    />
                                    Enable Webcam
                                </label>
                                {settings.webcam_enabled && availableWebcams.length > 0 && (
                                    <select
                                        value={settings.webcam_device || ''}
                                        onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                            ...prev,
                                            webcam_device: e.target.value || undefined
                                        }))}
                                        disabled={recordingState.is_recording}
                                        className="w-full p-2 border rounded bg-gray-700 text-gray-100"
                                    >
                                        <option value="">Default Camera</option>
                                        {availableWebcams.map((webcam) => (
                                            <option key={webcam.deviceId} value={webcam.deviceId}>
                                                {webcam.label || `Camera ${webcam.deviceId.slice(0, 8)}`}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Info Text */}
                        <div className="mt-2 p-3 bg-gray-700/50 rounded text-xs text-gray-400">
                            <p className="mb-1">
                                <strong>Picture-in-Picture:</strong> When both screen and webcam are enabled, webcam appears in the lower-left corner of the recording.
                            </p>
                            <p>
                                The browser will ask for permissions when you start recording.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preview Section - 50% Width */}
                <div className="w-1/2 p-4 bg-gray-800 border rounded-lg shadow-sm">
                    {recordingState.output_file && !recordingState.is_recording ? (
                        <div className="flex flex-col h-full">
                            <h3 className="text-lg font-semibold mb-4 text-gray-100">Recording Preview</h3>
                            <VideoPreview
                                filePath={recordingState.output_file}
                            />
                        </div>
                    ) : recordingState.is_recording && (livePreviewCanvas || livePreviewStream) ? (
                        <div className="flex flex-col h-full">
                            <h3 className="text-lg font-semibold mb-4 text-gray-100">
                                {livePreviewCanvas ? 'Live Preview (Picture-in-Picture)' : 'Live Preview'}
                            </h3>
                            <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700">
                                <video
                                    ref={previewVideoRef}
                                    className="max-w-full max-h-full object-contain"
                                    muted
                                    autoPlay
                                    playsInline
                                />
                            </div>
                            <div className="mt-2 text-xs text-gray-400 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span>
                                        {livePreviewCanvas
                                            ? 'Recording with webcam overlay in lower-left'
                                            : livePreviewStream && getWebcamStream() && !getDisplayStream()
                                                ? 'Recording webcam'
                                                : 'Recording in progress'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full items-center justify-center">
                            <div className="text-gray-500 text-center">
                                <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm">
                                    {recordingState.is_recording
                                        ? 'Recording in progress...'
                                        : 'Start recording to see preview here'
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
