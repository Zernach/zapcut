import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useTimelineStore } from '../../store/timelineStore';
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

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentTime(parseFloat(e.target.value));
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVolume(parseFloat(e.target.value));
    };

    const handleClick = () => {
        // Clear timeline clip selection when clicking on player controls
        clearSelection();
    };

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
                        onClick={() => setPlaying(!isPlaying)}
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

