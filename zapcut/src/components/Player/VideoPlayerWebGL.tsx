/**
 * WebGL-Accelerated Video Player
 * 
 * Alternative to VideoPlayer.tsx using WebGL compositor for high-performance
 * multi-clip playback. Integrates with the VideoCompositor class.
 * 
 * Usage: Replace VideoPlayer component with this for GPU-accelerated rendering.
 */

import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useMediaStore } from '../../store/mediaStore';
import { VideoCompositor } from '../../utils/webgl/VideoCompositor';
import { useClipPreloader } from '../../hooks/useClipPreloader';
import { getActiveClipAtTime, getSourceTimeInClip, getTimelineDuration, hasTimelineContent } from '../../utils/timelineUtils';
import { getCacheManager } from '../../utils/cacheManager';
import { getMemoryMonitor } from '../../utils/memoryMonitor';
import { Plus } from 'lucide-react';

interface VideoPlayerWebGLProps {
    src?: string;
    autoPlay?: boolean;
}

export function VideoPlayerWebGL({ autoPlay = false }: VideoPlayerWebGLProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const compositorRef = useRef<VideoCompositor | null>(null);

    const {
        currentTime,
        isPlaying,
        setCurrentTime,
        setDuration,
        setPlaying,
    } = usePlayerStore();

    const clips = useTimelineStore((state) => state.clips);
    const addClip = useTimelineStore((state) => state.addClip);
    const getDuration = useTimelineStore((state) => state.getDuration);

    const selectedItemIds = useMediaStore((state) => state.selectedItemIds);
    const items = useMediaStore((state) => state.items);
    const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));

    const activeClip = getActiveClipAtTime(clips, currentTime);
    const timelineDuration = getTimelineDuration(clips);
    const hasContent = hasTimelineContent(clips);

    // Initialize compositor
    useEffect(() => {
        if (!canvasRef.current) return;

        console.log('[VideoPlayerWebGL] Initializing compositor');

        const compositor = new VideoCompositor({
            canvas: canvasRef.current,
            width: 1920,
            height: 1080,
            maxPreloadClips: 16
        });

        compositorRef.current = compositor;

        // Initialize cache manager and memory monitor
        const cacheManager = getCacheManager();
        const memoryMonitor = getMemoryMonitor();
        memoryMonitor.start();

        // Set up memory pressure handlers
        memoryMonitor.onPressureLevel('high', () => {
            console.warn('[VideoPlayerWebGL] High memory pressure - consider clearing cache');
        });

        memoryMonitor.onPressureLevel('critical', () => {
            console.error('[VideoPlayerWebGL] Critical memory pressure - forcing cleanup');
            // Could trigger aggressive cache cleanup here
        });

        return () => {
            console.log('[VideoPlayerWebGL] Cleaning up compositor');
            compositor.destroy();
            cacheManager.destroy();
            memoryMonitor.stop();
        };
    }, []);

    // Intelligent clip preloading
    useClipPreloader({
        compositor: compositorRef.current,
        clips,
        currentTime,
        isPlaying,
        preloadAheadCount: 5
    });

    // Load active clip
    useEffect(() => {
        if (!compositorRef.current || !activeClip) return;

        const sourceTime = getSourceTimeInClip(activeClip, currentTime);
        compositorRef.current.setCurrentClip(activeClip, sourceTime);

    }, [activeClip?.id, currentTime]);

    // Handle playback
    useEffect(() => {
        if (!compositorRef.current) return;

        if (isPlaying) {
            compositorRef.current.play();
        } else {
            compositorRef.current.pause();
        }
    }, [isPlaying]);

    // Sync time updates
    useEffect(() => {
        if (!compositorRef.current || !isPlaying) return;

        const interval = setInterval(() => {
            if (compositorRef.current && activeClip) {
                const videoTime = compositorRef.current.getCurrentTime();
                const timelineTime = activeClip.startTime + activeClip.trimStart + videoTime;

                // Check if we've reached end of clip
                const clipEndTime = activeClip.startTime + activeClip.duration;
                if (timelineTime >= clipEndTime) {
                    setCurrentTime(clipEndTime);

                    // Check if end of timeline
                    if (clipEndTime >= timelineDuration) {
                        setPlaying(false);
                    }
                } else {
                    setCurrentTime(timelineTime);
                }
            }
        }, 1000 / 30); // 30 fps sync

        return () => clearInterval(interval);
    }, [isPlaying, activeClip, timelineDuration, setCurrentTime, setPlaying]);

    // Update duration
    useEffect(() => {
        setDuration(timelineDuration);
    }, [timelineDuration, setDuration]);

    // Handle seeking
    useEffect(() => {
        if (!compositorRef.current || !activeClip || isPlaying) return;

        const sourceTime = getSourceTimeInClip(activeClip, currentTime);
        compositorRef.current.seek(sourceTime);
    }, [currentTime, activeClip, isPlaying]);

    // Helper to create clip from media item
    const createClipFromItem = (item: typeof selectedItems[0], startTime: number) => {
        return {
            id: `clip-${Date.now()}-${Math.random()}`,
            name: item.name,
            filePath: item.filePath,
            proxyPath: item.proxyPath,
            duration: item.duration,
            originalDuration: item.duration,
            startTime,
            trimStart: 0,
            trimEnd: 0,
            trackIndex: 0,
            width: item.width,
            height: item.height,
            fps: item.fps,
            thumbnailPath: item.thumbnailPath,
            metadata: {
                codec: item.codec,
                bitrate: 0,
                fileSize: item.fileSize,
                createdAt: new Date(),
            },
            speed: 1.0,
        };
    };

    const handleAddToTimeline = () => {
        let currentDuration = getDuration();

        selectedItems.forEach((item) => {
            const clip = createClipFromItem(item, currentDuration);
            addClip(clip);
            currentDuration += clip.duration;
        });
    };

    const shouldShowCanvas = hasContent && activeClip;

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {/* Add to Timeline Button */}
            {selectedItems.length > 0 && (
                <button
                    onClick={handleAddToTimeline}
                    className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-2"
                >
                    <Plus size={16} />
                    Add to Timeline ({selectedItems.length})
                </button>
            )}

            {/* WebGL Canvas */}
            <canvas
                ref={canvasRef}
                className="max-w-full max-h-full"
                style={{
                    display: shouldShowCanvas ? 'block' : 'none'
                }}
            />

            {/* No video message */}
            {!hasContent && (
                <div className="text-gray-500">No video selected</div>
            )}

            {/* Black screen for gaps */}
            {hasContent && !activeClip && (
                <div className="w-full h-full bg-black" />
            )}

            {/* Debug info */}
            {compositorRef.current && (
                <div className="absolute bottom-4 right-4 text-xs bg-black/70 px-2 py-1 rounded">
                    Compositor: {compositorRef.current.getStats().loadedClips} / {compositorRef.current.getStats().maxClips} clips
                </div>
            )}
        </div>
    );
}

