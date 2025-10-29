import { Radio } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useMediaStore } from '../../store/mediaStore';

export const TopToolbar = () => {
    const activeTab = useAppStore((state) => state.activeTab);
    const setActiveTab = useAppStore((state) => state.setActiveTab);
    const selectItem = useMediaStore((state) => state.selectItem);

    return (
        <div
            className="h-12 bg-panel border-b border-border flex items-center px-4 justify-between"
            data-tauri-drag-region
            style={{ WebkitAppRegion: 'drag', userSelect: 'none' } as React.CSSProperties}
        >
            <div
                className="flex items-center gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <img src="/zapcut-app-icon.jpg" alt="ZapCut" className="h-8 w-8 rounded" />
                <h1 className="text-lg font-bold">ZapCut</h1>
            </div>

            <div
                className="flex items-center gap-4"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                {/* Tabs */}
                <div className="flex items-center gap-1 bg-background rounded p-1">
                    <button
                        onClick={() => {
                            setActiveTab('edit');
                            selectItem(null); // Deselect media when switching tabs
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${activeTab === 'edit'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('record');
                            selectItem(null); // Deselect media when switching tabs
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors ${activeTab === 'record'
                            ? 'bg-red-600 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <Radio size={14} />
                        Record
                    </button>
                </div>
            </div>
        </div>
    );
};
