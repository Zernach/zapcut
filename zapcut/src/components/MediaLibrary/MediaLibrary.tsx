import { useMediaStore } from '../../store/mediaStore';
import { MediaItem as MediaItemComponent } from './MediaItem';
import { DropZone } from './DropZone';
import { useMediaImport } from '../../hooks/useMediaImport';
import { Upload } from 'lucide-react';

export function MediaLibrary() {
    const items = useMediaStore((state) => state.items);
    const { importFromFilePicker, isImporting } = useMediaImport();

    return (
        <div className="h-full flex flex-col bg-panel">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Media Library</h2>
                <button
                    onClick={importFromFilePicker}
                    disabled={isImporting}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm flex items-center gap-2 transition-colors"
                >
                    <Upload size={16} />
                    Import
                </button>
            </div>

            {/* Drop zone and grid */}
            <DropZone>
                <div className="flex-1 overflow-auto p-4">
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
    );
}

