import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { createCompositedStream, canComposite, CompositingResult } from '../utils/videoCompositing';

export interface RecordingSettings {
    screen_recording_enabled: boolean;
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
            screen_recording_enabled: true,
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
    const compositingRef = useRef<CompositingResult | null>(null);

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
            // Reset recorded chunks
            recordedChunksRef.current = [];

            // Create a combined stream
            const combinedStream = new MediaStream();

            // Get display media (screen capture) if enabled
            if (settings.screen_recording_enabled) {
                // Note: Browser security requires user interaction and will show a picker dialog
                // We configure it to prefer full screen recording
                const displayConstraints: DisplayMediaStreamOptions = {
                    video: {
                        displaySurface: 'monitor', // Request full screen/monitor instead of window or tab
                        width: { ideal: 1920, max: 3840 },
                        height: { ideal: 1080, max: 2160 },
                        frameRate: { ideal: 30, max: 60 },
                    } as MediaTrackConstraints,
                    audio: false, // We'll handle audio separately for better control
                };

                // Add additional hints for browser (not all browsers support these)
                Object.assign(displayConstraints, {
                    preferCurrentTab: false, // Don't prefer current tab, prefer screen
                    surfaceSwitching: 'exclude', // Don't allow switching during recording
                    selfBrowserSurface: 'exclude', // Don't show ZapCut in the selection
                });

                const displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);

                displayStreamRef.current = displayStream;

                // Add video tracks from display to combined stream
                displayStream.getVideoTracks().forEach(track => {
                    combinedStream.addTrack(track);
                });

                // Handle stream ended (user stopped sharing via browser UI)
                displayStream.getVideoTracks()[0].onended = () => {
                    stopRecording();
                };
            }

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
                } catch (audioError) {
                    console.error('[Recording] Failed to get microphone:', audioError);
                    alert('Failed to access microphone. Recording will continue without audio.');
                }
            }

            // Get webcam if enabled (for picture-in-picture or standalone)
            if (settings.webcam_enabled) {
                try {
                    const webcamConstraints: MediaStreamConstraints = {
                        video: settings.webcam_device
                            ? { deviceId: { exact: settings.webcam_device } }
                            : { width: { ideal: 1280 }, height: { ideal: 720 } },
                    };
                    const webcamStream = await navigator.mediaDevices.getUserMedia(webcamConstraints);
                    webcamStreamRef.current = webcamStream;

                    // If screen recording is NOT enabled, add webcam directly to combined stream
                    if (!settings.screen_recording_enabled) {
                        webcamStream.getVideoTracks().forEach(track => {
                            combinedStream.addTrack(track);
                        });
                    }
                } catch (webcamError) {
                    console.error('[Recording] Failed to get webcam:', webcamError);
                    alert('Failed to access webcam. Recording will continue without camera.');
                }
            }

            // Check if we need to composite screen + webcam
            let streamToRecord = combinedStream;
            if (canComposite(displayStreamRef.current, webcamStreamRef.current)) {
                try {
                    const compositing = createCompositedStream({
                        screenStream: displayStreamRef.current!,
                        webcamStream: webcamStreamRef.current!,
                    });
                    compositingRef.current = compositing;

                    // Create a new MediaStream with video from canvas and audio from mic
                    const compositedVideoStream = new MediaStream();

                    // Add video track from composited canvas
                    compositing.compositedStream.getVideoTracks().forEach(track => {
                        compositedVideoStream.addTrack(track);
                    });

                    // Add audio track from microphone (if enabled)
                    if (audioStreamRef.current) {
                        audioStreamRef.current.getAudioTracks().forEach(track => {
                            compositedVideoStream.addTrack(track);
                        });
                    }

                    streamToRecord = compositedVideoStream;

                } catch (compositingError) {
                    console.error('[Recording] Failed to create composited stream:', compositingError);
                    alert('Failed to create picture-in-picture. Recording will continue with screen only.');
                }
            }

            // If compositing, wait a moment for the canvas to start rendering frames
            if (compositingRef.current) {
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
            }

            // Determine best codec
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm;codecs=vp8';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/webm';
                }
            }

            // Verify stream has active tracks before recording
            const videoTracks = streamToRecord.getVideoTracks();
            const audioTracks = streamToRecord.getAudioTracks();

            if (videoTracks.length === 0 && audioTracks.length === 0) {
                throw new Error(
                    'No active tracks in stream to record. Make sure to grant permissions when prompted. ' +
                    `Settings: Screen=${settings.screen_recording_enabled}, Webcam=${settings.webcam_enabled}, Mic=${settings.microphone_enabled}`
                );
            }

            // Create MediaRecorder with the appropriate stream
            const mediaRecorder = new MediaRecorder(streamToRecord, {
                mimeType,
                videoBitsPerSecond: 2500000, // 2.5 Mbps
            });

            mediaRecorderRef.current = mediaRecorder;

            // Handle data available
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            // Handle recording stop
            mediaRecorder.onstop = async () => {
                // Create blob from recorded chunks
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });

                // Convert blob to array buffer and then to byte array
                const arrayBuffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const byteArray = Array.from(uint8Array);

                try {
                    // Send to backend for processing
                    const outputFile = await invoke<string>('process_recording', { data: byteArray });

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

            return 'Recording started';
        } catch (error) {
            console.error('Failed to start recording:', error);
            stopAllStreams();
            throw error;
        }
    }, []);

    // Helper function to stop all streams
    const stopAllStreams = useCallback(() => {
        // Clean up compositing resources first
        if (compositingRef.current) {
            compositingRef.current.cleanup();
            compositingRef.current = null;
        }

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
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
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

    // Get the composited canvas for live preview
    const getCompositedCanvas = useCallback(() => {
        return compositingRef.current?.canvas || null;
    }, []);

    // Get the active webcam stream for live preview
    const getWebcamStream = useCallback(() => {
        return webcamStreamRef.current;
    }, []);

    // Get the active display stream for live preview
    const getDisplayStream = useCallback(() => {
        return displayStreamRef.current;
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
        getCompositedCanvas,
        getWebcamStream,
        getDisplayStream,
    };
};
