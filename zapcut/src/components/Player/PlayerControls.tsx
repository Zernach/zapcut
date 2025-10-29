import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useMediaStore } from '../../store/mediaStore';
import { formatDuration } from '../../utils/formatUtils';

export function PlayerControls() {
    const {
        currentTime,
        duration,
        isPlaying,
        volume,
        isMuted,
        setPlaying,
        setCurrentTime,
        setVolume,
        toggleMute,
    } = usePlayerStore();

    const clearSelection = useTimelineStore((state) => state.clearSelection);
    const selectedClipIds = useTimelineStore((state) => state.selectedClipIds);
    const clips = useTimelineStore((state) => state.clips);
    const splitClipAtTime = useTimelineStore((state) => state.splitClipAtTime);
    const selectMediaItem = useMediaStore((state) => state.selectItem);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentTime(parseFloat(e.target.value));
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    const handleClick = () => {
        // Clear timeline clip selection and deselect media when clicking on player controls
        clearSelection();
        selectMediaItem(null);
    };

    const handlePlayPause = () => {
        // If at the end of the timeline, restart from beginning
        if (!isPlaying && currentTime >= duration && duration > 0) {
            setCurrentTime(0);
            setPlaying(true);
        } else {
            setPlaying(!isPlaying);
        }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // COMMAND-B (or CTRL-B on Windows/Linux) to split clip
            if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                e.preventDefault();

                // Check if there's exactly one selected clip
                if (selectedClipIds.length !== 1) return;

                const selectedClip = clips.find((c) => c.id === selectedClipIds[0]);
                if (!selectedClip) return;

                // Check if the current time is within the selected clip's bounds
                const clipEndTime = selectedClip.startTime + selectedClip.duration;
                if (currentTime > selectedClip.startTime && currentTime < clipEndTime) {
                    splitClipAtTime(selectedClip.id, currentTime);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipIds, clips, currentTime, splitClipAtTime]);

    return (
        <div className="bg-panel border-t border-border p-3" onClick={handleClick}>
            {/* Seek bar */}
            <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full mb-2 cursor-pointer"
                step={0.01}
            />

            <div className="flex items-center justify-between">
                {/* Left: Play controls */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePlayPause}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <span className="text-sm tabular-nums">
                        {formatDuration(currentTime)} / {formatDuration(duration)}
                    </span>
                </div>

                {/* Right: Volume controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMute}
                        className="p-2 hover:bg-gray-700 rounded transition-colors"
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>

                    <input
                        type="range"
                        min={0}
                        max={1}
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-24 cursor-pointer"
                        step={0.01}
                    />
                </div>
            </div>
        </div>
    );
}

