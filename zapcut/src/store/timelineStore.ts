import { create } from 'zustand';
import { Clip } from '../types/media';
import { Track } from '../types/timeline';

interface TimelineStore {
    clips: Clip[];
    tracks: Track[];
    currentTime: number;
    zoom: number;
    selectedClipIds: string[];

    addClip: (clip: Clip) => void;
    removeClip: (id: string) => void;
    updateClip: (id: string, updates: Partial<Clip>) => void;
    setCurrentTime: (time: number) => void;
    setZoom: (zoom: number) => void;
    selectClip: (id: string, multi?: boolean) => void;
    clearSelection: () => void;
    getDuration: () => number;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
    clips: [],
    tracks: [
        { id: 'track-0', type: 'video', locked: false, visible: true, clips: [] },
        { id: 'track-1', type: 'overlay', locked: false, visible: true, clips: [] },
    ],
    currentTime: 0,
    zoom: 20, // 20 pixels per second default
    selectedClipIds: [],

    addClip: (clip) =>
        set((state) => ({
            clips: [...state.clips, clip],
            tracks: state.tracks.map((track) =>
                track.id === `track-${clip.trackIndex}`
                    ? { ...track, clips: [...track.clips, clip.id] }
                    : track
            ),
        })),

    removeClip: (id) =>
        set((state) => ({
            clips: state.clips.filter((c) => c.id !== id),
            tracks: state.tracks.map((track) => ({
                ...track,
                clips: track.clips.filter((cId) => cId !== id),
            })),
            selectedClipIds: state.selectedClipIds.filter((cId) => cId !== id),
        })),

    updateClip: (id, updates) =>
        set((state) => ({
            clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

    setCurrentTime: (time) => set({ currentTime: time }),

    setZoom: (zoom) => set({ zoom: Math.max(1, Math.min(100, zoom)) }),

    selectClip: (id, multi = false) =>
        set((state) => ({
            selectedClipIds: multi
                ? state.selectedClipIds.includes(id)
                    ? state.selectedClipIds.filter((cId) => cId !== id)
                    : [...state.selectedClipIds, id]
                : [id],
        })),

    clearSelection: () => set({ selectedClipIds: [] }),

    getDuration: () => {
        const state = get();
        if (state.clips.length === 0) return 0;
        return Math.max(...state.clips.map((c) => c.startTime + c.duration));
    },
}));

