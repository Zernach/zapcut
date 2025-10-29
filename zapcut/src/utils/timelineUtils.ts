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

/**
 * Calculates if a clip should snap to nearby clip edges
 * Returns the snapped position (in seconds) if within threshold, or null if no snap
 */
export function calculateSnapPoint(
    proposedTime: number,
    draggedClipId: string,
    trackIndex: number,
    clips: Clip[],
    zoom: number,
    snapThresholdPixels: number = 30
): { snapTime: number; snapLinePosition: number } | null {
    // Convert pixel threshold to time threshold based on zoom
    const snapThresholdTime = snapThresholdPixels / zoom;

    // Get the dragged clip's duration
    const draggedClip = clips.find(clip => clip.id === draggedClipId);
    if (!draggedClip) return null;

    // Get all clips on the same track, excluding the dragged clip
    const trackClips = clips.filter(
        clip => clip.trackIndex === trackIndex && clip.id !== draggedClipId
    );

    if (trackClips.length === 0) {
        // Still check snapping to timeline start
        if (Math.abs(proposedTime) < snapThresholdTime) {
            return {
                snapTime: 0,
                snapLinePosition: 0,
            };
        }
        return null;
    }

    // Collect all snap points (clip start and end times)
    const snapPoints: number[] = [];
    trackClips.forEach(clip => {
        snapPoints.push(clip.startTime); // Start edge
        snapPoints.push(clip.startTime + clip.duration); // End edge
    });

    // Also add timeline start (0) as a snap point
    snapPoints.push(0);

    // Check snapping for both start and end of the dragged clip
    let nearestSnapPoint: number | null = null;
    let minDistance = Infinity;
    let snapLinePos: number | null = null;

    // Check snapping the clip's START to snap points
    snapPoints.forEach(snapPoint => {
        const distance = Math.abs(proposedTime - snapPoint);
        if (distance < snapThresholdTime && distance < minDistance) {
            minDistance = distance;
            nearestSnapPoint = snapPoint;
            snapLinePos = snapPoint;
        }
    });

    // Check snapping the clip's END to snap points
    const proposedEndTime = proposedTime + draggedClip.duration;
    snapPoints.forEach(snapPoint => {
        const distance = Math.abs(proposedEndTime - snapPoint);
        if (distance < snapThresholdTime && distance < minDistance) {
            minDistance = distance;
            // Calculate what the start time should be if the end snaps to this point
            nearestSnapPoint = snapPoint - draggedClip.duration;
            snapLinePos = snapPoint;
        }
    });

    if (nearestSnapPoint !== null && snapLinePos !== null) {
        return {
            snapTime: nearestSnapPoint,
            snapLinePosition: snapLinePos,
        };
    }

    return null;
}

