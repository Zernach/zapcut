import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useMediaStore } from '../store/mediaStore';
import { MediaItem } from '../types/media';

export function useMediaImport() {
    const [isImporting, setIsImporting] = useState(false);
    const addPlaceholderItems = useMediaStore((state) => state.addPlaceholderItems);
    const updateItemProgress = useMediaStore((state) => state.updateItemProgress);
    const completeItemLoading = useMediaStore((state) => state.completeItemLoading);
    const setItemError = useMediaStore((state) => state.setItemError);

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

            // Create placeholder items immediately
            const placeholders: MediaItem[] = filePaths.map(filePath => {
                const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown';
                return {
                    id: `loading-${Date.now()}-${Math.random()}`,
                    name: fileName,
                    filePath: filePath,
                    duration: 0,
                    width: 0,
                    height: 0,
                    fps: 0,
                    fileSize: 0,
                    codec: '',
                    importedAt: new Date().toISOString(),
                    isLoading: true,
                    loadingProgress: 0,
                };
            });

            addPlaceholderItems(placeholders);

            // Import each video individually with progress tracking
            await Promise.all(
                filePaths.map(async (filePath, index) => {
                    const placeholderId = placeholders[index].id;
                    try {
                        // Simulate progress updates (0-30% for starting)
                        updateItemProgress(placeholderId, 10);

                        // Call individual import command
                        const item = await invoke<any>('import_video', {
                            filePath,
                        });

                        // Update progress (30-100%)
                        updateItemProgress(placeholderId, 50);

                        // Small delay to show progress
                        await new Promise(resolve => setTimeout(resolve, 100));
                        updateItemProgress(placeholderId, 80);

                        // Transform snake_case to camelCase
                        const transformedItem: MediaItem = {
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

                        updateItemProgress(placeholderId, 100);

                        // Replace placeholder with complete item
                        await new Promise(resolve => setTimeout(resolve, 200));
                        completeItemLoading(placeholderId, transformedItem);
                    } catch (error) {
                        console.error('Import failed for', filePath, ':', error);
                        setItemError(placeholderId, error instanceof Error ? error.message : 'Import failed');
                    }
                })
            );
        } catch (error) {
            console.error('Import failed:', error);
        } finally {
            setIsImporting(false);
        }
    };

    const importFromPaths = async (filePaths: string[]) => {
        try {
            setIsImporting(true);

            // Create placeholder items immediately
            const placeholders: MediaItem[] = filePaths.map(filePath => {
                const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown';
                return {
                    id: `loading-${Date.now()}-${Math.random()}`,
                    name: fileName,
                    filePath: filePath,
                    duration: 0,
                    width: 0,
                    height: 0,
                    fps: 0,
                    fileSize: 0,
                    codec: '',
                    importedAt: new Date().toISOString(),
                    isLoading: true,
                    loadingProgress: 0,
                };
            });

            addPlaceholderItems(placeholders);

            // Import each video individually with progress tracking
            await Promise.all(
                filePaths.map(async (filePath, index) => {
                    const placeholderId = placeholders[index].id;
                    try {
                        // Simulate progress updates (0-30% for starting)
                        updateItemProgress(placeholderId, 10);

                        // Call individual import command
                        const item = await invoke<any>('import_video', {
                            filePath,
                        });

                        // Update progress (30-100%)
                        updateItemProgress(placeholderId, 50);

                        // Small delay to show progress
                        await new Promise(resolve => setTimeout(resolve, 100));
                        updateItemProgress(placeholderId, 80);

                        // Transform snake_case to camelCase
                        const transformedItem: MediaItem = {
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

                        updateItemProgress(placeholderId, 100);

                        // Replace placeholder with complete item
                        await new Promise(resolve => setTimeout(resolve, 200));
                        completeItemLoading(placeholderId, transformedItem);
                    } catch (error) {
                        console.error('Import failed for', filePath, ':', error);
                        setItemError(placeholderId, error instanceof Error ? error.message : 'Import failed');
                    }
                })
            );
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

