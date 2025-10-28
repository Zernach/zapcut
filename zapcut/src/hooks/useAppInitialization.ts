import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useAppInitialization() {
    useEffect(() => {
        const initializeApp = async () => {
            try {
                const zapCutDir = await invoke<string>('init_app');
                console.log('Zapcut directory initialized:', zapCutDir);
            } catch (error) {
                console.error('Failed to initialize app directories:', error);
            }
        };

        initializeApp();
    }, []);
}
