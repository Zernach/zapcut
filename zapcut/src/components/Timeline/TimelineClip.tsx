import { Group, Rect, Text } from 'react-konva';
import { Clip } from '../../types/media';
import { useTimelineStore } from '../../store/timelineStore';
import { COLORS } from '../../constants/colors';
import { KonvaEventObject } from 'konva/lib/Node';

interface TimelineClipProps {
    clip: Clip;
    zoom: number;
    trackHeight: number;
}

export function TimelineClip({ clip, zoom, trackHeight }: TimelineClipProps) {
    const { selectedClipIds, selectClip, updateClip } = useTimelineStore();

    const isSelected = selectedClipIds.includes(clip.id);
    const x = clip.startTime * zoom;
    const width = clip.duration * zoom;
    const height = trackHeight - 20;
    const y = 10;

    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
        selectClip(clip.id, e.evt.shiftKey);
    };

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
        const newStartTime = Math.max(0, e.target.x() / zoom);
        updateClip(clip.id, { startTime: newStartTime });
    };

    return (
        <Group
            x={x}
            y={y}
            draggable
            onClick={handleClick}
            onDragEnd={handleDragEnd}
            onDragMove={(e) => {
                // Constrain vertical movement
                e.target.y(y);
            }}
        >
            {/* Clip background */}
            <Rect
                width={width}
                height={height}
                fill={isSelected ? COLORS.clipSelected : COLORS.clipDefault}
                cornerRadius={4}
                shadowColor="black"
                shadowBlur={5}
                shadowOpacity={0.3}
            />

            {/* Clip name */}
            <Text
                x={8}
                y={8}
                width={width - 16}
                text={clip.name}
                fontSize={12}
                fill={COLORS.textPrimary}
                ellipsis={true}
                fontFamily="sans-serif"
            />

            {/* Trim handles */}
            {isSelected && (
                <>
                    <Rect x={0} y={0} width={5} height={height} fill={COLORS.clipResizeHandle} opacity={0.8} />
                    <Rect x={width - 5} y={0} width={5} height={height} fill={COLORS.clipResizeHandle} opacity={0.8} />
                </>
            )}
        </Group>
    );
}

