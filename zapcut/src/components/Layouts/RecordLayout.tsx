import { RecordingControls } from '../Recording/RecordingControls';

export const RecordLayout = () => {
    return (
        <div className="flex-1 flex flex-col p-6 overflow-auto">
            <h2 className="text-2xl font-bold mb-6">Screen Recording</h2>
            <RecordingControls />
        </div>
    );
};
