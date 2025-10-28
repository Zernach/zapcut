import { create } from 'zustand';

interface AppStore {
    activeTab: 'edit' | 'record';
    showExportDialog: boolean;

    setActiveTab: (tab: 'edit' | 'record') => void;
    setShowExportDialog: (show: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
    activeTab: 'edit',
    showExportDialog: false,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setShowExportDialog: (show) => set({ showExportDialog: show }),
}));
