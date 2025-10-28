import { useState } from 'react';
import { TopToolbar } from './components/TopToolbar/TopToolbar';
import { EditLayout } from './components/Layouts/EditLayout';
import { RecordLayout } from './components/Layouts/RecordLayout';
import { ExportDialog } from './components/Export/ExportDialog';
import { useAppInitialization } from './hooks/useAppInitialization';
import { usePlayerTimelineSync } from './hooks/usePlayerTimelineSync';

function App() {
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'record'>('edit');

    // Initialize app directories on mount
    useAppInitialization();

    // Synchronize player and timeline
    usePlayerTimelineSync();

    return (
        <div className="h-screen flex flex-col bg-background text-white">
            {/* Top toolbar */}
            <TopToolbar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onExportClick={() => setShowExportDialog(true)}
            />

            {/* Main content */}
            {activeTab === 'edit' ? <EditLayout /> : <RecordLayout />}

            {/* Export dialog */}
            <ExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} />
        </div>
    );
}

export default App;

