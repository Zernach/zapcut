import { useState, useCallback, DragEvent } from 'react';
import { useMediaImport } from '../../hooks/useMediaImport';

interface DropZoneProps {
    children: React.ReactNode;
}

export function DropZone({ children }: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const { importFromPaths } = useMediaImport();

    const handleDrop = useCallback(
        async (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);

            if (!event.dataTransfer) return;

            const files: string[] = [];
            for (let i = 0; i < event.dataTransfer.files.length; i++) {
                const file = event.dataTransfer.files[i] as File & { path?: string };
                if (file.path) {
                    files.push(file.path);
                }
            }

            if (files.length > 0) {
                await importFromPaths(files);
            }
        },
        [importFromPaths]
    );

    const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative w-full h-full transition-colors ${isDragging ? 'bg-blue-500/10 border-blue-500' : ''
                }`}
        >
            {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg z-50 pointer-events-none">
                    <p className="text-xl text-white font-medium">Drop videos here</p>
                </div>
            )}
            {children}
        </div>
    );
}

