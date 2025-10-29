/**
 * Cache Manager
 * 
 * Unified cache management system for blob URLs and IndexedDB persistence.
 * Prevents memory leaks by limiting active blob URLs and managing resources.
 */

interface BlobEntry {
    url: string;
    clipId: string;
    createdAt: number;
    size: number;
}

export class CacheManager {
    private blobUrls: Map<string, BlobEntry> = new Map();
    private maxBlobUrls: number;
    private dbName: string = 'zapcut-cache';
    private dbVersion: number = 1;
    private db: IDBDatabase | null = null;

    constructor(maxBlobUrls: number = 20) {
        this.maxBlobUrls = maxBlobUrls;
        this.initIndexedDB();
    }

    /**
     * Initialize IndexedDB for persistent caching
     */
    private async initIndexedDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('[CacheManager] IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[CacheManager] IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object store for proxy videos
                if (!db.objectStoreNames.contains('proxies')) {
                    const store = db.createObjectStore('proxies', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('[CacheManager] IndexedDB schema created');
            };
        });
    }

    /**
     * Create a blob URL and track it
     */
    createBlobUrl(clipId: string, blob: Blob): string {
        // Check if we need to evict old blob URLs
        if (this.blobUrls.size >= this.maxBlobUrls) {
            this.evictOldestBlob();
        }

        const url = URL.createObjectURL(blob);

        this.blobUrls.set(clipId, {
            url,
            clipId,
            createdAt: Date.now(),
            size: blob.size
        });

        console.log(`[CacheManager] Created blob URL for ${clipId} (${this.blobUrls.size}/${this.maxBlobUrls})`);

        return url;
    }

    /**
     * Get a blob URL if it exists
     */
    getBlobUrl(clipId: string): string | null {
        const entry = this.blobUrls.get(clipId);
        return entry ? entry.url : null;
    }

    /**
     * Revoke a specific blob URL
     */
    revokeBlobUrl(clipId: string): void {
        const entry = this.blobUrls.get(clipId);
        if (entry) {
            URL.revokeObjectURL(entry.url);
            this.blobUrls.delete(clipId);
            console.log(`[CacheManager] Revoked blob URL for ${clipId}`);
        }
    }

    /**
     * Evict the oldest blob URL
     */
    private evictOldestBlob(): void {
        let oldestTime = Infinity;
        let oldestId: string | null = null;

        for (const [id, entry] of this.blobUrls.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestId = id;
            }
        }

        if (oldestId) {
            console.log(`[CacheManager] Evicting oldest blob: ${oldestId}`);
            this.revokeBlobUrl(oldestId);
        }
    }

    /**
     * Store proxy video in IndexedDB
     */
    async storeProxy(id: string, videoData: ArrayBuffer): Promise<void> {
        if (!this.db) {
            console.warn('[CacheManager] IndexedDB not initialized');
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['proxies'], 'readwrite');
            const store = transaction.objectStore('proxies');

            const request = store.put({
                id,
                data: videoData,
                timestamp: Date.now()
            });

            request.onsuccess = () => {
                console.log(`[CacheManager] Stored proxy in IndexedDB: ${id}`);
                resolve();
            };

            request.onerror = () => {
                console.error('[CacheManager] Failed to store proxy:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Retrieve proxy video from IndexedDB
     */
    async getProxy(id: string): Promise<ArrayBuffer | null> {
        if (!this.db) {
            console.warn('[CacheManager] IndexedDB not initialized');
            return null;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['proxies'], 'readonly');
            const store = transaction.objectStore('proxies');
            const request = store.get(id);

            request.onsuccess = () => {
                const result = request.result;
                if (result && result.data) {
                    console.log(`[CacheManager] Retrieved proxy from IndexedDB: ${id}`);
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.error('[CacheManager] Failed to get proxy:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Clear all cached proxies from IndexedDB
     */
    async clearProxies(): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(['proxies'], 'readwrite');
            const store = transaction.objectStore('proxies');
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[CacheManager] Cleared all proxies from IndexedDB');
                resolve();
            };

            request.onerror = () => {
                console.error('[CacheManager] Failed to clear proxies:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get cache statistics
     */
    getStats(): { blobCount: number; maxBlobs: number; totalBlobSize: number } {
        let totalSize = 0;
        for (const entry of this.blobUrls.values()) {
            totalSize += entry.size;
        }

        return {
            blobCount: this.blobUrls.size,
            maxBlobs: this.maxBlobUrls,
            totalBlobSize: totalSize
        };
    }

    /**
     * Clean up all resources
     */
    destroy(): void {
        // Revoke all blob URLs
        for (const [clipId] of this.blobUrls) {
            this.revokeBlobUrl(clipId);
        }

        // Close IndexedDB connection
        if (this.db) {
            this.db.close();
            this.db = null;
        }

        console.log('[CacheManager] Destroyed');
    }
}

// Singleton instance
let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
    if (!cacheManagerInstance) {
        cacheManagerInstance = new CacheManager();
    }
    return cacheManagerInstance;
}

