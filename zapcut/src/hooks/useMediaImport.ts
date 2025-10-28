import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useMediaStore } from '../store/mediaStore';
import { MediaItem } from '../types/media';

export function useMediaImport() {
    const [isImporting, setIsImporting] = useState(false);
    const addItems = useMediaStore((state) => state.addItems);

    const importFromFilePicker = async () => {
        try {
            setIsImporting(true);

            // Open file picker dialog
            const selected = await open({
                multiple: true,
                filters: [
                    {
                        name: 'Video',
                        extensions: ['mp4', 'mov', 'webm', 'avi', 'mkv'],
                    },
                ],
            });

            if (!selected) {
                return;
            }

            const filePaths = Array.isArray(selected) ? selected : [selected];

            // Import videos via Tauri command
            const items = await invoke<any[]>('import_videos', {
                filePaths,
            });

            // Log raw backend response
            console.log('useMediaImport - Raw backend response:', items);

            // Transform snake_case to camelCase
            const transformedItems: MediaItem[] = items.map(item => {
                console.log('useMediaImport - Processing item:', {
                    id: item.id,
                    name: item.name,
                    file_path: item.file_path,
                    thumbnail_path: item.thumbnail_path
                });

                return {
                    id: item.id,
                    name: item.name,
                    filePath: item.file_path,
                    duration: item.duration,
                    width: item.width,
                    height: item.height,
                    fps: item.fps,
                    thumbnailPath: item.thumbnail_path,
                    fileSize: item.file_size,
                    codec: item.codec,
                    importedAt: item.imported_at,
                };
            });

            console.log('useMediaImport - Transformed items:', transformedItems);
            addItems(transformedItems);
        } catch (error) {
            console.error('Import failed:', error);
            // TODO: Show error toast
        } finally {
            setIsImporting(false);
        }
    };

    const importFromPaths = async (filePaths: string[]) => {
        try {
            setIsImporting(true);

            const items = await invoke<any[]>('import_videos', {
                filePaths,
            });

            // Log raw backend response
            console.log('useMediaImport (importFromPaths) - Raw backend response:', items);

            // Transform snake_case to camelCase
            const transformedItems: MediaItem[] = items.map(item => {
                console.log('useMediaImport (importFromPaths) - Processing item:', {
                    id: item.id,
                    name: item.name,
                    file_path: item.file_path,
                    thumbnail_path: item.thumbnail_path
                });

                return {
                    id: item.id,
                    name: item.name,
                    filePath: item.file_path,
                    duration: item.duration,
                    width: item.width,
                    height: item.height,
                    fps: item.fps,
                    thumbnailPath: item.thumbnail_path,
                    fileSize: item.file_size,
                    codec: item.codec,
                    importedAt: item.imported_at,
                };
            });

            console.log('useMediaImport (importFromPaths) - Transformed items:', transformedItems);
            addItems(transformedItems);
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setIsImporting(false);
        }
    };

    return {
        isImporting,
        importFromFilePicker,
        importFromPaths,
    };
}

