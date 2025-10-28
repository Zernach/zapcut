import { useRef, useState, useEffect } from 'react';
import { Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { Clip } from '../../types/media';
import { useTimelineStore } from '../../store/timelineStore';
import { COLORS } from '../../constants/colors';
import { KonvaEventObject } from 'konva/lib/Node';

interface TimelineClipProps {
    clip: Clip;
    zoom: number;
    trackHeight: number;
}

type TrimHandle = 'start' | 'end' | null;

interface TrimState {
    trimStart: number;
    trimEnd: number;
    startTime: number;
    duration: number;
}

export function TimelineClip({ clip, zoom, trackHeight }: TimelineClipProps) {
    const { selectedClipIds, selectClip, updateClip } = useTimelineStore();
    const groupRef = useRef<Konva.Group>(null);

    // Trim drag state
    const [isDraggingTrim, setIsDraggingTrim] = useState<TrimHandle>(null);
    const [isHoveringStart, setIsHoveringStart] = useState(false);
    const [isHoveringEnd, setIsHoveringEnd] = useState(false);

    // Local state for smooth real-time visual feedback during drag
    const [localTrimState, setLocalTrimState] = useState<TrimState | null>(null);

    // Reference data captured on drag start
    const dragStart = useRef<{
        mouseX: number;
        originalClip: Clip;
    } | null>(null);

    const isSelected = selectedClipIds.includes(clip.id);

    // Use local state during drag, otherwise use clip state
    const displayState = localTrimState || {
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd,
        startTime: clip.startTime,
        duration: clip.duration,
    };

    const x = displayState.startTime * zoom;
    const width = displayState.duration * zoom;
    const height = trackHeight - 20;
    const y = 10;

    // Reset local state when not dragging
    useEffect(() => {
        if (!isDraggingTrim) {
            setLocalTrimState(null);
        }
    }, [isDraggingTrim]);

    const handleClick = (e: KonvaEventObject<MouseEvent>) => {
        if (isDraggingTrim) return;
        selectClip(clip.id, e.evt.shiftKey);
    };

    const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
        if (isDraggingTrim) return;
        const newStartTime = Math.max(0, e.target.x() / zoom);
        updateClip(clip.id, { startTime: newStartTime });
    };

    // Get mouse position relative to stage
    const getStageMouseX = (): number | null => {
        const stage = groupRef.current?.getStage();
        if (!stage) return null;
        const pointerPos = stage.getPointerPosition();
        return pointerPos?.x || null;
    };

    // Trim handle drag handlers
    const handleTrimStartMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        const mouseX = getStageMouseX();
        if (mouseX === null) return;

        setIsDraggingTrim('start');
        dragStart.current = {
            mouseX,
            originalClip: { ...clip },
        };
    };

    const handleTrimEndMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        const mouseX = getStageMouseX();
        if (mouseX === null) return;

        setIsDraggingTrim('end');
        dragStart.current = {
            mouseX,
            originalClip: { ...clip },
        };
    };

    const handleTrimMouseMove = () => {
        if (!isDraggingTrim || !dragStart.current) return;

        const currentMouseX = getStageMouseX();
        if (currentMouseX === null) return;

        // Calculate how far the mouse has moved in pixels
        const deltaPixels = currentMouseX - dragStart.current.mouseX;
        const deltaTime = deltaPixels / zoom;

        const original = dragStart.current.originalClip;
        const minDuration = 0.1; // Minimum clip duration in seconds

        if (isDraggingTrim === 'start') {
            // LEFT HANDLE: Drag right to trim start, drag left to reveal more content
            // Positive deltaTime = dragging right = increase trimStart = shorter clip
            // Negative deltaTime = dragging left = decrease trimStart = longer clip

            const newTrimStart = original.trimStart + deltaTime;

            // Constraints:
            // 1. Can't trim before 0 (start of media)
            // 2. Can't trim past the end (must leave room for trimEnd + minDuration)
            const maxTrimStart = original.originalDuration - original.trimEnd - minDuration;
            const constrainedTrimStart = Math.max(0, Math.min(newTrimStart, maxTrimStart));

            // Calculate new values
            const trimDelta = constrainedTrimStart - original.trimStart;
            const newDuration = original.duration - trimDelta;
            const newStartTime = original.startTime + trimDelta;

            // Update local state for smooth visual feedback
            setLocalTrimState({
                trimStart: constrainedTrimStart,
                trimEnd: original.trimEnd,
                duration: newDuration,
                startTime: Math.max(0, newStartTime),
            });

        } else if (isDraggingTrim === 'end') {
            // RIGHT HANDLE: Drag left to trim end, drag right to reveal more content
            // Positive deltaTime = dragging right = decrease trimEnd = longer clip
            // Negative deltaTime = dragging left = increase trimEnd = shorter clip

            const newTrimEnd = original.trimEnd - deltaTime;

            // Constraints:
            // 1. Can't trim before 0 (end of media)
            // 2. Can't trim past the start (must leave room for trimStart + minDuration)
            const maxTrimEnd = original.originalDuration - original.trimStart - minDuration;
            const constrainedTrimEnd = Math.max(0, Math.min(newTrimEnd, maxTrimEnd));

            // Calculate new duration
            // Key: increasing trimEnd DECREASES playable duration
            // duration = originalDuration - trimStart - trimEnd
            const trimDelta = constrainedTrimEnd - original.trimEnd;
            const newDuration = original.duration - trimDelta;

            // Update local state for smooth visual feedback
            setLocalTrimState({
                trimStart: original.trimStart,
                trimEnd: constrainedTrimEnd,
                duration: newDuration,
                startTime: original.startTime,
            });
        }
    };

    const handleTrimMouseUp = () => {
        // Commit the trim to the store
        if (localTrimState && dragStart.current) {
            updateClip(clip.id, {
                trimStart: localTrimState.trimStart,
                trimEnd: localTrimState.trimEnd,
                duration: localTrimState.duration,
                startTime: localTrimState.startTime,
            });
        }

        // Reset drag state
        setIsDraggingTrim(null);
        dragStart.current = null;
    };

    // Cursor management
    const handleTrimStartMouseEnter = () => {
        setIsHoveringStart(true);
        const stage = document.querySelector('canvas');
        if (stage) stage.style.cursor = 'ew-resize';
    };

    const handleTrimStartMouseLeave = () => {
        setIsHoveringStart(false);
        if (!isDraggingTrim) {
            const stage = document.querySelector('canvas');
            if (stage) stage.style.cursor = 'default';
        }
    };

    const handleTrimEndMouseEnter = () => {
        setIsHoveringEnd(true);
        const stage = document.querySelector('canvas');
        if (stage) stage.style.cursor = 'ew-resize';
    };

    const handleTrimEndMouseLeave = () => {
        setIsHoveringEnd(false);
        if (!isDraggingTrim) {
            const stage = document.querySelector('canvas');
            if (stage) stage.style.cursor = 'default';
        }
    };

    return (
        <Group
            ref={groupRef}
            x={x}
            y={y}
            draggable={!isDraggingTrim}
            onClick={handleClick}
            onDragEnd={handleDragEnd}
            onDragMove={(e) => {
                // Constrain vertical movement
                e.target.y(y);
            }}
            onMouseMove={handleTrimMouseMove}
            onMouseUp={handleTrimMouseUp}
            onMouseLeave={handleTrimMouseUp}
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
                width={Math.max(0, width - 16)}
                text={clip.name}
                fontSize={12}
                fill={COLORS.textPrimary}
                ellipsis={true}
                fontFamily="sans-serif"
            />

            {/* Trim handles - larger hit area for better UX */}
            {isSelected && (
                <>
                    {/* Left trim handle */}
                    <Rect
                        x={0}
                        y={0}
                        width={10}
                        height={height}
                        fill={COLORS.clipResizeHandle}
                        opacity={isHoveringStart || isDraggingTrim === 'start' ? 1 : 0.7}
                        onMouseDown={handleTrimStartMouseDown}
                        onMouseEnter={handleTrimStartMouseEnter}
                        onMouseLeave={handleTrimStartMouseLeave}
                        cornerRadius={[4, 0, 0, 4]}
                    />

                    {/* Right trim handle */}
                    <Rect
                        x={width - 10}
                        y={0}
                        width={10}
                        height={height}
                        fill={COLORS.clipResizeHandle}
                        opacity={isHoveringEnd || isDraggingTrim === 'end' ? 1 : 0.7}
                        onMouseDown={handleTrimEndMouseDown}
                        onMouseEnter={handleTrimEndMouseEnter}
                        onMouseLeave={handleTrimEndMouseLeave}
                        cornerRadius={[0, 4, 4, 0]}
                    />
                </>
            )}
        </Group>
    );
}

