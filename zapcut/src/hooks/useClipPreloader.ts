/**
 * Intelligent Clip Preloader Hook
 * 
 * Predictive loading strategy that adapts based on user behavior:
 * - Playback mode: Pre-load next 5 clips in sequence
 * - Scrubbing mode: Load visible timeline clips
 * - Idle mode: Background-load all clips
 */

import { useEffect, useRef } from 'react';
import { Clip } from '../types/media';
import { VideoCompositor } from '../utils/webgl/VideoCompositor';

export type PreloaderMode = 'playback' | 'scrubbing' | 'idle';

interface PreloaderOptions {
    compositor: VideoCompositor | null;
    clips: Clip[];
    currentTime: number;
    isPlaying: boolean;
    isScrolling?: boolean;
    preloadAheadCount?: number;
}

export function useClipPreloader({
    compositor,
    clips,
    currentTime,
    isPlaying,
    isScrolling = false,
    preloadAheadCount = 5
}: PreloaderOptions) {
    const lastModeRef = useRef<PreloaderMode>('idle');
    const lastPreloadTimeRef = useRef<number>(0);
    const isLoadingRef = useRef<boolean>(false);

    // Determine current mode
    const getMode = (): PreloaderMode => {
        if (isPlaying) return 'playback';
        if (isScrolling) return 'scrubbing';
        return 'idle';
    };

    // Get clips to preload based on mode
    const getClipsToPreload = (mode: PreloaderMode): Clip[] => {
        const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);

        switch (mode) {
            case 'playback': {
                // Find current or next clip
                const currentIndex = sortedClips.findIndex(
                    c => currentTime >= c.startTime && currentTime < c.startTime + c.duration
                );

                if (currentIndex === -1) {
                    // Not on a clip, find next one
                    const nextIndex = sortedClips.findIndex(c => c.startTime > currentTime);
                    if (nextIndex !== -1) {
                        return sortedClips.slice(nextIndex, nextIndex + preloadAheadCount);
                    }
                    return [];
                }

                // Preload current clip and next N clips
                return sortedClips.slice(currentIndex, currentIndex + preloadAheadCount + 1);
            }

            case 'scrubbing': {
                // Load clips around current time (±10 seconds)
                const timeWindow = 10; // seconds
                return sortedClips.filter(
                    c => Math.abs(c.startTime - currentTime) <= timeWindow
                );
            }

            case 'idle': {
                // Load all clips (but throttled)
                return sortedClips;
            }

            default:
                return [];
        }
    };

    // Preload clips based on current mode
    useEffect(() => {
        if (!compositor || clips.length === 0) return;
        if (isLoadingRef.current) return;

        const mode = getMode();
        const now = Date.now();

        // Throttle preloading based on mode
        const throttleMs = mode === 'playback' ? 500 : mode === 'scrubbing' ? 200 : 2000;
        if (now - lastPreloadTimeRef.current < throttleMs && mode === lastModeRef.current) {
            return;
        }

        lastModeRef.current = mode;
        lastPreloadTimeRef.current = now;

        const clipsToPreload = getClipsToPreload(mode);

        if (clipsToPreload.length === 0) return;

        // Preload clips asynchronously
        isLoadingRef.current = true;
        compositor.preloadClips(clipsToPreload)
            .then(() => {
            })
            .catch(err => {
                console.error('[Preloader] Error loading clips:', err);
            })
            .finally(() => {
                isLoadingRef.current = false;
            });

    }, [compositor, clips, currentTime, isPlaying, isScrolling, preloadAheadCount]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isLoadingRef.current = false;
        };
    }, []);
}

