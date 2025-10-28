import { Plus, Radio } from 'lucide-react';
import { useMediaStore } from '../../store/mediaStore';
import { useTimelineStore } from '../../store/timelineStore';
import { useAppStore } from '../../store/appStore';

export const TopToolbar = () => {
    const activeTab = useAppStore((state) => state.activeTab);
    const setActiveTab = useAppStore((state) => state.setActiveTab);
    const selectedItemId = useMediaStore((state) => state.selectedItemId);
    const items = useMediaStore((state) => state.items);
    const addClip = useTimelineStore((state) => state.addClip);
    const getDuration = useTimelineStore((state) => state.getDuration);
    const selectedItem = items.find((item) => item.id === selectedItemId);

    const handleAddToTimeline = () => {
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
        };
        addClip(clip);
    };

    return (
        <div
            className="h-12 bg-panel border-b border-border flex items-center px-4 justify-between"
            data-tauri-drag-region
            style={{ WebkitAppRegion: 'drag', userSelect: 'none' } as React.CSSProperties}
        >
            <div
                className="flex items-center gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <img src="/zapcut-app-icon.jpg" alt="ZapCut" className="h-8 w-8 rounded" />
                <h1 className="text-lg font-bold">ZapCut</h1>
            </div>

            <div
                className="flex items-center gap-4"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-background rounded p-1">
                    <button
                        onClick={() => setActiveTab('edit')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'edit'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => setActiveTab('record')}
                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors ${activeTab === 'record'
                            ? 'bg-red-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Radio size={14} />
                        Record
                    </button>
                </div>

                {/* Action buttons */}
                {activeTab === 'edit' && (
                    <>
                        {selectedItem && (
                            <button
                                onClick={handleAddToTimeline}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-2 transition-colors"
                            >
                                <Plus size={16} />
                                Add to Timeline
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
