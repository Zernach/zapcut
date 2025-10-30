import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    statusText?: string;
}

export function LoadingOverlay({ statusText }: LoadingOverlayProps) {
    return (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            {statusText && (
                <div className="mt-3 text-gray-300 text-sm">
                    {statusText}
                </div>
            )}
        </div>
    );
}

