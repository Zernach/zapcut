import React, { useState } from 'react';
import { useRecording, RecordingSettings } from '../../hooks/useRecording';

interface RecordingControlsProps {
    className?: string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({ className = '' }) => {
    const {
        recordingState,
        availableMicrophones,
        availableWebcams,
        getMicrophones,
        getWebcams,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        importToGallery,
        exportToFile,
    } = useRecording();

    const [settings, setSettings] = useState<RecordingSettings>({
        microphone: undefined,
        webcam_enabled: false,
        webcam_device: undefined,
        screen_area: { type: 'full' },
        aspect_ratio: { type: '16:9' },
        output_path: undefined,
    });

    const [showSettings, setShowSettings] = useState(false);

    const loadDevices = async () => {
        await Promise.all([getMicrophones(), getWebcams()]);
    };

    const handleStartRecording = async () => {
        try {
            await startRecording(settings);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const handleStopRecording = async () => {
        try {
            await stopRecording();
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    };

    const handlePauseRecording = async () => {
        try {
            if (recordingState.is_paused) {
                await resumeRecording();
            } else {
                await pauseRecording();
            }
        } catch (error) {
            console.error('Failed to pause/resume recording:', error);
        }
    };

    const handleImportToGallery = async () => {
        if (recordingState.output_file) {
            try {
                await importToGallery(recordingState.output_file);
                alert('Recording imported to gallery successfully!');
            } catch (error) {
                console.error('Failed to import to gallery:', error);
                alert('Failed to import recording to gallery');
            }
        }
    };

    const handleExportToFile = async () => {
        if (recordingState.output_file) {
            try {
                const destination = prompt('Enter destination path:');
                if (destination) {
                    await exportToFile(recordingState.output_file, destination);
                    alert('Recording exported successfully!');
                }
            } catch (error) {
                console.error('Failed to export recording:', error);
                alert('Failed to export recording');
            }
        }
    };

    return (
        <div className={`recording-controls ${className}`}>
            <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                {/* Recording Status */}
                <div className="flex items-center gap-2">
                    <div
                        className={`w-3 h-3 rounded-full ${recordingState.is_recording
                            ? (recordingState.is_paused ? 'bg-yellow-500' : 'bg-red-500')
                            : 'bg-gray-600'
                            }`}
                    />
                    <span className="text-sm font-medium text-gray-100">
                        {recordingState.is_recording
                            ? (recordingState.is_paused ? 'Paused' : 'Recording')
                            : 'Not Recording'
                        }
                    </span>
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2">
                    {!recordingState.is_recording ? (
                        <button
                            onClick={handleStartRecording}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                            Start Recording
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handlePauseRecording}
                                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                            >
                                {recordingState.is_paused ? 'Resume' : 'Pause'}
                            </button>
                            <button
                                onClick={handleStopRecording}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                            >
                                Stop
                            </button>
                        </>
                    )}
                </div>

                {/* Settings Toggle */}
                <button
                    onClick={() => {
                        setShowSettings(!showSettings);
                        if (!showSettings) {
                            loadDevices();
                        }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                    Settings
                </button>

                {/* Import/Export Buttons */}
                {recordingState.output_file && (
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

            {/* Settings Panel */}
            {showSettings && (
                <div className="mt-4 p-4 bg-gray-800 border rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-100">Recording Settings</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Microphone Settings */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-100">Microphone</label>
                            <select
                                value={settings.microphone || ''}
                                onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                    ...prev,
                                    microphone: e.target.value || undefined
                                }))}
                                className="w-full p-2 border rounded bg-gray-700 text-gray-100"
                            >
                                <option value="">Default Microphone</option>
                                {availableMicrophones.map((mic: string) => (
                                    <option key={mic} value={mic}>{mic}</option>
                                ))}
                            </select>
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
                                        className="mr-2"
                                    />
                                    Enable Webcam
                                </label>
                                {settings.webcam_enabled && (
                                    <select
                                        value={settings.webcam_device || ''}
                                        onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                            ...prev,
                                            webcam_device: e.target.value || undefined
                                        }))}
                                        className="w-full p-2 border rounded bg-gray-700 text-gray-100"
                                    >
                                        <option value="">Default Camera</option>
                                        {availableWebcams.map((webcam: string) => (
                                            <option key={webcam} value={webcam}>{webcam}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Screen Area Settings */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-100">Screen Area</label>
                            <select
                                value={settings.screen_area.type}
                                onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                    ...prev,
                                    screen_area: { type: e.target.value as any }
                                }))}
                                className="w-full p-2 border rounded bg-gray-700 text-gray-100"
                            >
                                <option value="full">Full Screen</option>
                                <option value="window">Current Window</option>
                                <option value="custom">Custom Area</option>
                            </select>
                        </div>

                        {/* Aspect Ratio Settings */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-100">Aspect Ratio</label>
                            <select
                                value={settings.aspect_ratio.type}
                                onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                    ...prev,
                                    aspect_ratio: { type: e.target.value as any }
                                }))}
                                className="w-full p-2 border rounded bg-gray-700 text-gray-100"
                            >
                                <option value="16:9">16:9</option>
                                <option value="4:3">4:3</option>
                                <option value="1:1">1:1 (Square)</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    {/* Output Path */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium mb-2 text-gray-100">Output Path (Optional)</label>
                        <input
                            type="text"
                            value={settings.output_path || ''}
                            onChange={(e) => setSettings((prev: RecordingSettings) => ({
                                ...prev,
                                output_path: e.target.value || undefined
                            }))}
                            placeholder="Leave empty for default location"
                            className="w-full p-2 border rounded bg-gray-700 text-gray-100"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
