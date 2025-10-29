import { create } from 'zustand';
import { Clip } from '../types/media';
import { Track } from '../types/timeline';

interface TimelineStore {
    clips: Clip[];
    tracks: Track[];
    currentTime: number;
    zoom: number;
    selectedClipIds: string[];
    snapLinePosition: number | null;

    addClip: (clip: Clip) => void;
    removeClip: (id: string) => void;
    updateClip: (id: string, updates: Partial<Clip>) => void;
    setCurrentTime: (time: number) => void;
    setZoom: (zoom: number) => void;
    selectClip: (id: string, multi?: boolean) => void;
    clearSelection: () => void;
    getDuration: () => number;
    setSnapLinePosition: (position: number | null) => void;
    splitClipAtTime: (clipId: string, splitTime: number) => void;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
    clips: [],
    tracks: [
        { id: 'track-0', type: 'video', locked: false, visible: true, clips: [] },
        { id: 'track-1', type: 'overlay', locked: false, visible: true, clips: [] },
    ],
    currentTime: 0,
    zoom: 42, // 42 pixels per second default
    selectedClipIds: [],
    snapLinePosition: null,

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

    setSnapLinePosition: (position) => set({ snapLinePosition: position }),

    splitClipAtTime: (clipId, splitTime) =>
        set((state) => {
            const clip = state.clips.find((c) => c.id === clipId);
            if (!clip) return state;

            // Check if split time is within the clip's bounds
            const clipEndTime = clip.startTime + clip.duration;
            if (splitTime <= clip.startTime || splitTime >= clipEndTime) {
                return state;
            }

            // Calculate the split point relative to the clip's start
            const splitOffset = splitTime - clip.startTime;

            // Create the first clip (from start to split point)
            const firstClip: Clip = {
                ...clip,
                id: `${clip.id}-split-1-${Date.now()}`,
                duration: splitOffset,
                trimEnd: clip.trimEnd + (clip.duration - splitOffset),
            };

            // Create the second clip (from split point to end)
            const secondClip: Clip = {
                ...clip,
                id: `${clip.id}-split-2-${Date.now()}`,
                startTime: splitTime,
                duration: clip.duration - splitOffset,
                trimStart: clip.trimStart + splitOffset,
            };

            // Replace the original clip with the two new clips
            const newClips = state.clips
                .filter((c) => c.id !== clipId)
                .concat([firstClip, secondClip]);

            // Update tracks to replace the old clip ID with the new ones
            const newTracks = state.tracks.map((track) => {
                if (track.id === `track-${clip.trackIndex}`) {
                    return {
                        ...track,
                        clips: track.clips.flatMap((cId) =>
                            cId === clipId ? [firstClip.id, secondClip.id] : [cId]
                        ),
                    };
                }
                return track;
            });

            // Update selection to select both new clips
            const newSelectedClipIds = state.selectedClipIds
                .filter((id) => id !== clipId)
                .concat([firstClip.id, secondClip.id]);

            return {
                clips: newClips,
                tracks: newTracks,
                selectedClipIds: newSelectedClipIds,
            };
        }),
}));

