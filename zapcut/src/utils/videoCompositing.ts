/**
 * Video Compositing Utility
 * 
 * Provides canvas-based real-time video compositing for picture-in-picture recording.
 * Composites a webcam stream onto a screen recording stream with the webcam appearing
 * in the lower-left corner.
 */

export interface CompositingOptions {
    screenStream: MediaStream;
    webcamStream: MediaStream;
    webcamWidthPercent?: number; // Percentage of screen width (default: 20)
    padding?: number; // Padding from edges in pixels (default: 16)
    borderWidth?: number; // Border width in pixels (default: 2)
    borderColor?: string; // Border color (default: 'white')
    shadowBlur?: number; // Shadow blur in pixels (default: 4)
}

export interface CompositingResult {
    compositedStream: MediaStream;
    canvas: HTMLCanvasElement;
    cleanup: () => void;
}

/**
 * Creates a composited video stream with webcam overlay in the lower-left corner
 */
export function createCompositedStream(options: CompositingOptions): CompositingResult {
    const {
        screenStream,
        webcamStream,
        webcamWidthPercent = 20,
        padding = 16,
        borderWidth = 2,
        borderColor = 'white',
        shadowBlur = 4,
    } = options;

    // Create video elements for both streams
    const screenVideo = document.createElement('video');
    const webcamVideo = document.createElement('video');

    screenVideo.srcObject = screenStream;
    webcamVideo.srcObject = webcamStream;

    // Mute to avoid audio feedback
    screenVideo.muted = true;
    webcamVideo.muted = true;

    // Auto-play to get video frames
    screenVideo.play().catch(err => console.error('Error playing screen video:', err));
    webcamVideo.play().catch(err => console.error('Error playing webcam video:', err));

    // Create canvas for compositing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Failed to get canvas 2D context');
    }

    let animationFrameId: number | null = null;
    let isInitialized = false;

    // Wait for screen video metadata to set canvas dimensions
    screenVideo.onloadedmetadata = () => {
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
        isInitialized = true;
        console.log('[Compositing] Canvas initialized:', canvas.width, 'x', canvas.height);
    };

    // Calculate webcam overlay dimensions and position
    const getWebcamDimensions = () => {
        if (!isInitialized) return null;

        const webcamWidth = (canvas.width * webcamWidthPercent) / 100;

        // Maintain webcam aspect ratio
        const webcamAspectRatio = webcamVideo.videoWidth / webcamVideo.videoHeight || 16 / 9;
        const webcamHeight = webcamWidth / webcamAspectRatio;

        // Position in lower-left corner
        const x = padding;
        const y = canvas.height - webcamHeight - padding;

        return { x, y, width: webcamWidth, height: webcamHeight };
    };

    // Compositing render loop
    const render = () => {
        if (!isInitialized || !ctx) {
            animationFrameId = requestAnimationFrame(render);
            return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw screen recording (full canvas)
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

        // Draw webcam overlay
        const webcamDims = getWebcamDimensions();
        if (webcamDims && webcamVideo.videoWidth > 0) {
            const { x, y, width, height } = webcamDims;

            // Save context for shadow and border
            ctx.save();

            // Add shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = shadowBlur;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            // Draw webcam video
            ctx.drawImage(webcamVideo, x, y, width, height);

            // Reset shadow for border
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Draw border around webcam
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(x, y, width, height);

            ctx.restore();
        }

        // Continue rendering
        animationFrameId = requestAnimationFrame(render);
    };

    // Start rendering loop
    render();

    // Capture stream from canvas (30 fps)
    const compositedStream = canvas.captureStream(30);

    // Add audio tracks from original streams to composited stream
    screenStream.getAudioTracks().forEach(track => {
        compositedStream.addTrack(track);
    });
    webcamStream.getAudioTracks().forEach(track => {
        compositedStream.addTrack(track);
    });

    // Cleanup function
    const cleanup = () => {
        console.log('[Compositing] Cleaning up compositing resources');

        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        screenVideo.pause();
        webcamVideo.pause();
        screenVideo.srcObject = null;
        webcamVideo.srcObject = null;

        // Stop composited stream tracks
        compositedStream.getTracks().forEach(track => track.stop());
    };

    return {
        compositedStream,
        canvas,
        cleanup,
    };
}

/**
 * Helper to check if both screen and webcam streams are available and have video tracks
 */
export function canComposite(screenStream: MediaStream | null, webcamStream: MediaStream | null): boolean {
    return !!(
        screenStream &&
        webcamStream &&
        screenStream.getVideoTracks().length > 0 &&
        webcamStream.getVideoTracks().length > 0
    );
}

