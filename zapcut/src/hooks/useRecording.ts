import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface RecordingSettings {
    microphone?: string;
    microphone_enabled: boolean;
    webcam_enabled: boolean;
    webcam_device?: string;
    output_path?: string;
}

export interface RecordingState {
    is_recording: boolean;
    current_settings: RecordingSettings;
    output_file?: string;
}

export const useRecording = () => {
    const [recordingState, setRecordingState] = useState<RecordingState>({
        is_recording: false,
        current_settings: {
            microphone: undefined,
            microphone_enabled: false,
            webcam_enabled: false,
            webcam_device: undefined,
            output_path: undefined,
        },
        output_file: undefined,
    });

    const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
    const [availableWebcams, setAvailableWebcams] = useState<MediaDeviceInfo[]>([]);

    // Refs to hold active streams and recorder
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const displayStreamRef = useRef<MediaStream | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // Get available microphones using browser API
    const getMicrophones = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const mics = devices.filter(device => device.kind === 'audioinput');
            setAvailableMicrophones(mics);
            return mics;
        } catch (error) {
            console.error('Failed to get microphones:', error);
            return [];
        }
    }, []);

    // Get available webcams using browser API
    const getWebcams = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
            setAvailableWebcams(cameras);
            return cameras;
        } catch (error) {
            console.error('Failed to get webcams:', error);
            return [];
        }
    }, []);

    // Start recording using browser APIs
    const startRecording = useCallback(async (settings: RecordingSettings) => {
        try {
            console.log('[Recording] Starting browser-based recording with settings:', settings);

            // Reset recorded chunks
            recordedChunksRef.current = [];

            // Get display media (screen capture)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    // @ts-expect-error - mediaSource is valid but not in all type definitions
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                },
                audio: false, // We'll handle audio separately for better control
            });

            displayStreamRef.current = displayStream;
            console.log('[Recording] Display stream acquired');

            // Create a combined stream starting with video from display
            const combinedStream = new MediaStream();
            displayStream.getVideoTracks().forEach(track => {
                combinedStream.addTrack(track);
            });

            // Get microphone audio if enabled
            if (settings.microphone_enabled) {
                try {
                    const audioConstraints: MediaStreamConstraints = {
                        audio: settings.microphone
                            ? { deviceId: { exact: settings.microphone } }
                            : true,
                    };
                    const audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
                    audioStreamRef.current = audioStream;
                    audioStream.getAudioTracks().forEach(track => {
                        combinedStream.addTrack(track);
                    });
                    console.log('[Recording] Microphone stream acquired');
                } catch (audioError) {
                    console.error('[Recording] Failed to get microphone:', audioError);
                    alert('Failed to access microphone. Recording will continue without audio.');
                }
            }

            // Get webcam if enabled (for picture-in-picture)
            if (settings.webcam_enabled) {
                try {
                    const webcamConstraints: MediaStreamConstraints = {
                        video: settings.webcam_device
                            ? { deviceId: { exact: settings.webcam_device } }
                            : { width: { ideal: 1280 }, height: { ideal: 720 } },
                    };
                    const webcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
                    webcamStreamRef.current = webcamStream;
                    // Note: For picture-in-picture, you'd need to composite the webcam
                    // onto the screen capture using Canvas. This is a simplified version.
                    console.log('[Recording] Webcam stream acquired');
                } catch (webcamError) {
                    console.error('[Recording] Failed to get webcam:', webcamError);
                    alert('Failed to access webcam. Recording will continue without camera.');
                }
            }

            // Determine best codec
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/webm';
                }
            }
            console.log('[Recording] Using MIME type:', mimeType);

            // Create MediaRecorder
            const mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType,
                videoBitsPerSecond: 2500000, // 2.5 Mbps
            });

            mediaRecorderRef.current = mediaRecorder;

            // Handle data available
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                    console.log('[Recording] Chunk received:', event.data.size, 'bytes');
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = async () => {
                console.log('[Recording] MediaRecorder stopped, processing', recordedChunksRef.current.length, 'chunks');

                // Create blob from recorded chunks
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                console.log('[Recording] Total recording size:', blob.size, 'bytes');

                // Convert blob to array buffer and then to byte array
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const byteArray = Array.from(uint8Array);

                console.log('[Recording] Sending', byteArray.length, 'bytes to backend for processing');

                try {
                    // Send to backend for processing
                    const outputFile = await invoke<string>('process_recording', { data: byteArray });
                    console.log('[Recording] Recording processed successfully:', outputFile);

                    // Update state with output file
                    setRecordingState(prev => ({
                        ...prev,
                        is_recording: false,
                        output_file: outputFile,
                    }));
                } catch (error) {
                    console.error('[Recording] Failed to process recording:', error);
                    alert(`Failed to process recording: ${error}`);
                }

                // Clean up streams
                stopAllStreams();
            };

            // Handle errors
            mediaRecorder.onerror = (event) => {
                console.error('[Recording] MediaRecorder error:', event);
                alert('Recording error occurred');
                stopAllStreams();
            };

            // Start recording (collect data every second)
            mediaRecorder.start(1000);
            console.log('[Recording] MediaRecorder started');

            // Update local state
            setRecordingState({
                is_recording: true,
                current_settings: settings,
                output_file: undefined,
            });

            // Update backend state
            await invoke('update_recording_state', {
                isRecording: true,
                settings,
            });

            // Handle stream ended (user stopped sharing via browser UI)
            displayStream.getVideoTracks()[0].onended = () => {
                console.log('[Recording] Display track ended (user stopped sharing)');
                stopRecording();
            };

            return 'Recording started';
        } catch (error) {
            console.error('Failed to start recording:', error);
            stopAllStreams();
            throw error;
        }
    }, []);

    // Helper function to stop all streams
    const stopAllStreams = useCallback(() => {
        if (displayStreamRef.current) {
            displayStreamRef.current.getTracks().forEach(track => track.stop());
            displayStreamRef.current = null;
        }
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        if (webcamStreamRef.current) {
            webcamStreamRef.current.getTracks().forEach(track => track.stop());
            webcamStreamRef.current = null;
        }
    }, []);

    // Stop recording
    const stopRecording = useCallback(async () => {
        try {
            console.log('[Recording] Stopping recording...');

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                console.log('[Recording] MediaRecorder stop requested');
            }

            // Note: actual state update happens in mediaRecorder.onstop handler
            // after processing is complete
        } catch (error) {
            console.error('Failed to stop recording:', error);
            stopAllStreams();
            throw error;
        }
    }, [stopAllStreams]);

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
        getRecordingState,
        importToGallery,
        exportToFile,
        generateRecordingThumbnail,
    };
};
