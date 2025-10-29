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

            // Transform snake_case to camelCase
            const transformedItems: MediaItem[] = items.map(item => {
                return {
                    id: item.id,
                    name: item.name,
                    filePath: item.file_path,
                    proxyPath: item.proxy_path,
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

            // Transform snake_case to camelCase
            const transformedItems: MediaItem[] = items.map(item => {
                return {
                    id: item.id,
                    name: item.name,
                    filePath: item.file_path,
                    proxyPath: item.proxy_path,
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

