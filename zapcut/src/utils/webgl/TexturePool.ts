/**
 * Texture Pool for WebGL Video Rendering
 * 
 * Manages a pool of WebGL textures for video elements, recycling
 * textures to avoid GPU memory exhaustion and improve performance.
 */

export interface TextureEntry {
    texture: WebGLTexture;
    videoElement: HTMLVideoElement;
    clipId: string;
    lastUsed: number;
}

export class TexturePool {
    private gl: WebGLRenderingContext;
    private textures: Map<string, TextureEntry> = new Map();
    private maxTextures: number;

    constructor(gl: WebGLRenderingContext, maxTextures: number = 16) {
        this.gl = gl;
        this.maxTextures = maxTextures;
    }

    /**
     * Get or create a texture for a clip
     */
    getTexture(clipId: string, videoSrc: string): TextureEntry | null {
        // Check if we already have this texture
        const existing = this.textures.get(clipId);
        if (existing) {
            existing.lastUsed = Date.now();
            return existing;
        }

        // Need to create a new texture
        // First, check if we need to evict old textures
        if (this.textures.size >= this.maxTextures) {
            this.evictOldest();
        }

        // Create video element
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';
        video.muted = true;

        // Create texture
        const texture = this.gl.createTexture();
        if (!texture) {
            console.error('[TexturePool] Failed to create texture');
            return null;
        }

        // Set up texture
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        // Create entry
        const entry: TextureEntry = {
            texture,
            videoElement: video,
            clipId,
            lastUsed: Date.now()
        };

        this.textures.set(clipId, entry);

        // Load video (async)
        video.src = videoSrc;
        video.load();

        return entry;
    }

    /**
     * Update texture with current video frame
     */
    updateTexture(entry: TextureEntry): void {
        const video = entry.videoElement;

        // Only update if video has data
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, entry.texture);
            this.gl.texImage2D(
                this.gl.TEXTURE_2D,
                0,
                this.gl.RGBA,
                this.gl.RGBA,
                this.gl.UNSIGNED_BYTE,
                video
            );
        }
    }

    /**
     * Check if a texture's video is ready to play
     */
    isReady(clipId: string): boolean {
        const entry = this.textures.get(clipId);
        if (!entry) return false;

        return entry.videoElement.readyState >= entry.videoElement.HAVE_CURRENT_DATA;
    }

    /**
     * Evict the least recently used texture
     */
    private evictOldest(): void {
        let oldestTime = Infinity;
        let oldestKey: string | null = null;

        for (const [key, entry] of this.textures.entries()) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.remove(oldestKey);
        }
    }

    /**
     * Remove a texture from the pool
     */
    remove(clipId: string): void {
        const entry = this.textures.get(clipId);
        if (entry) {
            // Clean up video element
            entry.videoElement.pause();
            entry.videoElement.src = '';
            entry.videoElement.load();

            // Delete texture
            this.gl.deleteTexture(entry.texture);

            this.textures.delete(clipId);
        }
    }

    /**
     * Clear all textures
     */
    clear(): void {
        for (const [clipId] of this.textures) {
            this.remove(clipId);
        }
    }

    /**
     * Get current pool size
     */
    getSize(): number {
        return this.textures.size;
    }

    /**
     * Preload a video for a clip
     */
    async preload(clipId: string, videoSrc: string): Promise<void> {
        const entry = this.getTexture(clipId, videoSrc);
        if (!entry) return;

        return new Promise((resolve, reject) => {
            const video = entry.videoElement;

            const handleLoaded = () => {
                video.removeEventListener('loadeddata', handleLoaded);
                video.removeEventListener('error', handleError);
                resolve();
            };

            const handleError = (e: Event) => {
                video.removeEventListener('loadeddata', handleLoaded);
                video.removeEventListener('error', handleError);
                reject(new Error('Failed to load video'));
            };

            if (video.readyState >= video.HAVE_CURRENT_DATA) {
                resolve();
            } else {
                video.addEventListener('loadeddata', handleLoaded);
                video.addEventListener('error', handleError);
            }
        });
    }
}

