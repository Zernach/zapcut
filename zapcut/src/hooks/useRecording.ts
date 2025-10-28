import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface RecordingSettings {
    microphone?: string;
    microphone_enabled: boolean;
    webcam_enabled: boolean;
    webcam_device?: string;
    screen_device?: string;
    output_path?: string;
}


export interface RecordingState {
    is_recording: boolean;
    is_paused: boolean;
    current_settings: RecordingSettings;
    output_file?: string;
}


export const useRecording = () => {
    const [recordingState, setRecordingState] = useState<RecordingState>({
        is_recording: false,
        is_paused: false,
        current_settings: {
            microphone: undefined,
            microphone_enabled: false,
            webcam_enabled: false,
            webcam_device: undefined,
            output_path: undefined,
        },
        output_file: undefined,
    });

    const [availableMicrophones, setAvailableMicrophones] = useState<string[]>([]);
    const [availableWebcams, setAvailableWebcams] = useState<string[]>([]);
    const [availableScreens, setAvailableScreens] = useState<string[]>([]);

    // Check screen recording permission
    const checkScreenRecordingPermission = useCallback(async (): Promise<boolean> => {
        try {
            const hasPermission = await invoke<boolean>('check_screen_recording_permission');
            return hasPermission;
        } catch (error) {
            console.error('Failed to check screen recording permission:', error);
            return false;
        }
    }, []);

    // Test screen recording access with FFmpeg
    const testScreenRecordingAccess = useCallback(async (): Promise<string> => {
        try {
            const result = await invoke<string>('test_screen_recording_access');
            console.log('[Test] Screen recording test result:', result);
            return result;
        } catch (error) {
            console.error('[Test] Failed to test screen recording access:', error);
            return `Test failed: ${error}`;
        }
    }, []);

    // Test the exact recording command
    const testRecordingCommand = useCallback(async (settings: RecordingSettings): Promise<string> => {
        try {
            const result = await invoke<string>('test_recording_command', { settings });
            console.log('[Test] Recording command test result:', result);
            return result;
        } catch (error) {
            console.error('[Test] Failed to test recording command:', error);
            return `Test failed: ${error}`;
        }
    }, []);

    // Get available screens
    const getScreens = useCallback(async () => {
        try {
            const screens = await invoke<string[]>('get_available_screens');
            setAvailableScreens(screens);
            return screens;
        } catch (error) {
            console.error('Failed to get screens:', error);
            return [];
        }
    }, []);

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
            const result = await invoke<string>('start_recording', { settings });
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
        availableScreens,
        availableMicrophones,
        availableWebcams,
        checkScreenRecordingPermission,
        testScreenRecordingAccess,
        testRecordingCommand,
        getScreens,
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
