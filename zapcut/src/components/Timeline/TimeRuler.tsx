import { Group, Rect, Line, Text } from 'react-konva';

interface TimeRulerProps {
    width: number;
    height: number;
    zoom: number;
}

export function TimeRuler({ width, height, zoom }: TimeRulerProps) {
    const interval = zoom < 10 ? 5 : zoom < 20 ? 2 : 1; // Major tick every N seconds
    const majorTicks: number[] = [];
    const minorTicks: number[] = [];

    // Generate ticks
    for (let i = 0; i < width / zoom; i += interval) {
        majorTicks.push(i);
        // Add minor ticks between major ticks
        for (let j = 1; j < interval; j++) {
            minorTicks.push(i + j);
        }
    }

    return (
        <Group>
            {/* Background */}
            <Rect x={0} y={0} width={width} height={height} fill="#2d2d2d" />

            {/* Major ticks and labels */}
            {majorTicks.map((time) => {
                const x = time * zoom;
                return (
                    <Group key={`major-${time}`}>
                        <Line points={[x, height - 10, x, height]} stroke="#888" strokeWidth={1} />
                        <Text
                            x={x + 2}
                            y={2}
                            text={formatTime(time)}
                            fontSize={11}
                            fill="#aaa"
                            fontFamily="monospace"
                        />
                    </Group>
                );
            })}

            {/* Minor ticks */}
            {minorTicks.map((time) => {
                const x = time * zoom;
                return (
                    <Line
                        key={`minor-${time}`}
                        points={[x, height - 5, x, height]}
                        stroke="#666"
                        strokeWidth={1}
                    />
                );
            })}

            {/* Bottom border */}
            <Line points={[0, height, width, height]} stroke="#3d3d3d" strokeWidth={1} />
        </Group>
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

