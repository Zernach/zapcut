import { Clip } from '../types/media';

/**
 * Finds the clip that should be playing at the given timeline time
 * Returns the clip with the highest track index (topmost layer) that contains the time
 */
export function getActiveClipAtTime(clips: Clip[], time: number): Clip | null {
    // Filter clips that contain the current time
    const activeClips = clips.filter(clip => {
        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
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
 * Returns the time offset within the original media file (accounting for trim)
 */
export function getSourceTimeInClip(clip: Clip, timelineTime: number): number {
    // Calculate how far into the clip we are on the timeline
    const offsetInClip = timelineTime - clip.startTime;

    // Add the trimStart to get the actual source time in the original media
    const sourceTime = clip.trimStart + offsetInClip;

    return sourceTime;
}

/**
 * Calculates the total duration of the timeline based on all clips
 */
export function getTimelineDuration(clips: Clip[]): number {
    if (clips.length === 0) return 0;

    return Math.max(...clips.map(clip => clip.startTime + clip.duration));
}

/**
 * Checks if there are any clips on the timeline
 */
export function hasTimelineContent(clips: Clip[]): boolean {
    return clips.length > 0;
}

