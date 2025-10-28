import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface RecordingSettings {
    microphone?: string;
    microphone_enabled: boolean;
    webcam_enabled: boolean;
    webcam_device?: string;
    screen_area: ScreenArea;
    aspect_ratio: AspectRatio;
    output_path?: string;
}

export interface ScreenArea {
    type: 'full' | 'window' | 'custom';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface AspectRatio {
    type: '16:9' | '4:3' | '1:1' | 'custom';
    width?: number;
    height?: number;
}

export interface RecordingState {
    is_recording: boolean;
    is_paused: boolean;
    current_settings: RecordingSettings;
    output_file?: string;
}

// Transform AspectRatio to Rust enum format
const transformAspectRatio = (ratio: AspectRatio): unknown => {
    switch (ratio.type) {
        case '16:9':
            return 'Ratio16_9';
        case '4:3':
            return 'Ratio4_3';
        case '1:1':
            return 'Ratio1_1';
        case 'custom':
            return { Custom: { width: ratio.width || 1920, height: ratio.height || 1080 } };
        default:
            return 'Ratio16_9';
    }
};

// Transform ScreenArea to Rust enum format
const transformScreenArea = (area: ScreenArea): unknown => {
    switch (area.type) {
        case 'full':
            return 'FullScreen';
        case 'window':
            return 'CurrentWindow';
        case 'custom':
            return {
                Custom: {
                    x: area.x || 0,
                    y: area.y || 0,
                    width: area.width || 1920,
                    height: area.height || 1080,
                },
            };
        default:
            return 'FullScreen';
    }
};

export const useRecording = () => {
    const [recordingState, setRecordingState] = useState<RecordingState>({
        is_recording: false,
        is_paused: false,
        current_settings: {
            microphone: undefined,
            microphone_enabled: false,
            webcam_enabled: false,
            webcam_device: undefined,
            screen_area: { type: 'full' },
            aspect_ratio: { type: '16:9' },
            output_path: undefined,
        },
        output_file: undefined,
    });

    const [availableMicrophones, setAvailableMicrophones] = useState<string[]>([]);
    const [availableWebcams, setAvailableWebcams] = useState<string[]>([]);

    // Get available microphones
    const getMicrophones = useCallback(async () => {
        try {
            const mics = await invoke<string[]>('get_available_microphones');
            setAvailableMicrophones(mics);
            return mics;
        } catch (error) {
            console.error('Failed to get microphones:', error);
            return [];
        }
    }, []);

    // Get available webcams
    const getWebcams = useCallback(async () => {
        try {
            const webcams = await invoke<string[]>('get_available_webcams');
            setAvailableWebcams(webcams);
            return webcams;
        } catch (error) {
            console.error('Failed to get webcams:', error);
            return [];
        }
    }, []);

    // Start recording
    const startRecording = useCallback(async (settings: RecordingSettings) => {
        try {
            // Transform settings to match Rust enum format
            const transformedSettings = {
                ...settings,
                aspect_ratio: transformAspectRatio(settings.aspect_ratio),
                screen_area: transformScreenArea(settings.screen_area),
            };
            const result = await invoke<string>('start_recording', { settings: transformedSettings });
            setRecordingState(prev => ({
                ...prev,
                is_recording: true,
                is_paused: false,
                current_settings: settings,
            }));
            return result;
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }, []);

    // Stop recording
    const stopRecording = useCallback(async () => {
        try {
            const result = await invoke<RecordingState>('stop_recording');
            setRecordingState(result);
            return result;
        } catch (error) {
            console.error('Failed to stop recording:', error);
            throw error;
        }
    }, []);

    // Pause recording
    const pauseRecording = useCallback(async () => {
        try {
            const result = await invoke<RecordingState>('pause_recording');
            setRecordingState(result);
            return result;
        } catch (error) {
            console.error('Failed to pause recording:', error);
            throw error;
        }
    }, []);

    // Resume recording
    const resumeRecording = useCallback(async () => {
        try {
            const result = await invoke<RecordingState>('resume_recording');
            setRecordingState(result);
            return result;
        } catch (error) {
            console.error('Failed to resume recording:', error);
            throw error;
        }
    }, []);

    // Get current recording state
    const getRecordingState = useCallback(async () => {
        try {
            const state = await invoke<RecordingState>('get_recording_state');
            setRecordingState(state);
            return state;
        } catch (error) {
            console.error('Failed to get recording state:', error);
            throw error;
        }
    }, []);

    // Import recording to gallery
    const importToGallery = useCallback(async (filePath: string) => {
        try {
            const result = await invoke<string>('import_recording_to_gallery', { filePath });
            return result;
        } catch (error) {
            console.error('Failed to import to gallery:', error);
            throw error;
        }
    }, []);

    // Export recording to file
    const exportToFile = useCallback(async (sourcePath: string, destinationPath: string) => {
        try {
            const result = await invoke<string>('export_recording_to_file', {
                sourcePath,
                destinationPath
            });
            return result;
        } catch (error) {
            console.error('Failed to export recording:', error);
            throw error;
        }
    }, []);

    // Generate and fetch thumbnail for recording
    const generateRecordingThumbnail = useCallback(async (filePath: string): Promise<string | null> => {
        try {
            // Generate thumbnail using FFmpeg
            const thumbnailPath = await invoke<string>('generate_recording_thumbnail', {
                filePath
            });

            // Convert to base64 for display
            const base64Thumbnail = await invoke<string>('get_thumbnail_base64', {
                thumbnailPath
            });

            return base64Thumbnail;
        } catch (error) {
            console.error('Failed to generate recording thumbnail:', error);
            return null;
        }
    }, []);

    return {
        recordingState,
        availableMicrophones,
        availableWebcams,
        getMicrophones,
        getWebcams,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        getRecordingState,
        importToGallery,
        exportToFile,
        generateRecordingThumbnail,
    };
};
