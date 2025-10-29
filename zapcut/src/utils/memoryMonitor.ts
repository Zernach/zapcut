/**
 * Memory Monitor
 * 
 * Monitors browser memory usage and triggers cleanup when threshold is reached.
 * Uses Performance API when available, falls back to estimation.
 */

export interface MemoryStats {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercent: number;
}

export type MemoryPressureLevel = 'low' | 'medium' | 'high' | 'critical';

export class MemoryMonitor {
    private checkInterval: number;
    private intervalId: number | null = null;
    private listeners: Map<MemoryPressureLevel, Set<() => void>> = new Map();
    private lastPressureLevel: MemoryPressureLevel = 'low';

    // Thresholds (percentage of heap limit)
    private thresholds = {
        medium: 60,
        high: 75,
        critical: 90
    };

    constructor(checkIntervalMs: number = 5000) {
        this.checkInterval = checkIntervalMs;

        // Initialize listener sets
        this.listeners.set('low', new Set());
        this.listeners.set('medium', new Set());
        this.listeners.set('high', new Set());
        this.listeners.set('critical', new Set());
    }

    /**
     * Check if Performance.memory API is available
     */
    private isMemoryAPIAvailable(): boolean {
        return 'memory' in performance && 'usedJSHeapSize' in (performance as any).memory;
    }

    /**
     * Get current memory statistics
     */
    getMemoryStats(): MemoryStats | null {
        if (!this.isMemoryAPIAvailable()) {
            console.warn('[MemoryMonitor] Performance.memory API not available');
            return null;
        }

        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercent
        };
    }

    /**
     * Calculate current memory pressure level
     */
    private getPressureLevel(stats: MemoryStats): MemoryPressureLevel {
        if (stats.usagePercent >= this.thresholds.critical) {
            return 'critical';
        } else if (stats.usagePercent >= this.thresholds.high) {
            return 'high';
        } else if (stats.usagePercent >= this.thresholds.medium) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Check memory and trigger listeners if pressure level changed
     */
    private checkMemory = (): void => {
        const stats = this.getMemoryStats();
        if (!stats) return;

        const currentLevel = this.getPressureLevel(stats);

        // Trigger listeners if level changed
        if (currentLevel !== this.lastPressureLevel) {
            this.notifyListeners(currentLevel);
            this.lastPressureLevel = currentLevel;
        }
    }

    /**
     * Notify all listeners for a specific pressure level
     */
    private notifyListeners(level: MemoryPressureLevel): void {
        const listeners = this.listeners.get(level);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('[MemoryMonitor] Listener error:', error);
                }
            });
        }
    }

    /**
     * Start monitoring memory
     */
    start(): void {
        if (this.intervalId !== null) {
            console.warn('[MemoryMonitor] Already started');
            return;
        }

        if (!this.isMemoryAPIAvailable()) {
            console.warn('[MemoryMonitor] Cannot start - Performance.memory API not available');
            console.warn('[MemoryMonitor] Note: Chrome/Edge require --enable-precise-memory-info flag');
            return;
        }

        this.intervalId = window.setInterval(this.checkMemory, this.checkInterval);

        // Initial check
        this.checkMemory();
    }

    /**
     * Stop monitoring memory
     */
    stop(): void {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Add a listener for a specific pressure level
     */
    onPressureLevel(level: MemoryPressureLevel, callback: () => void): () => void {
        const listeners = this.listeners.get(level);
        if (listeners) {
            listeners.add(callback);
        }

        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(level);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }

    /**
     * Trigger garbage collection (if available)
     */
    requestGC(): void {
        if ('gc' in window && typeof (window as any).gc === 'function') {
            (window as any).gc();
        } else {
            console.warn('[MemoryMonitor] Manual GC not available');
        }
    }

    /**
     * Get formatted memory info string
     */
    getFormattedStats(): string {
        const stats = this.getMemoryStats();
        if (!stats) return 'Memory stats unavailable';

        const usedMB = (stats.usedJSHeapSize / 1048576).toFixed(1);
        const limitMB = (stats.jsHeapSizeLimit / 1048576).toFixed(1);
        const percent = stats.usagePercent.toFixed(1);

        return `${usedMB}MB / ${limitMB}MB (${percent}%) - ${this.lastPressureLevel}`;
    }
}

// Singleton instance
let memoryMonitorInstance: MemoryMonitor | null = null;

export function getMemoryMonitor(): MemoryMonitor {
    if (!memoryMonitorInstance) {
        memoryMonitorInstance = new MemoryMonitor();
    }
    return memoryMonitorInstance;
}

