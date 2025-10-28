import { Clip } from './media';

export interface Track {
    id: string;
    type: 'video' | 'audio' | 'overlay';
    locked: boolean;
    visible: boolean;
    clips: string[]; // clip IDs
}

export interface TimelineState {
    clips: Clip[];
    currentTime: number; // playhead position (seconds)
    duration: number; // total timeline duration
    zoom: number; // pixels per second
    tracks: Track[];
    isPlaying: boolean;
    selectedClipIds: string[];
}

