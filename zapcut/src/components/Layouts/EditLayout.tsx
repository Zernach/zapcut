import { MediaLibrary } from '../MediaLibrary/MediaLibrary';
import { VideoPlayer } from '../Player/VideoPlayer';
import { PlayerControls } from '../Player/PlayerControls';
import { Timeline } from '../Timeline/Timeline';
import { useMediaStore } from '../../store/mediaStore';

interface EditLayoutProps {
    onExportClick?: () => void;
}

export const EditLayout = ({ onExportClick }: EditLayoutProps) => {
    const selectedItemId = useMediaStore((state) => state.selectedItemId);
    const items = useMediaStore((state) => state.items);
    const selectItem = useMediaStore((state) => state.selectItem);

    const selectedItem = items.find((item) => item.id === selectedItemId);

    const handleClickOutsideMedia = () => {
        // Deselect media when clicking outside the media library
        selectItem(null);
    };

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Left sidebar: Media library */}
            <div className="w-80 border-r border-border">
                <MediaLibrary onExportClick={onExportClick} />
            </div>

            {/* Center: Player and Timeline */}
            <div className="flex-1 flex flex-col" onClick={handleClickOutsideMedia}>
                {/* Video player */}
                <div className="flex-1 min-h-0">
                    <VideoPlayer src={selectedItem?.filePath} />
                </div>

                {/* Player controls */}
                <PlayerControls />

                {/* Timeline */}
                <div className="h-64 border-t border-border">
                    <Timeline />
                </div>
            </div>
        </div>
    );
};
