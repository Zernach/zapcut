import { create } from 'zustand';
import { MediaItem } from '../types/media';

interface MediaStore {
    items: MediaItem[];
    selectedItemId: string | null;
    isImporting: boolean;

    addItems: (items: MediaItem[]) => void;
    removeItem: (id: string) => void;
    selectItem: (id: string | null) => void;
    setImporting: (importing: boolean) => void;
    clearAll: () => void;
}

export const useMediaStore = create<MediaStore>((set) => ({
    items: [],
    selectedItemId: null,
    isImporting: false,

    addItems: (items) =>
        set((state) => ({
            items: [...state.items, ...items],
        })),

    removeItem: (id) =>
        set((state) => ({
            items: state.items.filter((item) => item.id !== id),
            selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        })),

    selectItem: (id) => set({ selectedItemId: id }),

    setImporting: (importing) => set({ isImporting: importing }),

    clearAll: () => set({ items: [], selectedItemId: null }),
}));

