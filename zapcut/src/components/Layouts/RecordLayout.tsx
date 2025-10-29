import { RecordingControls } from '../Recording/RecordingControls';
import { useMediaStore } from '../../store/mediaStore';

export const RecordLayout = () => {
    const selectItem = useMediaStore((state) => state.selectItem);

    const handleClick = () => {
        // Deselect media when clicking in record layout
        selectItem(null);
    };

    return (
        <div className="flex-1 flex flex-col p-6 overflow-auto" onClick={handleClick}>
            <h2 className="text-2xl font-bold mb-6">Video & Audio Recordings</h2>
            <RecordingControls />
        </div>
    );
};
