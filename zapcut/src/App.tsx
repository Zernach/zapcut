import { TopToolbar } from './components/TopToolbar/TopToolbar';
import { MainBody } from './components/MainBody';
import { ExportDialog } from './components/Export/ExportDialog';
import { useAppInitialization } from './hooks/useAppInitialization';
import { usePlayerTimelineSync } from './hooks/usePlayerTimelineSync';

function App() {
    useAppInitialization(); // Initialize app directories on mount
    usePlayerTimelineSync(); // Synchronize player and timeline

    return (
        <div className="h-screen flex flex-col bg-background text-white">
            {/* Top toolbar */}
            <TopToolbar />

            {/* Main content */}
            <MainBody />

            {/* Export dialog */}
            <ExportDialog />
        </div>
    );
}

export default App;

