import { create } from 'zustand';

interface PlayerStore {
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    volume: number;
    isMuted: boolean;

    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setPlaying: (playing: boolean) => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    reset: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    isMuted: false,

    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration: duration }),
    setPlaying: (playing) => set({ isPlaying: playing }),
    setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
    toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
    reset: () =>
        set({
            currentTime: 0,
            duration: 0,
            isPlaying: false,
        }),
}));

