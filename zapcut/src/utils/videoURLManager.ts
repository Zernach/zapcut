/**
 * Video URL Manager
 * 
 * Strict lifecycle management for video URLs with aggressive eviction.
 * Prevents memory leaks by limiting active URLs to a small number.
 */

interface URLEntry {
    url: string;
    clipId: string;
    createdAt: number;
}

export class VideoURLManager {
    private urls: Map<string, URLEntry> = new Map();
    private maxUrls: number;

    constructor(maxUrls: number = 3) {
        this.maxUrls = maxUrls;
    }

    /**
     * Get or create a video URL for a clip
     * Uses custom stream:// protocol for zero-memory streaming
     */
    getUrl(clipId: string, filePath: string): string {
        // Check if we already have this URL
        const existing = this.urls.get(clipId);
        if (existing) {
            return existing.url;
        }

        // Evict oldest if at limit
        if (this.urls.size >= this.maxUrls) {
            this.evictOldest();
        }

        // Create streaming URL (no memory loading!)
        const url = `stream://localhost/${encodeURIComponent(filePath)}`;

        this.urls.set(clipId, {
            url,
            clipId,
            createdAt: Date.now()
        });

        return url;
    }

    /**
     * Evict the oldest URL
     */
    private evictOldest(): void {
        let oldestTime = Infinity;
        let oldestId: string | null = null;

        for (const [id, entry] of this.urls.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestId = id;
            }
        }

        if (oldestId) {
            this.revokeUrl(oldestId);
        }
    }

    /**
     * Remove a URL from tracking
     * Note: stream:// URLs don't need revoking, but we clean up tracking
     */
    revokeUrl(clipId: string): void {
        this.urls.delete(clipId);
    }

    /**
     * Clear all URLs
     */
    clear(): void {
        this.urls.clear();
    }

    /**
     * Get current size
     */
    getSize(): number {
        return this.urls.size;
    }

    /**
     * Get max size
     */
    getMaxSize(): number {
        return this.maxUrls;
    }
}

// Singleton instance
let urlManagerInstance: VideoURLManager | null = null;

export function getVideoURLManager(): VideoURLManager {
    if (!urlManagerInstance) {
        urlManagerInstance = new VideoURLManager(3); // Max 3 URLs
    }
    return urlManagerInstance;
}

