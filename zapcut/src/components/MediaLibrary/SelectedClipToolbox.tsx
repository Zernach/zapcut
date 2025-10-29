import { useTimelineStore } from '../../store/timelineStore';
import { Film, Clock, Scissors, Layers, Maximize2, Gauge } from 'lucide-react';
import { formatTime } from '../../utils/formatUtils';
import { useState, useEffect } from 'react';

export function SelectedClipToolbox() {
    const clips = useTimelineStore((state) => state.clips);
    const selectedClipIds = useTimelineStore((state) => state.selectedClipIds);
    const updateClip = useTimelineStore((state) => state.updateClip);

    // Get the first selected clip (for single selection)
    const selectedClip = selectedClipIds.length === 1
        ? clips.find((clip) => clip.id === selectedClipIds[0])
        : null;

    // Local speed state for real-time slider updates
    const [localSpeed, setLocalSpeed] = useState<number>(selectedClip?.speed || 1.0);

    // Sync local speed when selected clip changes
    useEffect(() => {
        if (selectedClip) {
            setLocalSpeed(selectedClip.speed || 1.0);
        }
    }, [selectedClip?.id, selectedClip?.speed]);

    if (!selectedClip) {
        return null;
    }

    const trackType = selectedClip.trackIndex === 0 ? 'Video' : 'Overlay';

    // Calculate the original duration (without speed adjustment)
    const baseDuration = selectedClip.originalDuration - selectedClip.trimStart - selectedClip.trimEnd;

    // Calculate the display duration based on current speed
    const displayDuration = baseDuration / localSpeed;

    const handleClick = (e: React.MouseEvent) => {
        // Prevent click from bubbling to MediaLibrary which would clear selection
        e.stopPropagation();
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSpeed = parseFloat(e.target.value);
        setLocalSpeed(newSpeed);

        // Calculate new duration based on speed
        const newDuration = baseDuration / newSpeed;

        // Update the clip in real-time
        updateClip(selectedClip.id, {
            speed: newSpeed,
            duration: newDuration,
        });
    };

    const handleSpeedReset = () => {
        setLocalSpeed(1.0);
        updateClip(selectedClip.id, {
            speed: 1.0,
            duration: baseDuration,
        });
    };

    return (
        <div className="border-t border-border bg-background p-4" onClick={handleClick}>
            <div className="flex items-center gap-2 mb-3">
                <Film size={16} className="text-blue-400" />
                <h3 className="text-sm font-semibold">Selected Clip</h3>
            </div>

            <div className="space-y-2.5">
                {/* Clip Name */}
                <div className="flex items-start gap-2">
                    <div className="text-gray-400 text-xs min-w-[60px] pt-0.5">Name:</div>
                    <div className="text-xs font-medium truncate flex-1" title={selectedClip.name}>
                        {selectedClip.name}
                    </div>
                </div>

                {/* Track */}
                <div className="flex items-center gap-2">
                    <Layers size={12} className="text-gray-400 min-w-[60px]" />
                    <div className="text-xs">
                        <span className="text-gray-400">Track:</span>{' '}
                        <span className="font-medium">{trackType} (Track {selectedClip.trackIndex})</span>
                    </div>
                </div>

                {/* Timeline Position */}
                <div className="flex items-center gap-2">
                    <Clock size={12} className="text-gray-400 min-w-[60px]" />
                    <div className="text-xs">
                        <span className="text-gray-400">Position:</span>{' '}
                        <span className="font-medium">{formatTime(selectedClip.startTime)}</span>
                    </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2">
                    <Clock size={12} className="text-gray-400 min-w-[60px]" />
                    <div className="text-xs">
                        <span className="text-gray-400">Duration:</span>{' '}
                        <span className="font-medium">{formatTime(displayDuration)}</span>
                    </div>
                </div>

                {/* Speed Control */}
                <div className="pt-2 pb-1 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                        <Gauge size={12} className="text-blue-400" />
                        <div className="flex items-center justify-between flex-1">
                            <span className="text-xs text-gray-400">Speed:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{localSpeed.toFixed(2)}x</span>
                                {localSpeed !== 1.0 && (
                                    <button
                                        onClick={handleSpeedReset}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">0.25x</span>
                        <input
                            type="range"
                            min="0.25"
                            max="4"
                            step="0.05"
                            value={localSpeed}
                            onChange={handleSpeedChange}
                            className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((localSpeed - 0.25) / (4 - 0.25)) * 100}%, #374151 ${((localSpeed - 0.25) / (4 - 0.25)) * 100}%, #374151 100%)`
                            }}
                        />
                        <span className="text-[10px] text-gray-500">4.0x</span>
                    </div>
                </div>

                {/* Resolution */}
                <div className="flex items-center gap-2">
                    <Maximize2 size={12} className="text-gray-400 min-w-[60px]" />
                    <div className="text-xs">
                        <span className="text-gray-400">Resolution:</span>{' '}
                        <span className="font-medium">{selectedClip.width}x{selectedClip.height}</span>
                        <span className="text-gray-500 ml-2">@ {selectedClip.fps} fps</span>
                    </div>
                </div>

                {/* Trim Info */}
                {(selectedClip.trimStart > 0 || selectedClip.trimEnd > 0) && (
                    <div className="flex items-start gap-2">
                        <Scissors size={12} className="text-gray-400 min-w-[60px] mt-0.5" />
                        <div className="text-xs">
                            <span className="text-gray-400">Trimmed:</span>{' '}
                            <span className="font-medium">
                                {selectedClip.trimStart > 0 && `Start: ${formatTime(selectedClip.trimStart)}`}
                                {selectedClip.trimStart > 0 && selectedClip.trimEnd > 0 && ', '}
                                {selectedClip.trimEnd > 0 && `End: ${formatTime(selectedClip.trimEnd)}`}
                            </span>
                        </div>
                    </div>
                )}

                {/* Metadata */}
                {selectedClip.metadata && (
                    <div className="pt-2 border-t border-border/50">
                        <div className="text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Codec:</span>
                                <span className="font-medium">{selectedClip.metadata.codec}</span>
                            </div>
                            {selectedClip.metadata.audioCodec && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Audio:</span>
                                    <span className="font-medium">{selectedClip.metadata.audioCodec}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">Bitrate:</span>
                                <span className="font-medium">
                                    {(selectedClip.metadata.bitrate / 1000000).toFixed(2)} Mbps
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400">File Size:</span>
                                <span className="font-medium">
                                    {(selectedClip.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

