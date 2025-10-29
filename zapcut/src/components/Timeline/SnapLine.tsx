import { Line } from 'react-konva';
import { useTimelineStore } from '../../store/timelineStore';

interface SnapLineProps {
    height: number;
    zoom: number;
}

export function SnapLine({ height, zoom }: SnapLineProps) {
    const { snapLinePosition } = useTimelineStore();

    // Don't render if no snap line position is set
    if (snapLinePosition === null) {
        return null;
    }

    const x = snapLinePosition * zoom;

    return (
        <Line
            points={[x, 0, x, height]}
            stroke="#FCD34D" // Yellow/gold color for visibility
            strokeWidth={2}
            dash={[4, 4]} // Dashed line for better distinction from playhead
            listening={false} // Don't intercept mouse events
        />
    );
}

