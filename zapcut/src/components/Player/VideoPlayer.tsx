import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useMediaStore } from '../../store/mediaStore';
import { invoke } from '@tauri-apps/api/core';
import { getActiveClipAtTime, getSourceTimeInClip, getTimelineDuration, hasTimelineContent } from '../../utils/timelineUtils';
import { Plus, Check } from 'lucide-react';

interface VideoPlayerProps {
    src?: string;
    autoPlay?: boolean;
}

export function VideoPlayer({ src, autoPlay = false }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
    const [showAddedFeedback, setShowAddedFeedback] = useState(false);
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

    const selectedItemId = useMediaStore((state) => state.selectedItemId);
    const items = useMediaStore((state) => state.items);
    const selectedItem = items.find((item) => item.id === selectedItemId);

    // Determine which clip should be playing at current time
    const activeClip = getActiveClipAtTime(clips, currentTime);
    const timelineDuration = getTimelineDuration(clips);
    const hasContent = hasTimelineContent(clips);


    // Load video source based on timeline content
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        if (activeClip) {
            // Validate file path
            if (!activeClip.filePath) {
                console.error('Active clip has no file path:', activeClip);
                return;
            }

            // Load video from backend and create blob URL
            const loadVideoFromBackend = async () => {
                try {
                    console.log('VideoPlayer - Loading video from backend:', activeClip.filePath);

                    // Revoke previous blob URL if exists
                    if (videoBlobUrl) {
                        URL.revokeObjectURL(videoBlobUrl);
                    }

                    // Read video file from backend
                    const videoData = await invoke<number[]>('read_video_file', {
                        filePath: activeClip.filePath,
                    });

                    // Convert to Uint8Array and create blob
                    const uint8Array = new Uint8Array(videoData);
                    const blob = new Blob([uint8Array], { type: 'video/mp4' });
                    const blobUrl = URL.createObjectURL(blob);

                    console.log('VideoPlayer - Created blob URL');
                    setVideoBlobUrl(blobUrl);

                    // Set video source
                    video.src = blobUrl;
                    video.load();

                    const handleLoadedMetadata = () => {
                        // Set duration to timeline duration, not individual clip duration
                        setDuration(timelineDuration);

                        // If we were playing, resume playback after loading
                        if (isPlaying) {
                            video.play().catch((err) => {
                                console.error('Play error after load:', err);
                                setPlaying(false);
                            });
                        }
                    };

                    video.addEventListener('loadedmetadata', handleLoadedMetadata);

                    return () => {
                        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    };
                } catch (error) {
                    console.error('Failed to load video from backend:', error);
                    setPlaying(false);
                }
            };

            loadVideoFromBackend();
        } else if (hasContent) {
            // Timeline has content but no active clip at current time
            // Clear the video source
            video.src = '';
            video.load();
            setDuration(timelineDuration);
        } else {
            // No timeline content, fall back to selected media item
            if (src) {
                // Load video from backend and create blob URL
                const loadVideoFromBackend = async () => {
                    try {
                        console.log('VideoPlayer - Loading fallback video from backend:', src);

                        // Revoke previous blob URL if exists
                        if (videoBlobUrl) {
                            URL.revokeObjectURL(videoBlobUrl);
                        }

                        // Read video file from backend
                        const videoData = await invoke<number[]>('read_video_file', {
                            filePath: src,
                        });

                        // Convert to Uint8Array and create blob
                        const uint8Array = new Uint8Array(videoData);
                        const blob = new Blob([uint8Array], { type: 'video/mp4' });
                        const blobUrl = URL.createObjectURL(blob);

                        console.log('VideoPlayer - Created fallback blob URL');
                        setVideoBlobUrl(blobUrl);

                        // Set video source
                        video.src = blobUrl;
                        video.load();

                        const handleLoadedMetadata = () => {
                            setDuration(video.duration);

                            // If we were playing, resume playback after loading
                            if (isPlaying) {
                                video.play().catch((err) => {
                                    console.error('Play error after load:', err);
                                    setPlaying(false);
                                });
                            }
                        };

                        video.addEventListener('loadedmetadata', handleLoadedMetadata);

                        return () => {
                            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                        };
                    } catch (error) {
                        console.error('Failed to load fallback video from backend:', error);
                        setPlaying(false);
                    }
                };

                loadVideoFromBackend();
            } else {
                video.src = '';
                video.load();
                setDuration(0);
            }
        }
    }, [activeClip, src, timelineDuration, hasContent, setDuration, isPlaying, setPlaying]);

    // Handle playback state (pause only - play is handled when sources load)
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        // Only pause, play is handled when the source loads
        if (!isPlaying) {
            video.pause();
        }
    }, [isPlaying]);

    // Handle volume
    useEffect(() => {
        if (!videoRef.current) return;
        videoRef.current.volume = volume;
    }, [volume]);

    // Handle mute
    useEffect(() => {
        if (!videoRef.current) return;
        videoRef.current.muted = isMuted;
    }, [isMuted]);

    // Handle seeking
    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        if (activeClip) {
            // Calculate the source time within the active clip
            const sourceTime = getSourceTimeInClip(activeClip, currentTime);

            // Only seek if difference is significant (avoid feedback loop)
            if (Math.abs(video.currentTime - sourceTime) > 0.1) {
                video.currentTime = sourceTime;
            }
        } else {
            // No active clip, seek to timeline time directly
            if (Math.abs(video.currentTime - currentTime) > 0.1) {
                video.currentTime = currentTime;
            }
        }
    }, [currentTime, activeClip]);

    // Update current time during playback
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        const handleTimeUpdate = () => {
            if (activeClip) {
                // Convert source time back to timeline time
                const sourceTime = video.currentTime;
                const timelineTime = activeClip.startTime + activeClip.trimStart + sourceTime;
                setCurrentTime(timelineTime);
            } else {
                // No active clip, use video time directly
                setCurrentTime(video.currentTime);
            }
        };

        const handleEnded = () => {
            if (activeClip) {
                // Check if we've reached the end of the timeline
                const timelineDuration = getTimelineDuration(clips);
                if (currentTime >= timelineDuration) {
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
    }, [setCurrentTime, setPlaying, activeClip, currentTime, clips, setDuration]);

    // Clean up blob URLs on unmount
    useEffect(() => {
        return () => {
            if (videoBlobUrl) {
                URL.revokeObjectURL(videoBlobUrl);
            }
        };
    }, [videoBlobUrl]);

    // Determine what to display
    const shouldShowVideo = activeClip || (!hasContent && src);
    const displayMessage = hasContent && !activeClip ? 'No content at current time' : 'No video selected';

    // Clear timeline clip selection and deselect media when clicking on video player
    const clearSelection = useTimelineStore((state) => state.clearSelection);
    const selectMediaItem = useMediaStore((state) => state.selectItem);
    const handleClick = () => {
        clearSelection();
        selectMediaItem(null);
    };

    // Handle adding selected media item to timeline
    const handleAddToTimeline = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent click from bubbling to video player
        if (!selectedItem) return;
        const currentDuration = getDuration();
        const clip = {
            id: `clip-${Date.now()}`,
            name: selectedItem.name,
            filePath: selectedItem.filePath,
            duration: selectedItem.duration,
            originalDuration: selectedItem.duration,
            startTime: currentDuration,
            trimStart: 0,
            trimEnd: 0,
            trackIndex: 0,
            width: selectedItem.width,
            height: selectedItem.height,
            fps: selectedItem.fps,
            thumbnailPath: selectedItem.thumbnailPath,
            metadata: {
                codec: selectedItem.codec,
                bitrate: 0,
                fileSize: selectedItem.fileSize,
                createdAt: new Date(),
            },
            speed: 1.0,
        };
        addClip(clip);

        // Show "Added!" feedback
        setShowAddedFeedback(true);
        setTimeout(() => {
            setShowAddedFeedback(false);
        }, 1000);

        selectMediaItem(null); // Deselect media after adding to timeline
    };

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center" onClick={handleClick}>
            {/* Add to Timeline Button - Only visible when media library item is selected */}
            {selectedItem && (
                <button
                    onClick={handleAddToTimeline}
                    className="absolute top-4 left-4 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-2 transition-colors z-10 shadow-lg"
                >
                    <Plus size={16} />
                    Add to Timeline
                </button>
            )}

            {/* "Added!" feedback message */}
            {showAddedFeedback && (
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-transparent rounded text-sm flex items-center gap-1.5 z-10 text-green-400 font-medium">
                    <Check size={16} />
                    Added!
                </div>
            )}

            {shouldShowVideo ? (
                <video ref={videoRef} className="max-w-full max-h-full" autoPlay={autoPlay} />
            ) : (
                <div className="text-gray-500">{displayMessage}</div>
            )}
        </div>
    );
}

