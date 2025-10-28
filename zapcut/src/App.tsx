import { useState, useEffect } from 'react';
import { MediaLibrary } from './components/MediaLibrary/MediaLibrary';
import { VideoPlayer } from './components/Player/VideoPlayer';
import { PlayerControls } from './components/Player/PlayerControls';
import { Timeline } from './components/Timeline/Timeline';
import { ExportDialog } from './components/Export/ExportDialog';
import { useMediaStore } from './store/mediaStore';
import { useTimelineStore } from './store/timelineStore';
import { usePlayerStore } from './store/playerStore';
import { FileVideo, Plus } from 'lucide-react';

function App() {
    const [showExportDialog, setShowExportDialog] = useState(false);

    const selectedItemId = useMediaStore((state) => state.selectedItemId);
    const items = useMediaStore((state) => state.items);
    const addClip = useTimelineStore((state) => state.addClip);
    const getDuration = useTimelineStore((state) => state.getDuration);
    const setPlayerTime = usePlayerStore((state) => state.setCurrentTime);

    const selectedItem = items.find((item) => item.id === selectedItemId);

    // Synchronize player with timeline playhead
    useEffect(() => {
        let prevTimelineTime = useTimelineStore.getState().currentTime;

        const unsubscribe = useTimelineStore.subscribe((state) => {
            const timelineTime = state.currentTime;
            if (timelineTime !== prevTimelineTime) {
                prevTimelineTime = timelineTime;
                // Only update player if not playing to avoid feedback loop
                if (!usePlayerStore.getState().isPlaying) {
                    setPlayerTime(timelineTime);
                }
            }
        });
        return unsubscribe;
    }, [setPlayerTime]);

    // Synchronize timeline with player
    useEffect(() => {
        let prevPlayerTime = usePlayerStore.getState().currentTime;

        const unsubscribe = usePlayerStore.subscribe((state) => {
            const playerTime = state.currentTime;
            if (playerTime !== prevPlayerTime) {
                prevPlayerTime = playerTime;
                // Only update timeline if playing
                if (usePlayerStore.getState().isPlaying) {
                    useTimelineStore.getState().setCurrentTime(playerTime);
                }
            }
        });
        return unsubscribe;
    }, []);

    const handleAddToTimeline = () => {
        if (!selectedItem) return;

        const currentDuration = getDuration();

        const clip = {
            id: `clip-${Date.now()}`,
            name: selectedItem.name,
            filePath: selectedItem.filePath,
            duration: selectedItem.duration,
            startTime: currentDuration,
            trimStart: 0,
            trimEnd: selectedItem.duration,
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
        };

        addClip(clip);
    };

    return (
        <div className="h-screen flex flex-col bg-background text-white">
            {/* Top toolbar */}
            <div className="h-12 bg-panel border-b border-border flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <FileVideo size={24} className="text-blue-500" />
                    <h1 className="text-lg font-bold">ZapCut</h1>
                </div>

                <div className="flex items-center gap-2">
                    {selectedItem && (
                        <button
                            onClick={handleAddToTimeline}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} />
                            Add to Timeline
                        </button>
                    )}
                    <button
                        onClick={() => setShowExportDialog(true)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2 transition-colors"
                    >
                        <FileVideo size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar: Media library */}
                <div className="w-80 border-r border-border">
                    <MediaLibrary />
                </div>

                {/* Center: Player and Timeline */}
                <div className="flex-1 flex flex-col">
                    {/* Video player */}
                    <div className="flex-1 min-h-0">
                        <VideoPlayer src={selectedItem?.filePath} />
                    </div>

                    {/* Player controls */}
                    <PlayerControls />

                    {/* Timeline */}
                    <div className="h-64 border-t border-border">
                        <Timeline />
                    </div>
                </div>
            </div>

            {/* Export dialog */}
            <ExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} />
        </div>
    );
}

export default App;

