import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useTimelineStore } from '../store/timelineStore';

export function usePlayerTimelineSync() {
    // Synchronize player with timeline playhead
    useEffect(() => {
        let prevTimelineTime = useTimelineStore.getState().currentTime;

        const unsubscribe = useTimelineStore.subscribe((state) => {
            const timelineTime = state.currentTime;
            if (timelineTime !== prevTimelineTime) {
                prevTimelineTime = timelineTime;
                // Only update player if not playing to avoid feedback loop
                if (!usePlayerStore.getState().isPlaying) {
                    usePlayerStore.getState().setCurrentTime(timelineTime);
                }
            }
        });
        return unsubscribe;
    }, []);

    // Synchronize timeline with player
    useEffect(() => {
        let prevPlayerTime = usePlayerStore.getState().currentTime;

        const unsubscribe = usePlayerStore.subscribe((state) => {
            const playerTime = state.currentTime;
            if (playerTime !== prevPlayerTime) {
                prevPlayerTime = playerTime;
                // Only update timeline if playing
                if (usePlayerStore.getState().isPlaying) {
                    useTimelineStore.getState().setCurrentTime(playerTime);
                }
            }
        });
        return unsubscribe;
    }, []);
}
