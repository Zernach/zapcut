import { useRef, useEffect, useState, useMemo, memo } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useMediaStore } from '../../store/mediaStore';
import { getActiveClipAtTime, getSourceTimeInClip, getTimelineDuration, hasTimelineContent } from '../../utils/timelineUtils';
import { Plus, Check, ChevronDown } from 'lucide-react';
import { Clip } from '../../types/media';

interface VideoPlayerProps {
    src?: string;
    autoPlay?: boolean;
}

// Helper to get video URL - prefers proxy, uses direct file access (NO memory loading!)
function getVideoUrl(clip: Clip): string {
    // Always prefer proxy for better performance
    const filePath = clip.proxyPath || clip.filePath;
    // Use custom stream:// protocol for local file access
    return `stream://localhost/${encodeURIComponent(filePath)}`;
}

// Helper for fallback src (if provided)
function getFallbackUrl(src: string): string {
    return `stream://localhost/${encodeURIComponent(src)}`;
}

export const VideoPlayer = memo(function VideoPlayer({ src, autoPlay = false }: VideoPlayerProps) {
    console.log('[VideoPlayer:render] Component rendering', { src, autoPlay });

    // Use two video elements for seamless transitions
    const video1Ref = useRef<HTMLVideoElement>(null);
    const video2Ref = useRef<HTMLVideoElement>(null);
    const [activeVideoIndex, setActiveVideoIndex] = useState<1 | 2>(1);

    // Track loaded clips for each video element
    const [video1Clip, setVideo1Clip] = useState<Clip | null>(null);
    const [video2Clip, setVideo2Clip] = useState<Clip | null>(null);
    const [video1BlobUrl, setVideo1BlobUrl] = useState<string | null>(null);
    const [video2BlobUrl, setVideo2BlobUrl] = useState<string | null>(null);

    const [showAddedFeedback, setShowAddedFeedback] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showDurationDialog, setShowDurationDialog] = useState(false);
    const [targetDuration, setTargetDuration] = useState('2000');
    const {
        currentTime,
        isPlaying,
        volume,
        isMuted,
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

    // Memoize expensive calculations and debounce to reduce re-renders
    const debouncedTime = useMemo(() => Math.floor(currentTime * 10) / 10, [currentTime]);
    const activeClip = useMemo(() => {
        const clip = getActiveClipAtTime(clips, debouncedTime);
        console.log('[VideoPlayer:activeClip] Recomputed', {
            debouncedTime,
            clipId: clip?.id,
            clipName: clip?.name,
            totalClips: clips.length
        });
        return clip;
    }, [clips, debouncedTime]);
    const timelineDuration = useMemo(() => getTimelineDuration(clips), [clips]);
    const hasContent = useMemo(() => hasTimelineContent(clips), [clips]);

    // Get the active video element
    const activeVideoRef = activeVideoIndex === 1 ? video1Ref : video2Ref;
    const inactiveVideoRef = activeVideoIndex === 1 ? video2Ref : video1Ref;
    const activeClipState = activeVideoIndex === 1 ? video1Clip : video2Clip;
    const inactiveClipState = activeVideoIndex === 1 ? video2Clip : video1Clip;

    // Find the next clip in timeline for preloading
    const getNextClip = (): Clip | null => {
        if (!activeClip) return null;

        const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime);
        const currentIndex = sortedClips.findIndex(c => c.id === activeClip.id);

        if (currentIndex === -1 || currentIndex === sortedClips.length - 1) {
            return null;
        }

        return sortedClips[currentIndex + 1];
    };

    // Load and preload video clips with dual buffering
    useEffect(() => {
        let cancelled = false;

        const loadClipToVideo = async (
            clip: Clip,
            videoRef: React.RefObject<HTMLVideoElement>,
            setClip: (clip: Clip | null) => void,
            setBlobUrl: (url: string | null) => void,
            _oldBlobUrl: string | null
        ) => {
            if (!videoRef.current || !clip.filePath || cancelled) {
                console.log('[VideoPlayer:loadClipToVideo] Early exit -', {
                    hasVideoRef: !!videoRef.current,
                    hasFilePath: !!clip.filePath,
                    cancelled,
                    clipId: clip.id
                });
                return;
            }

            console.log('[VideoPlayer:loadClipToVideo] Starting load', {
                clipId: clip.id,
                clipName: clip.name,
                hasProxy: !!clip.proxyPath,
                filePath: clip.filePath,
                proxyPath: clip.proxyPath
            });

            try {
                const video = videoRef.current;

                // Get streaming URL (uses proxy if available, zero RAM!)
                const videoUrl = getVideoUrl(clip);
                console.log('[VideoPlayer:loadClipToVideo] Generated URL', { clipId: clip.id, videoUrl });
                setBlobUrl(videoUrl);

                if (cancelled) {
                    console.log('[VideoPlayer:loadClipToVideo] Cancelled after URL generation', { clipId: clip.id });
                    return;
                }

                // Set src and load metadata only
                video.src = videoUrl;
                video.preload = 'metadata'; // Only load metadata, not entire video!
                console.log('[VideoPlayer:loadClipToVideo] Set video src and starting load', {
                    clipId: clip.id,
                    readyState: video.readyState
                });

                await new Promise<void>((resolve, reject) => {
                    const handleLoaded = () => {
                        console.log('[VideoPlayer:loadClipToVideo] Metadata loaded successfully', {
                            clipId: clip.id,
                            duration: video.duration,
                            readyState: video.readyState
                        });
                        video.removeEventListener('loadedmetadata', handleLoaded);
                        video.removeEventListener('error', handleError);
                        if (!cancelled) {
                            setClip(clip);
                        }
                        resolve();
                    };

                    const handleError = (e: Event) => {
                        const videoEl = e.target as HTMLVideoElement;
                        console.error('[VideoPlayer:loadClipToVideo] Video load error', {
                            clipId: clip.id,
                            error: videoEl.error?.message || 'Unknown error',
                            code: videoEl.error?.code
                        });
                        video.removeEventListener('loadedmetadata', handleLoaded);
                        video.removeEventListener('error', handleError);
                        reject(new Error(`Video error: ${videoEl.error?.message || 'Unknown error'}`));
                    };

                    video.addEventListener('loadedmetadata', handleLoaded);
                    video.addEventListener('error', handleError);
                    video.load();
                });
            } catch (error) {
                if (!cancelled) {
                    console.error('[VideoPlayer:loadClipToVideo] Error loading clip:', {
                        clipId: clip.id,
                        error
                    });
                }
            }
        };

        const handleLoading = async () => {
            if (cancelled) {
                console.log('[VideoPlayer:handleLoading] Cancelled - exiting');
                return;
            }

            console.log('[VideoPlayer:handleLoading] Starting', {
                hasContent,
                activeClipId: activeClip?.id,
                activeClipName: activeClip?.name,
                src
            });

            if (!hasContent) {
                console.log('[VideoPlayer:handleLoading] No timeline content');
                // No timeline content - handle fallback video if provided
                if (src && video1Ref.current) {
                    const video = video1Ref.current;
                    const videoUrl = getFallbackUrl(src);
                    const alreadyLoaded = video.src === videoUrl && video.readyState >= 1;

                    console.log('[VideoPlayer:handleLoading] Fallback video', {
                        videoUrl,
                        alreadyLoaded,
                        readyState: video.readyState
                    });

                    if (!alreadyLoaded) {
                        try {
                            setVideo1BlobUrl(videoUrl);
                            video.src = videoUrl;
                            video.preload = 'metadata';

                            if (!cancelled) {
                                await new Promise<void>((resolve) => {
                                    const handleLoaded = () => {
                                        console.log('[VideoPlayer:handleLoading] Fallback video loaded', {
                                            duration: video.duration
                                        });
                                        video.removeEventListener('loadedmetadata', handleLoaded);
                                        setDuration(video.duration);
                                        setActiveVideoIndex(1);
                                        resolve();
                                    };
                                    video.addEventListener('loadedmetadata', handleLoaded);
                                    video.load();
                                });
                            }
                        } catch (error) {
                            console.error('[VideoPlayer:handleLoading] Failed to load fallback video:', error);
                        }
                    }
                } else {
                    setDuration(0);
                }
                return;
            }

            if (!activeClip) {
                console.log('[VideoPlayer:handleLoading] No active clip at current time', { currentTime });
                setDuration(timelineDuration);
                return;
            }

            // Check if active video already has the correct clip loaded
            const activeVideo = activeVideoRef.current;
            const isCorrectClipLoaded = activeClipState?.id === activeClip.id &&
                activeVideo?.src &&
                activeVideo.readyState >= 1;

            console.log('[VideoPlayer:handleLoading] Active video check', {
                activeVideoIndex,
                activeClipId: activeClip.id,
                loadedClipId: activeClipState?.id,
                isCorrectClipLoaded,
                hasSrc: !!activeVideo?.src,
                readyState: activeVideo?.readyState
            });

            if (!isCorrectClipLoaded) {
                // Check if the inactive video already has this clip loaded
                const inactiveVideo = inactiveVideoRef.current;
                const isInInactiveVideo = inactiveClipState?.id === activeClip.id &&
                    inactiveVideo?.src &&
                    inactiveVideo.readyState >= 1;

                console.log('[VideoPlayer:handleLoading] Inactive video check', {
                    inactiveLoadedClipId: inactiveClipState?.id,
                    isInInactiveVideo,
                    hasSrc: !!inactiveVideo?.src,
                    readyState: inactiveVideo?.readyState
                });

                if (isInInactiveVideo) {
                    // Switch to the inactive video which already has the clip loaded
                    const newIndex = activeVideoIndex === 1 ? 2 : 1;
                    console.log('[VideoPlayer:handleLoading] Switching to inactive video', {
                        from: activeVideoIndex,
                        to: newIndex
                    });
                    setActiveVideoIndex(newIndex);
                } else {
                    // Load the active clip to the active video
                    console.log('[VideoPlayer:handleLoading] Loading active clip to active video', {
                        clipId: activeClip.id,
                        activeVideoIndex
                    });
                    await loadClipToVideo(
                        activeClip,
                        activeVideoRef,
                        activeVideoIndex === 1 ? setVideo1Clip : setVideo2Clip,
                        activeVideoIndex === 1 ? setVideo1BlobUrl : setVideo2BlobUrl,
                        activeVideoIndex === 1 ? video1BlobUrl : video2BlobUrl
                    );
                }
            }

            // Preload next clip to inactive video if available
            const nextClip = getNextClip();
            if (nextClip) {
                const inactiveVideo = inactiveVideoRef.current;
                const isNextClipLoaded = inactiveClipState?.id === nextClip.id &&
                    inactiveVideo?.src &&
                    inactiveVideo.readyState >= 1;

                console.log('[VideoPlayer:handleLoading] Preload next clip', {
                    nextClipId: nextClip.id,
                    isNextClipLoaded
                });

                if (!isNextClipLoaded) {
                    loadClipToVideo(
                        nextClip,
                        inactiveVideoRef,
                        activeVideoIndex === 1 ? setVideo2Clip : setVideo1Clip,
                        activeVideoIndex === 1 ? setVideo2BlobUrl : setVideo1BlobUrl,
                        activeVideoIndex === 1 ? video2BlobUrl : video1BlobUrl
                    );
                }
            }

            setDuration(timelineDuration);
        };

        console.log('[VideoPlayer:useEffect] Clip loading effect triggered', {
            activeClipId: activeClip?.id,
            hasContent,
            timelineDuration
        });
        handleLoading();

        return () => {
            cancelled = true;
        };
    }, [activeClip?.id, src, hasContent, timelineDuration]);

    // Handle playback state and video switching
    useEffect(() => {
        const video = activeVideoRef.current;

        console.log('[VideoPlayer:playback] Effect triggered', {
            hasVideo: !!video,
            hasSrc: !!video?.src,
            isPlaying,
            activeVideoIndex,
            activeClipId: activeClip?.id,
            activeClipStateId: activeClipState?.id,
            currentTime,
            videoCurrentTime: video?.currentTime,
            readyState: video?.readyState
        });

        if (!video || !video.src) {
            console.log('[VideoPlayer:playback] No video or src - skipping');
            return;
        }

        // Pause the inactive video
        const inactiveVideo = inactiveVideoRef.current;
        if (inactiveVideo) {
            console.log('[VideoPlayer:playback] Pausing inactive video');
            inactiveVideo.pause();
        }

        // Handle playback
        if (isPlaying) {
            if (activeClip && activeClipState?.id === activeClip.id) {
                // Only try to play if the correct clip is loaded
                const sourceTime = getSourceTimeInClip(activeClip, currentTime);

                console.log('[VideoPlayer:playback] Playing', {
                    clipId: activeClip.id,
                    sourceTime,
                    videoCurrentTime: video.currentTime,
                    needsSeek: Math.abs(video.currentTime - sourceTime) > 0.1
                });

                if (Math.abs(video.currentTime - sourceTime) > 0.1) {
                    console.log('[VideoPlayer:playback] Seeking before play', {
                        from: video.currentTime,
                        to: sourceTime
                    });
                    video.currentTime = sourceTime;
                }

                video.play().catch((err) => {
                    console.error('[VideoPlayer:playback] Play failed:', err);
                    setPlaying(false);
                });
            } else {
                console.log('[VideoPlayer:playback] Clip mismatch - not playing', {
                    activeClipId: activeClip?.id,
                    loadedClipId: activeClipState?.id
                });
            }
        } else {
            console.log('[VideoPlayer:playback] Pausing');
            video.pause();
        }
    }, [isPlaying, activeVideoIndex, activeClip, activeClipState, currentTime, setPlaying]);

    // Handle seeking (when not playing)
    useEffect(() => {
        if (isPlaying) return; // Don't seek during playback

        const video = activeVideoRef.current;

        console.log('[VideoPlayer:seeking] Effect triggered', {
            isPlaying,
            hasVideo: !!video,
            activeClipId: activeClip?.id,
            activeClipStateId: activeClipState?.id,
            currentTime,
            videoCurrentTime: video?.currentTime
        });

        if (!video) return;

        if (activeClip && activeClipState?.id === activeClip.id) {
            const sourceTime = getSourceTimeInClip(activeClip, currentTime);
            if (Math.abs(video.currentTime - sourceTime) > 0.1) {
                console.log('[VideoPlayer:seeking] Seeking', {
                    from: video.currentTime,
                    to: sourceTime,
                    clipId: activeClip.id
                });
                video.currentTime = sourceTime;
            }
        }
    }, [currentTime, activeClip, activeClipState, activeVideoIndex, isPlaying]);

    // Handle volume for both videos
    useEffect(() => {
        if (video1Ref.current) video1Ref.current.volume = volume;
        if (video2Ref.current) video2Ref.current.volume = volume;
    }, [volume]);

    // Handle mute for both videos
    useEffect(() => {
        if (video1Ref.current) video1Ref.current.muted = isMuted;
        if (video2Ref.current) video2Ref.current.muted = isMuted;
    }, [isMuted]);

    // Update current time during playback
    useEffect(() => {
        const video = activeVideoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (activeClip && activeClipState?.id === activeClip.id) {
                // Convert source time back to timeline time
                const sourceTime = video.currentTime;
                const timelineTime = activeClip.startTime + activeClip.trimStart + sourceTime;

                // Check if we've reached the end of the current clip
                const clipEndTime = activeClip.startTime + activeClip.duration;
                if (timelineTime >= clipEndTime) {
                    // Move to the exact end of this clip and let the next cycle handle the transition
                    console.log('[VideoPlayer:timeupdate] Reached clip end', {
                        clipId: activeClip.id,
                        clipEndTime,
                        timelineTime
                    });
                    setCurrentTime(clipEndTime);
                } else {
                    setCurrentTime(timelineTime);
                }
            }
        };

        const handleEnded = () => {
            console.log('[VideoPlayer:ended] Video ended', {
                activeClipId: activeClip?.id,
                hasActiveClip: !!activeClip
            });
            if (activeClip) {
                // Move to the end of this clip
                const clipEndTime = activeClip.startTime + activeClip.duration;
                setCurrentTime(clipEndTime);

                // Check if we've reached the end of the timeline
                const timelineDuration = getTimelineDuration(clips);
                console.log('[VideoPlayer:ended] Checking timeline end', {
                    clipEndTime,
                    timelineDuration,
                    isEnd: clipEndTime >= timelineDuration
                });
                if (clipEndTime >= timelineDuration) {
                    setPlaying(false);
                }
            } else {
                setPlaying(false);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [setCurrentTime, setPlaying, activeClip, activeClipState, clips, activeVideoIndex]);

    // Handle playback through blank timeline spaces
    useEffect(() => {
        if (!isPlaying || !hasContent) {
            console.log('[VideoPlayer:blankSpace] Not running animation frame', {
                isPlaying,
                hasContent
            });
            return;
        }

        console.log('[VideoPlayer:blankSpace] Starting animation frame loop');
        let animationFrameId: number;
        let lastTime = performance.now();

        const advanceThroughBlankSpace = (currentTimeMs: number) => {
            const deltaTime = (currentTimeMs - lastTime) / 1000; // Convert to seconds
            lastTime = currentTimeMs;

            // Only advance time if we're in a blank space (no active clip)
            if (!activeClip && deltaTime > 0 && deltaTime < 0.1) {
                const newTime = currentTime + deltaTime;
                const timelineDuration = getTimelineDuration(clips);

                console.log('[VideoPlayer:blankSpace] Advancing through blank space', {
                    deltaTime,
                    newTime,
                    timelineDuration
                });

                if (newTime >= timelineDuration) {
                    // Reached end of timeline
                    console.log('[VideoPlayer:blankSpace] Reached timeline end');
                    setPlaying(false);
                    setCurrentTime(timelineDuration);
                } else {
                    setCurrentTime(newTime);
                }
            }

            if (isPlaying) {
                animationFrameId = requestAnimationFrame(advanceThroughBlankSpace);
            }
        };

        // Start the animation loop
        animationFrameId = requestAnimationFrame(advanceThroughBlankSpace);

        return () => {
            if (animationFrameId) {
                console.log('[VideoPlayer:blankSpace] Stopping animation frame loop');
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPlaying, hasContent, activeClip, currentTime, clips, setCurrentTime, setPlaying]);

    // Clean up blob URLs on unmount
    useEffect(() => {
        return () => {
            if (video1BlobUrl) {
                URL.revokeObjectURL(video1BlobUrl);
            }
            if (video2BlobUrl) {
                URL.revokeObjectURL(video2BlobUrl);
            }
        };
    }, [video1BlobUrl, video2BlobUrl]);

    // Determine what to display
    // Show video if: 1) there's an active clip (even if still loading), or 2) no timeline but have src
    const shouldShowVideo = activeClip || (!hasContent && src);
    const shouldShowBlackScreen = hasContent && !activeClip;
    const displayMessage = 'No video selected';

    // Debug display state
    useEffect(() => {
        console.log('[VideoPlayer:display] Display state', {
            shouldShowVideo,
            shouldShowBlackScreen,
            activeVideoIndex,
            hasActiveClip: !!activeClip,
            hasContent,
            hasSrc: !!src,
            video1HasSrc: !!video1Ref.current?.src,
            video2HasSrc: !!video2Ref.current?.src,
            video1ReadyState: video1Ref.current?.readyState,
            video2ReadyState: video2Ref.current?.readyState,
            video1Visible: shouldShowVideo && activeVideoIndex === 1,
            video2Visible: shouldShowVideo && activeVideoIndex === 2
        });
    }, [shouldShowVideo, shouldShowBlackScreen, activeVideoIndex, activeClip, hasContent, src]);

    // Clear timeline clip selection and deselect media when clicking on video player
    const clearSelection = useTimelineStore((state) => state.clearSelection);
    const clearMediaSelection = useMediaStore((state) => state.clearSelection);
    const handleClick = () => {
        clearSelection();
        clearMediaSelection();
        setShowDropdown(false);
    };

    // Helper function to create a clip from a media item
    const createClipFromItem = (item: typeof selectedItems[0], startTime: number, speedAdjustment?: number) => {
        const speed = speedAdjustment || 1.0;
        const duration = item.duration / speed;

        return {
            id: `clip-${Date.now()}-${Math.random()}`,
            name: item.name,
            filePath: item.filePath,
            proxyPath: item.proxyPath,
            duration,
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
            speed,
        };
    };

    // Handle adding selected media item(s) to timeline - unchanged
    const handleAddAllUnchanged = (e: React.MouseEvent) => {
        e.stopPropagation();
        let currentDuration = getDuration();

        selectedItems.forEach((item) => {
            const clip = createClipFromItem(item, currentDuration);
            addClip(clip);
            currentDuration += clip.duration;
        });

        // Show "Added!" feedback
        setShowAddedFeedback(true);
        setTimeout(() => {
            setShowAddedFeedback(false);
        }, 1000);

        clearMediaSelection();
        setShowDropdown(false);
    };

    // Handle adding with changes (speed adjustment)
    const handleAddAllWithChanges = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDropdown(false);
        setShowDurationDialog(true);
    };

    // Handle duration dialog submission
    const handleDurationSubmit = () => {
        const targetDurationMs = parseFloat(targetDuration);
        if (isNaN(targetDurationMs) || targetDurationMs <= 0) {
            alert('Please enter a valid duration in milliseconds');
            return;
        }

        let currentDuration = getDuration();

        selectedItems.forEach((item) => {
            // Calculate speed adjustment so clip duration equals target duration
            const speedAdjustment = item.duration / targetDurationMs;
            const clip = createClipFromItem(item, currentDuration, speedAdjustment);
            addClip(clip);
            currentDuration += clip.duration;
        });

        // Show "Added!" feedback
        setShowAddedFeedback(true);
        setTimeout(() => {
            setShowAddedFeedback(false);
        }, 1000);

        clearMediaSelection();
        setShowDurationDialog(false);
        setTargetDuration('2000');
    };

    // Handle single item add (backward compatibility)
    const handleAddToTimeline = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedItems.length === 1) {
            handleAddAllUnchanged(e);
        } else {
            setShowDropdown(!showDropdown);
        }
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center" onClick={handleClick}>
            {/* Add to Timeline Button - Only visible when media library item(s) are selected */}
            {selectedItems.length > 0 && (
                <div className="absolute top-4 left-4 z-10">
                    <button
                        onClick={handleAddToTimeline}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-2 transition-colors shadow-lg"
                    >
                        <Plus size={16} />
                        {selectedItems.length === 1
                            ? 'Add to Timeline'
                            : `Add (${selectedItems.length}) to Timeline`}
                        {selectedItems.length > 1 && <ChevronDown size={14} />}
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && selectedItems.length > 1 && (
                        <div className="absolute top-full left-0 mt-1 bg-panel border border-border rounded shadow-lg overflow-hidden min-w-[200px]">
                            <button
                                onClick={handleAddAllUnchanged}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors"
                            >
                                Add all unchanged
                            </button>
                            <button
                                onClick={handleAddAllWithChanges}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors border-t border-border"
                            >
                                Add all with changes
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Duration Dialog */}
            {showDurationDialog && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20" onClick={(e) => {
                    e.stopPropagation();
                    setShowDurationDialog(false);
                }}>
                    <div className="bg-panel border border-border rounded-lg p-6 shadow-xl max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-4">Set Clip Duration</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Enter the target duration in milliseconds for each clip. The speed will be adjusted accordingly.
                        </p>
                        <input
                            type="number"
                            value={targetDuration}
                            onChange={(e) => setTargetDuration(e.target.value)}
                            placeholder="2000"
                            className="w-full px-3 py-2 bg-background border border-border rounded text-sm mb-4"
                            autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDurationDialog(false);
                                    setTargetDuration('2000');
                                }}
                                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDurationSubmit}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* "Added!" feedback message */}
            {showAddedFeedback && (
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-transparent rounded text-sm flex items-center gap-1.5 z-10 text-green-400 font-medium">
                    <Check size={16} />
                    Added!
                </div>
            )}

            {/* Video elements - always in DOM for loading */}
            <video
                ref={video1Ref}
                className="max-w-full max-h-full absolute"
                style={{
                    opacity: shouldShowVideo && activeVideoIndex === 1 ? 1 : 0,
                    pointerEvents: shouldShowVideo && activeVideoIndex === 1 ? 'auto' : 'none',
                    transition: 'opacity 0.1s ease-in-out',
                    visibility: shouldShowVideo ? 'visible' : 'hidden'
                }}
                autoPlay={autoPlay}
            />
            <video
                ref={video2Ref}
                className="max-w-full max-h-full absolute"
                style={{
                    opacity: shouldShowVideo && activeVideoIndex === 2 ? 1 : 0,
                    pointerEvents: shouldShowVideo && activeVideoIndex === 2 ? 'auto' : 'none',
                    transition: 'opacity 0.1s ease-in-out',
                    visibility: shouldShowVideo ? 'visible' : 'hidden'
                }}
                autoPlay={autoPlay}
            />

            {/* Black screen for gaps in timeline */}
            {shouldShowBlackScreen && <div className="w-full h-full bg-black" />}

            {/* "No video selected" message */}
            {!shouldShowVideo && !shouldShowBlackScreen && (
                <div className="text-gray-500">{displayMessage}</div>
            )}
        </div>
    );
});

