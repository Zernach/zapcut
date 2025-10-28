import { Clip } from '../types/media';

/**
 * Finds the clip that should be playing at the given timeline time
 * Returns the clip with the highest track index (topmost layer) that contains the time
 */
export function getActiveClipAtTime(clips: Clip[], time: number): Clip | null {
    // Filter clips that contain the current time
    const activeClips = clips.filter(clip => {
        const clipStart = clip.startTime + clip.trimStart;
        const clipEnd = clip.startTime + clip.trimEnd;
        return time >= clipStart && time < clipEnd;
    });

    if (activeClips.length === 0) {
        return null;
    }

    // Return the clip with the highest track index (topmost layer)
    return activeClips.reduce((topClip, currentClip) => {
        return currentClip.trackIndex > topClip.trackIndex ? currentClip : topClip;
    });
}

/**
 * Calculates the source time within a clip based on timeline time
 * Returns the time offset within the original media file
 */
export function getSourceTimeInClip(clip: Clip, timelineTime: number): number {
    const clipStart = clip.startTime + clip.trimStart;
    return timelineTime - clipStart;
}

/**
 * Calculates the total duration of the timeline based on all clips
 */
export function getTimelineDuration(clips: Clip[]): number {
    if (clips.length === 0) return 0;

    return Math.max(...clips.map(clip => clip.startTime + clip.trimEnd));
}

/**
 * Checks if there are any clips on the timeline
 */
export function hasTimelineContent(clips: Clip[]): boolean {
    return clips.length > 0;
}

