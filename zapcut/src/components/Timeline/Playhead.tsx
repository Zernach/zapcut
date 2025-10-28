import { Group, Line, Rect } from 'react-konva';
import { useTimelineStore } from '../../store/timelineStore';
import { COLORS } from '../../constants/colors';
import { KonvaEventObject } from 'konva/lib/Node';

interface PlayheadProps {
    currentTime: number;
    height: number;
    zoom: number;
}

export function Playhead({ currentTime, height, zoom }: PlayheadProps) {
    const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);

    const x = currentTime * zoom;

    const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
        const newTime = Math.max(0, e.target.x() / zoom);
        setCurrentTime(newTime);
        // Constrain to horizontal movement only
        e.target.y(0);
    };

    return (
        <Group x={x} y={0} draggable onDragMove={handleDragMove}>
            {/* Playhead handle */}
            <Rect x={-6} y={0} width={12} height={20} fill={COLORS.playheadFill} cornerRadius={[0, 0, 4, 4]} />

            {/* Playhead line */}
            <Line points={[0, 20, 0, height]} stroke={COLORS.playheadStroke} strokeWidth={2} />
        </Group>
    );
}

