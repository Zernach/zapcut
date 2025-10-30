import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useAppInitialization() {
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Small delay to ensure Tauri is fully initialized
                await new Promise(resolve => setTimeout(resolve, 100));

                await invoke<string>('init_app');
            } catch (error) {
                console.error('Failed to initialize app directories:', error);
                // Log more specific error info for debugging
                if (error instanceof Error) {
                    console.error('Error details:', error.message, error.stack);
                }
            }
        };

        initializeApp();
    }, []);
}
