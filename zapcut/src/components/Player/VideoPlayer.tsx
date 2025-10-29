import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useMediaStore } from '../../store/mediaStore';
import { invoke } from '@tauri-apps/api/core';
import { getActiveClipAtTime, getSourceTimeInClip, getTimelineDuration, hasTimelineContent } from '../../utils/timelineUtils';
import { Plus, Check, ChevronDown } from 'lucide-react';
import { Clip } from '../../types/media';

interface VideoPlayerProps {
    src?: string;
    autoPlay?: boolean;
}

// Helper to load video from backend and create blob URL
async function loadVideoBlob(filePath: string): Promise<string> {
    console.log('[loadVideoBlob] START - Path:', filePath);

    try {
        // Call backend to read video file
        console.log('[loadVideoBlob] Invoking read_video_file command...');
        const videoData = await invoke<number[]>('read_video_file', { filePath });
        console.log('[loadVideoBlob] Received video data - Length:', videoData.length, 'bytes');

        // Convert to Uint8Array
        const uint8Array = new Uint8Array(videoData);
        console.log('[loadVideoBlob] Created Uint8Array - Length:', uint8Array.length, 'bytes');

        // Create blob
        const blob = new Blob([uint8Array], { type: 'video/mp4' });
        console.log('[loadVideoBlob] Created Blob - Size:', blob.size, 'bytes, Type:', blob.type);

        // Create blob URL
        const blobUrl = URL.createObjectURL(blob);
        console.log('[loadVideoBlob] SUCCESS - Blob URL created:', blobUrl);

        return blobUrl;
    } catch (error) {
        console.error('[loadVideoBlob] ERROR:', error);
        throw error;
    }
}

export function VideoPlayer({ src, autoPlay = false }: VideoPlayerProps) {
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

    // Determine which clip should be playing at current time
    const activeClip = getActiveClipAtTime(clips, currentTime);
    const timelineDuration = getTimelineDuration(clips);
    const hasContent = hasTimelineContent(clips);

    // Get the active video element
    const activeVideoRef = activeVideoIndex === 1 ? video1Ref : video2Ref;
    const inactiveVideoRef = activeVideoIndex === 1 ? video2Ref : video1Ref;
    const activeClipState = activeVideoIndex === 1 ? video1Clip : video2Clip;
    const inactiveClipState = activeVideoIndex === 1 ? video2Clip : video1Clip;

    // Debug logging
    useEffect(() => {
        console.log('VideoPlayer state:', {
            currentTime,
            clipsCount: clips.length,
            hasContent,
            activeClip: activeClip?.name,
            activeClipState: activeClipState?.name,
            timelineDuration,
            activeVideoIndex
        });
    }, [currentTime, clips.length, hasContent, activeClip, activeClipState, timelineDuration, activeVideoIndex]);

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
            oldBlobUrl: string | null
        ) => {
            console.log('[loadClipToVideo] START - Clip:', clip.name, 'Path:', clip.filePath);

            if (!videoRef.current) {
                console.error('[loadClipToVideo] ERROR: Video ref is null');
                return;
            }

            if (!clip.filePath) {
                console.error('[loadClipToVideo] ERROR: Clip has no file path');
                return;
            }

            if (cancelled) {
                console.log('[loadClipToVideo] CANCELLED - Operation was cancelled');
                return;
            }

            try {
                // Revoke old blob URL
                if (oldBlobUrl) {
                    console.log('[loadClipToVideo] Revoking old blob URL:', oldBlobUrl);
                    URL.revokeObjectURL(oldBlobUrl);
                }

                // Load new video
                console.log('[loadClipToVideo] Loading video blob...');
                const blobUrl = await loadVideoBlob(clip.filePath);

                if (cancelled) {
                    console.log('[loadClipToVideo] CANCELLED after loading - Revoking blob URL');
                    URL.revokeObjectURL(blobUrl);
                    return;
                }

                console.log('[loadClipToVideo] Setting blob URL in state');
                setBlobUrl(blobUrl);

                const video = videoRef.current;
                if (!video) {
                    console.error('[loadClipToVideo] ERROR: Video element became null');
                    return;
                }

                if (cancelled) {
                    console.log('[loadClipToVideo] CANCELLED before setting src');
                    return;
                }

                console.log('[loadClipToVideo] Setting video.src to blob URL');
                video.src = blobUrl;

                console.log('[loadClipToVideo] Calling video.load() and waiting for metadata...');
                await new Promise<void>((resolve, reject) => {
                    const handleLoaded = () => {
                        console.log('[loadClipToVideo] Metadata loaded!', {
                            duration: video.duration,
                            videoWidth: video.videoWidth,
                            videoHeight: video.videoHeight,
                            readyState: video.readyState,
                            networkState: video.networkState
                        });
                        video.removeEventListener('loadedmetadata', handleLoaded);
                        video.removeEventListener('error', handleError);
                        if (!cancelled) {
                            setClip(clip);
                            console.log('[loadClipToVideo] SUCCESS - Clip loaded:', clip.name);
                        }
                        resolve();
                    };

                    const handleError = (e: Event) => {
                        const videoEl = e.target as HTMLVideoElement;
                        console.error('[loadClipToVideo] Video error event:', {
                            error: videoEl.error,
                            code: videoEl.error?.code,
                            message: videoEl.error?.message,
                            src: videoEl.src
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
                    console.error('[loadClipToVideo] ERROR:', error);
                }
            }
        };

        const handleLoading = async () => {
            console.log('[handleLoading] START - hasContent:', hasContent, 'activeClip:', activeClip?.name, 'currentTime:', currentTime);

            if (cancelled) {
                console.log('[handleLoading] CANCELLED');
                return;
            }

            if (!hasContent) {
                console.log('[handleLoading] No timeline content - checking fallback video');
                // No timeline content - handle fallback video if provided
                if (src && video1Ref.current) {
                    const video = video1Ref.current;
                    // Check if already loaded - compare current src with expected
                    const currentSrc = video.src;
                    const alreadyLoaded = currentSrc && currentSrc.startsWith('blob:') && video.readyState >= 1;
                    console.log('[handleLoading] Fallback video - src:', src, 'alreadyLoaded:', alreadyLoaded, 'readyState:', video.readyState);
                    if (!alreadyLoaded) {
                        try {
                            console.log('[handleLoading] Loading fallback video...');
                            const blobUrl = await loadVideoBlob(src);
                            if (!cancelled) {
                                setVideo1BlobUrl(blobUrl);
                                video.src = blobUrl;
                                await new Promise<void>((resolve) => {
                                    const handleLoaded = () => {
                                        video.removeEventListener('loadedmetadata', handleLoaded);
                                        setDuration(video.duration);
                                        setActiveVideoIndex(1);
                                        console.log('[handleLoading] Fallback video loaded - duration:', video.duration);
                                        resolve();
                                    };
                                    video.addEventListener('loadedmetadata', handleLoaded);
                                    video.load();
                                });
                            }
                        } catch (error) {
                            console.error('[handleLoading] Failed to load fallback video:', error);
                        }
                    }
                } else {
                    console.log('[handleLoading] No fallback video available');
                    setDuration(0);
                }
                return;
            }

            if (!activeClip) {
                console.log('[handleLoading] Timeline has content but no active clip at current time');
                setDuration(timelineDuration);
                return;
            }

            console.log('[handleLoading] Active clip:', activeClip.name, 'activeClipState:', activeClipState?.name, 'activeVideoIndex:', activeVideoIndex);

            // Check if active video already has the correct clip loaded
            const activeVideo = activeVideoRef.current;
            const isCorrectClipLoaded = activeClipState?.id === activeClip.id &&
                activeVideo?.src &&
                activeVideo.src.startsWith('blob:') &&
                activeVideo.readyState >= 1;

            console.log('[handleLoading] isCorrectClipLoaded:', isCorrectClipLoaded, 'readyState:', activeVideo?.readyState);

            if (!isCorrectClipLoaded) {
                // Check if the inactive video already has this clip loaded
                const inactiveVideo = inactiveVideoRef.current;
                const isInInactiveVideo = inactiveClipState?.id === activeClip.id &&
                    inactiveVideo?.src &&
                    inactiveVideo.src.startsWith('blob:') &&
                    inactiveVideo.readyState >= 1;

                if (isInInactiveVideo) {
                    // Switch to the inactive video which already has the clip loaded
                    const newIndex = activeVideoIndex === 1 ? 2 : 1;
                    console.log('[handleLoading] Switching to preloaded video - from index', activeVideoIndex, 'to', newIndex);
                    setActiveVideoIndex(newIndex);
                } else {
                    console.log('[handleLoading] Loading active clip to active video...');
                    // Load the active clip to the active video
                    await loadClipToVideo(
                        activeClip,
                        activeVideoRef,
                        activeVideoIndex === 1 ? setVideo1Clip : setVideo2Clip,
                        activeVideoIndex === 1 ? setVideo1BlobUrl : setVideo2BlobUrl,
                        activeVideoIndex === 1 ? video1BlobUrl : video2BlobUrl
                    );
                }
            } else {
                console.log('[handleLoading] Active clip already loaded in active video - skipping load');
            }

            // Preload next clip to inactive video if available
            const nextClip = getNextClip();
            if (nextClip) {
                const inactiveVideo = inactiveVideoRef.current;
                const isNextClipLoaded = inactiveClipState?.id === nextClip.id &&
                    inactiveVideo?.src &&
                    inactiveVideo.src.startsWith('blob:') &&
                    inactiveVideo.readyState >= 1;

                console.log('[handleLoading] Next clip available:', nextClip.name, 'isNextClipLoaded:', isNextClipLoaded);

                if (!isNextClipLoaded) {
                    console.log('[handleLoading] Preloading next clip to inactive video...');
                    loadClipToVideo(
                        nextClip,
                        inactiveVideoRef,
                        activeVideoIndex === 1 ? setVideo2Clip : setVideo1Clip,
                        activeVideoIndex === 1 ? setVideo2BlobUrl : setVideo1BlobUrl,
                        activeVideoIndex === 1 ? video2BlobUrl : video1BlobUrl
                    );
                } else {
                    console.log('[handleLoading] Next clip already preloaded - skipping');
                }
            } else {
                console.log('[handleLoading] No next clip to preload');
            }

            setDuration(timelineDuration);
            console.log('[handleLoading] COMPLETE - duration set to:', timelineDuration);
        };

        handleLoading();

        return () => {
            cancelled = true;
        };
    }, [activeClip?.id, src, hasContent, timelineDuration]);

    // Handle playback state and video switching
    useEffect(() => {
        const video = activeVideoRef.current;

        console.log('[Playback Effect] Triggered:', {
            isPlaying,
            activeClip: activeClip?.name,
            activeClipState: activeClipState?.name,
            activeVideoIndex,
            hasVideoElement: !!video,
            videoSrc: video?.src,
            videoReadyState: video?.readyState,
            currentTime
        });

        if (!video) {
            console.warn('[Playback Effect] No video element available');
            return;
        }

        if (!video.src) {
            console.warn('[Playback Effect] Video element has no src');
            return;
        }

        // Pause the inactive video
        const inactiveVideo = inactiveVideoRef.current;
        if (inactiveVideo) {
            console.log('[Playback Effect] Pausing inactive video');
            inactiveVideo.pause();
        }

        // Handle playback
        if (isPlaying) {
            console.log('[Playback Effect] User wants to play');
            if (activeClip && activeClipState?.id === activeClip.id) {
                console.log('[Playback Effect] Correct clip is loaded - starting playback');
                // Only try to play if the correct clip is loaded
                const sourceTime = getSourceTimeInClip(activeClip, currentTime);
                console.log('[Playback Effect] Source time calculated:', sourceTime, 'video.currentTime:', video.currentTime);

                if (Math.abs(video.currentTime - sourceTime) > 0.1) {
                    console.log('[Playback Effect] Seeking to:', sourceTime);
                    video.currentTime = sourceTime;
                }

                console.log('[Playback Effect] Calling video.play()...');
                video.play()
                    .then(() => {
                        console.log('[Playback Effect] video.play() SUCCESS');
                    })
                    .catch((err) => {
                        console.error('[Playback Effect] video.play() ERROR:', err);
                        setPlaying(false);
                    });
            } else {
                console.warn('[Playback Effect] Cannot play - clip not loaded yet:', {
                    hasActiveClip: !!activeClip,
                    hasActiveClipState: !!activeClipState,
                    idsMatch: activeClipState?.id === activeClip?.id
                });
            }
        } else {
            console.log('[Playback Effect] User wants to pause');
            video.pause();
        }
    }, [isPlaying, activeVideoIndex, activeClip, activeClipState, currentTime, setPlaying]);

    // Handle seeking (when not playing)
    useEffect(() => {
        if (isPlaying) return; // Don't seek during playback

        const video = activeVideoRef.current;
        if (!video) return;

        if (activeClip && activeClipState?.id === activeClip.id) {
            const sourceTime = getSourceTimeInClip(activeClip, currentTime);
            if (Math.abs(video.currentTime - sourceTime) > 0.1) {
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
                    setCurrentTime(clipEndTime);
                } else {
                    setCurrentTime(timelineTime);
                }
            }
        };

        const handleEnded = () => {
            if (activeClip) {
                // Move to the end of this clip
                const clipEndTime = activeClip.startTime + activeClip.duration;
                setCurrentTime(clipEndTime);

                // Check if we've reached the end of the timeline
                const timelineDuration = getTimelineDuration(clips);
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
        if (!isPlaying || !hasContent) return;

        let animationFrameId: number;
        let lastTime = performance.now();

        const advanceThroughBlankSpace = (currentTimeMs: number) => {
            const deltaTime = (currentTimeMs - lastTime) / 1000; // Convert to seconds
            lastTime = currentTimeMs;

            // Only advance time if we're in a blank space (no active clip)
            if (!activeClip && deltaTime > 0 && deltaTime < 0.1) {
                const newTime = currentTime + deltaTime;
                const timelineDuration = getTimelineDuration(clips);

                if (newTime >= timelineDuration) {
                    // Reached end of timeline
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
}

