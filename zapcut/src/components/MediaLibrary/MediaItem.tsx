import { useState, useEffect } from 'react';
import { MediaItem as MediaItemType } from '../../types/media';
import { useMediaStore } from '../../store/mediaStore';
import { formatDuration } from '../../utils/formatUtils';
import { invoke } from '@tauri-apps/api/core';
import { X, AlertCircle } from 'lucide-react';
import { LoadingOverlay } from './LoadingOverlay';

interface MediaItemProps {
    item: MediaItemType;
}

export function MediaItem({ item }: MediaItemProps) {
    const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
    const selectedIds = useMediaStore((state) => state.selectedItemIds);
    const toggleItemSelection = useMediaStore((state) => state.toggleItemSelection);
    const removeItem = useMediaStore((state) => state.removeItem);

    const isSelected = selectedIds.includes(item.id);

    // Load thumbnail from backend as base64
    useEffect(() => {
        if (!item.thumbnailPath) {
            return;
        }

        const loadThumbnail = async () => {
            try {
                const base64Data = await invoke<string>('get_thumbnail_base64', {
                    thumbnailPath: item.thumbnailPath,
                });
                setThumbnailSrc(base64Data);
            } catch (error) {
                console.error('MediaItem - Failed to load thumbnail:', error);
                setThumbnailSrc(null);
            }
        };

        loadThumbnail();
    }, [item.thumbnailPath]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to MediaLibrary

        // Don't allow selection while loading
        if (item.isLoading) {
            return;
        }

        // Check for Shift or Command/Meta key for multi-select
        const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
        toggleItemSelection(item.id, isMultiSelect);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Remove this item from library?')) {
            removeItem(item.id);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`relative group rounded-lg overflow-hidden border-2 transition-all ${item.isLoading
                ? 'border-blue-500/50 cursor-wait'
                : item.loadingError
                    ? 'border-red-500 cursor-default'
                    : isSelected
                        ? 'border-blue-500 cursor-pointer'
                        : 'border-transparent hover:border-gray-600 cursor-pointer'
                }`}
        >
            {/* Thumbnail */}
            <div className="aspect-video bg-gray-800 flex items-center justify-center">
                {thumbnailSrc ? (
                    <img src={thumbnailSrc} alt={item.name} className="w-full h-full object-cover" />
                ) : item.isLoading ? (
                    <div className="text-gray-600">Loading...</div>
                ) : item.loadingError ? (
                    <div className="flex flex-col items-center text-red-400">
                        <AlertCircle size={32} className="mb-2" />
                        <div className="text-xs text-center px-2">Failed to load</div>
                    </div>
                ) : (
                    <div className="text-gray-600">No preview</div>
                )}
            </div>

            {/* Loading overlay */}
            {item.isLoading && (
                <LoadingOverlay />
            )}

            {/* Info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {!item.isLoading && !item.loadingError && (
                    <div className="flex justify-between text-xs text-gray-300">
                        <span>{formatDuration(item.duration)}</span>
                        <span>
                            {item.width}x{item.height}
                        </span>
                    </div>
                )}
                {item.loadingError && (
                    <div className="text-xs text-red-400 truncate">{item.loadingError}</div>
                )}
            </div>

            {/* Remove button */}
            {!item.isLoading && (
                <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 rounded p-1"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}

