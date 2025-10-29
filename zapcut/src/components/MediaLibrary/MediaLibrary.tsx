import { useMediaStore } from '../../store/mediaStore';
import { useTimelineStore } from '../../store/timelineStore';
import { MediaItem as MediaItemComponent } from './MediaItem';
import { DropZone } from './DropZone';
import { SelectedClipToolbox } from './SelectedClipToolbox';
import { useMediaImport } from '../../hooks/useMediaImport';
import { Upload, FileVideo } from 'lucide-react';

interface MediaLibraryProps {
    onExportClick?: () => void;
}

export function MediaLibrary({ onExportClick }: MediaLibraryProps) {
    const items = useMediaStore((state) => state.items);
    const clearMediaSelection = useMediaStore((state) => state.clearSelection);
    const clearTimelineSelection = useTimelineStore((state) => state.clearSelection);
    const { importFromFilePicker, isImporting } = useMediaImport();

    const handleContainerClick = (e: React.MouseEvent) => {
        // Stop propagation to prevent deselecting media when clicking inside the library
        e.stopPropagation();
        // Clear timeline clip selection when clicking in media library
        clearTimelineSelection();
        // Clear media selection when clicking anywhere in the container
        // (MediaItem components stop propagation, so this only fires when not clicking items)
        clearMediaSelection();
    };

    const handleImportClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent deselection
        importFromFilePicker();
    };

    const handleExportClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent deselection
        if (onExportClick) onExportClick();
    };

    return (
        <div className="h-full flex flex-col bg-panel relative" onClick={handleContainerClick}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Media</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm flex items-center gap-2 transition-colors"
                    >
                        <Upload size={16} />
                        Import
                    </button>
                    {onExportClick && (
                        <button
                            onClick={handleExportClick}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-2 transition-colors"
                        >
                            <FileVideo size={16} />
                            Export
                        </button>
                    )}
                </div>
            </div>

            {/* Drop zone and grid */}
            <div className="flex-1 min-h-0">
                <DropZone>
                    <div className="h-full overflow-y-auto p-4">
                        {items.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <Upload size={48} className="mx-auto mb-2 opacity-50" />
                                    <p>No media imported yet</p>
                                    <p className="text-sm">Drag files here or click Import</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {items.map((item) => (
                                    <MediaItemComponent key={item.id} item={item} />
                                ))}
                            </div>
                        )}
                    </div>
                </DropZone>
            </div>

            {/* Selected Clip Toolbox - Absolutely positioned at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
                <div className="pointer-events-auto">
                    <SelectedClipToolbox />
                </div>
            </div>
        </div>
    );
}

