import { create } from 'zustand';
import { MediaItem } from '../types/media';

interface MediaStore {
    items: MediaItem[];
    selectedItemIds: string[];
    isImporting: boolean;

    addItems: (items: MediaItem[]) => void;
    addPlaceholderItems: (placeholders: MediaItem[]) => void;
    updateItemProgress: (id: string, progress: number) => void;
    completeItemLoading: (id: string, completeItem: MediaItem) => void;
    setItemError: (id: string, error: string) => void;
    removeItem: (id: string) => void;
    selectItem: (id: string | null) => void;
    toggleItemSelection: (id: string, multiSelect: boolean) => void;
    clearSelection: () => void;
    setImporting: (importing: boolean) => void;
    clearAll: () => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
    items: [],
    selectedItemIds: [],
    isImporting: false,

    addItems: (items) =>
        set((state) => ({
            items: [...state.items, ...items],
        })),

    addPlaceholderItems: (placeholders) =>
        set((state) => ({
            items: [...state.items, ...placeholders],
        })),

    updateItemProgress: (id, progress) =>
        set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, loadingProgress: progress } : item
            ),
        })),

    completeItemLoading: (id, completeItem) =>
        set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...completeItem, isLoading: false, loadingProgress: undefined } : item
            ),
        })),

    setItemError: (id, error) =>
        set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, isLoading: false, loadingError: error } : item
            ),
        })),

    removeItem: (id) =>
        set((state) => ({
            items: state.items.filter((item) => item.id !== id),
            selectedItemIds: state.selectedItemIds.filter((selectedId) => selectedId !== id),
        })),

    selectItem: (id) => set({ selectedItemIds: id ? [id] : [] }),

    toggleItemSelection: (id, multiSelect) =>
        set((state) => {
            if (multiSelect) {
                // Toggle selection with multi-select mode
                const isSelected = state.selectedItemIds.includes(id);
                if (isSelected) {
                    return {
                        selectedItemIds: state.selectedItemIds.filter((selectedId) => selectedId !== id),
                    };
                } else {
                    return {
                        selectedItemIds: [...state.selectedItemIds, id],
                    };
                }
            } else {
                // Single select mode
                return { selectedItemIds: [id] };
            }
        }),

    clearSelection: () => set({ selectedItemIds: [] }),

    setImporting: (importing) => set({ isImporting: importing }),

    clearAll: () => set({ items: [], selectedItemIds: [] }),
}));

