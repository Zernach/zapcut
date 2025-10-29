/**
 * WebGL Video Compositor
 * 
 * GPU-accelerated video rendering engine for seamless multi-clip playback.
 * Uses WebGL textures and shaders for zero-latency clip transitions.
 */

import { Clip } from '../../types/media';
import { initializeProgram } from './shaders';
import { TexturePool } from './TexturePool';

export interface CompositorOptions {
    canvas: HTMLCanvasElement;
    width?: number;
    height?: number;
    maxPreloadClips?: number;
}

export class VideoCompositor {
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private program: WebGLProgram;
    private texturePool: TexturePool;

    // Buffers
    private positionBuffer: WebGLBuffer | null = null;
    private texCoordBuffer: WebGLBuffer | null = null;

    // Attribute and uniform locations
    private positionLocation: number = -1;
    private texCoordLocation: number = -1;
    private textureLocation: WebGLUniformLocation | null = null;
    private opacityLocation: WebGLUniformLocation | null = null;

    // Rendering state
    private animationFrameId: number | null = null;
    private isRendering: boolean = false;

    // Current playback state
    private currentClip: Clip | null = null;
    private currentVideoEntry: any = null;
    private preloadedClips: Set<string> = new Set();

    constructor(options: CompositorOptions) {
        this.canvas = options.canvas;

        // Set canvas size
        if (options.width && options.height) {
            this.canvas.width = options.width;
            this.canvas.height = options.height;
        }

        // Initialize WebGL context
        const gl = this.canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance'
        });

        if (!gl) {
            throw new Error('WebGL not supported');
        }

        this.gl = gl;

        // Initialize shader program
        this.program = initializeProgram(gl);

        // Initialize texture pool
        this.texturePool = new TexturePool(gl, options.maxPreloadClips || 16);

        // Set up buffers and attributes
        this.setupBuffers();
        this.setupAttributes();

        console.log('[VideoCompositor] Initialized');
    }

    /**
     * Set up vertex and texture coordinate buffers
     */
    private setupBuffers(): void {
        const gl = this.gl;

        // Position buffer (full canvas quad)
        const positions = new Float32Array([
            -1.0, -1.0,  // bottom-left
            1.0, -1.0,  // bottom-right
            -1.0, 1.0,  // top-left
            1.0, 1.0,  // top-right
        ]);

        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Texture coordinate buffer
        const texCoords = new Float32Array([
            0.0, 1.0,  // bottom-left
            1.0, 1.0,  // bottom-right
            0.0, 0.0,  // top-left
            1.0, 0.0,  // top-right
        ]);

        this.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
    }

    /**
     * Set up shader attributes and uniforms
     */
    private setupAttributes(): void {
        const gl = this.gl;

        gl.useProgram(this.program);

        // Get attribute locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');

        // Get uniform locations
        this.textureLocation = gl.getUniformLocation(this.program, 'u_texture');
        this.opacityLocation = gl.getUniformLocation(this.program, 'u_opacity');
    }

    /**
     * Load a clip for rendering (ALWAYS uses proxy if available for best performance!)
     */
    async loadClip(clip: Clip): Promise<void> {
        // Prefer proxy for better performance
        const videoPath = clip.proxyPath || clip.filePath;

        try {
            await this.texturePool.preload(clip.id, videoPath);
            this.preloadedClips.add(clip.id);
        } catch (error) {
            console.error('[VideoCompositor] Failed to load clip:', clip.name, error);
        }
    }

    /**
     * Set the current clip to render (uses proxy for best performance!)
     */
    setCurrentClip(clip: Clip | null, sourceTime: number = 0): void {
        console.log('[VideoCompositor:setCurrentClip]', {
            clipId: clip?.id,
            clipName: clip?.name,
            sourceTime,
            hasProxy: !!clip?.proxyPath
        });

        if (!clip) {
            console.log('[VideoCompositor:setCurrentClip] Clearing current clip');
            this.currentClip = null;
            this.currentVideoEntry = null;
            return;
        }

        this.currentClip = clip;
        // Prefer proxy path for better performance
        const videoPath = clip.proxyPath || clip.filePath;

        // Get texture entry
        this.currentVideoEntry = this.texturePool.getTexture(clip.id, videoPath);

        console.log('[VideoCompositor:setCurrentClip] Got texture entry', {
            hasEntry: !!this.currentVideoEntry,
            videoReadyState: this.currentVideoEntry?.videoElement.readyState
        });

        if (this.currentVideoEntry) {
            const video = this.currentVideoEntry.videoElement;

            // Seek to correct time
            if (Math.abs(video.currentTime - sourceTime) > 0.1) {
                console.log('[VideoCompositor:setCurrentClip] Seeking', {
                    from: video.currentTime,
                    to: sourceTime
                });
                video.currentTime = sourceTime;
            }
        }
    }

    /**
     * Play the current clip
     */
    play(): void {
        console.log('[VideoCompositor:play] Starting playback', {
            hasVideoEntry: !!this.currentVideoEntry,
            isRendering: this.isRendering
        });

        if (this.currentVideoEntry) {
            const video = this.currentVideoEntry.videoElement;
            console.log('[VideoCompositor:play] Playing video', {
                readyState: video.readyState,
                currentTime: video.currentTime
            });
            video.play().catch((err: unknown) => {
                console.error('[VideoCompositor:play] Play failed:', err);
            });
        } else {
            console.warn('[VideoCompositor:play] No video entry to play');
        }

        if (!this.isRendering) {
            this.startRendering();
        }
    }

    /**
     * Pause the current clip
     */
    pause(): void {
        if (this.currentVideoEntry) {
            this.currentVideoEntry.videoElement.pause();
        }
    }

    /**
     * Seek to a specific time in the current clip
     */
    seek(time: number): void {
        if (this.currentVideoEntry) {
            this.currentVideoEntry.videoElement.currentTime = time;
        }
    }

    /**
     * Get current playback time
     */
    getCurrentTime(): number {
        if (this.currentVideoEntry) {
            return this.currentVideoEntry.videoElement.currentTime;
        }
        return 0;
    }

    /**
     * Check if current clip is ready
     */
    isReady(): boolean {
        if (!this.currentClip) return false;
        return this.texturePool.isReady(this.currentClip.id);
    }

    /**
     * Start rendering loop
     */
    private startRendering(): void {
        if (this.isRendering) return;

        this.isRendering = true;
        this.renderLoop();
        console.log('[VideoCompositor] Started rendering');
    }

    /**
     * Stop rendering loop
     */
    stopRendering(): void {
        this.isRendering = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        console.log('[VideoCompositor] Stopped rendering');
    }

    /**
     * Main rendering loop
     */
    private renderLoop = (): void => {
        if (!this.isRendering) return;

        this.render();
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
    }

    /**
     * Render current frame
     */
    private render(): void {
        const gl = this.gl;

        // Clear canvas
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // If no current clip or not ready, render black
        if (!this.currentClip || !this.currentVideoEntry) {
            // Only log this occasionally to avoid spam
            if (Math.random() < 0.01) {
                console.log('[VideoCompositor:render] No clip or entry - rendering black', {
                    hasClip: !!this.currentClip,
                    hasEntry: !!this.currentVideoEntry
                });
            }
            return;
        }

        // Update texture with current video frame
        this.texturePool.updateTexture(this.currentVideoEntry);

        // Use shader program
        gl.useProgram(this.program);

        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Bind texture coordinate buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.currentVideoEntry.texture);
        gl.uniform1i(this.textureLocation, 0);

        // Set opacity
        gl.uniform1f(this.opacityLocation, 1.0);

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Preload multiple clips ahead
     */
    async preloadClips(clips: Clip[]): Promise<void> {
        const loadPromises = clips.map(clip => this.loadClip(clip));
        await Promise.allSettled(loadPromises);
    }

    /**
     * Clear a specific clip from memory
     */
    unloadClip(clipId: string): void {
        this.texturePool.remove(clipId);
        this.preloadedClips.delete(clipId);
    }

    /**
     * Resize canvas
     */
    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        console.log('[VideoCompositor] Destroying');

        this.stopRendering();
        this.texturePool.clear();

        const gl = this.gl;

        if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
        if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
        if (this.program) gl.deleteProgram(this.program);
    }

    /**
     * Get pool statistics
     */
    getStats(): { loadedClips: number; maxClips: number } {
        return {
            loadedClips: this.texturePool.getSize(),
            maxClips: 16
        };
    }
}

