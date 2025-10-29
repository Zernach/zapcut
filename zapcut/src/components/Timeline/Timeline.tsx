import { useRef, useState, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import { useTimelineStore } from '../../store/timelineStore';
import { TimeRuler } from './TimeRuler';
import { Track } from './Track';
import { Playhead } from './Playhead';
import { SnapLine } from './SnapLine';
import { ZoomIn, ZoomOut } from 'lucide-react';

const RULER_HEIGHT = 30;
const TRACK_HEIGHT = 80;

export function Timeline() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [stageWidth, setStageWidth] = useState(1000);

    const { tracks, zoom, currentTime, setZoom, selectedClipIds, removeClip, clearSelection } = useTimelineStore();

    // Resize stage to fit container
    useEffect(() => {
        if (!containerRef.current) return;

        const updateSize = () => {
            if (containerRef.current) {
                setStageWidth(containerRef.current.offsetWidth);
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Handle keyboard shortcuts (backspace to delete selected clips)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Delete selected clips on backspace or delete key
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedClipIds.length > 0) {
                // Prevent default browser behavior (like navigating back)
                e.preventDefault();

                // Delete all selected clips
                selectedClipIds.forEach((clipId) => {
                    removeClip(clipId);
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedClipIds, removeClip]);

    const totalHeight = RULER_HEIGHT + tracks.length * TRACK_HEIGHT;

    const handleZoomIn = () => {
        setZoom(Math.min(zoom * 1.2, 100));
    };

    const handleZoomOut = () => {
        setZoom(Math.max(zoom / 1.2, 5));
    };

    const handleStageClick = (e: any) => {
        // Only clear selection if clicking on the stage itself (not on any shape)
        if (e.target === e.target.getStage()) {
            clearSelection();
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Toolbar */}
            <div className="h-10 bg-panel border-b border-border flex items-center px-4 gap-2">
                <span className="text-sm text-gray-400">Timeline</span>
                <div className="flex-1" />
                <button
                    onClick={handleZoomOut}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Zoom Out"
                >
                    <ZoomOut size={18} />
                </button>
                <span className="text-xs text-gray-500">{Math.round(zoom)}px/s</span>
                <button
                    onClick={handleZoomIn}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Zoom In"
                >
                    <ZoomIn size={18} />
                </button>
            </div>

            {/* Timeline canvas */}
            <div ref={containerRef} className="flex-1 overflow-auto">
                <Stage width={stageWidth} height={totalHeight} onClick={handleStageClick}>
                    <Layer>
                        {/* Time ruler */}
                        <TimeRuler width={stageWidth} height={RULER_HEIGHT} zoom={zoom} />

                        {/* Tracks */}
                        {tracks.map((track, index) => (
                            <Track
                                key={track.id}
                                track={track}
                                y={RULER_HEIGHT + index * TRACK_HEIGHT}
                                width={stageWidth}
                                height={TRACK_HEIGHT}
                                zoom={zoom}
                            />
                        ))}

                        {/* Snap line (rendered above clips but below playhead) */}
                        <SnapLine height={totalHeight} zoom={zoom} />

                        {/* Playhead */}
                        <Playhead currentTime={currentTime} height={totalHeight} zoom={zoom} />
                    </Layer>
                </Stage>
            </div>
        </div>
    );
}

