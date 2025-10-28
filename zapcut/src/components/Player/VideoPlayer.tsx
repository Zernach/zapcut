import { useRef, useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { convertFileSrc } from '@tauri-apps/api/core';

interface VideoPlayerProps {
    src?: string;
    autoPlay?: boolean;
}

export function VideoPlayer({ src, autoPlay = false }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const {
        currentTime,
        isPlaying,
        volume,
        isMuted,
        setCurrentTime,
        setDuration,
        setPlaying,
    } = usePlayerStore();

    // Load video source
    useEffect(() => {
        if (!videoRef.current || !src) return;

        const video = videoRef.current;
        const convertedSrc = convertFileSrc(src);
        video.src = convertedSrc;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
    }, [src, setDuration]);

    // Handle playback state
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        if (isPlaying) {
            video.play().catch(console.error);
        } else {
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

        // Only seek if difference is significant (avoid feedback loop)
        if (Math.abs(video.currentTime - currentTime) > 0.1) {
            video.currentTime = currentTime;
        }
    }, [currentTime]);

    // Update current time during playback
    useEffect(() => {
        if (!videoRef.current) return;

        const video = videoRef.current;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const handleEnded = () => {
            setPlaying(false);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [setCurrentTime, setPlaying]);

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
            {src ? (
                <video ref={videoRef} className="max-w-full max-h-full" autoPlay={autoPlay} />
            ) : (
                <div className="text-gray-500">No video selected</div>
            )}
        </div>
    );
}

