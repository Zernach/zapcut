import { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useTimelineStore } from '../../store/timelineStore';
import { invoke } from '@tauri-apps/api/core';
import { getActiveClipAtTime, getSourceTimeInClip, getTimelineDuration, hasTimelineContent } from '../../utils/timelineUtils';

interface VideoPlayerProps {
    src?: string;
    autoPlay?: boolean;
}

export function VideoPlayer({ src, autoPlay = false }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
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

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {shouldShowVideo ? (
                <video ref={videoRef} className="max-w-full max-h-full" autoPlay={autoPlay} />
            ) : (
                <div className="text-gray-500">{displayMessage}</div>
            )}
        </div>
    );
}

