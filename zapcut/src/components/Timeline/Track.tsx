import { Group, Rect, Text } from 'react-konva';
import { Track as TrackType } from '../../types/timeline';
import { useTimelineStore } from '../../store/timelineStore';
import { TimelineClip } from './TimelineClip';

interface TrackProps {
    track: TrackType;
    y: number;
    width: number;
    height: number;
    zoom: number;
}

export function Track({ track, y, width, height, zoom }: TrackProps) {
    const clips = useTimelineStore((state) =>
        state.clips.filter((clip) => track.clips.includes(clip.id))
    );

    return (
        <Group y={y}>
            {/* Track background */}
            <Rect x={0} y={0} width={width} height={height} fill="#1e1e1e" />

            {/* Track label */}
            <Text
                x={8}
                y={8}
                text={track.type.toUpperCase()}
                fontSize={11}
                fill="#888"
                fontFamily="sans-serif"
            />

            {/* Clips */}
            {clips.map((clip) => (
                <TimelineClip key={clip.id} clip={clip} zoom={zoom} trackHeight={height} />
            ))}

            {/* Bottom border */}
            <Rect x={0} y={height - 1} width={width} height={1} fill="#3d3d3d" />
        </Group>
    );
}

