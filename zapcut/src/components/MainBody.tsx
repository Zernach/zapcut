import { EditLayout } from './Layouts/EditLayout';
import { RecordLayout } from './Layouts/RecordLayout';
import { useAppStore } from '../store/appStore';

export const MainBody = () => {
    const activeTab = useAppStore((state) => state.activeTab);
    const setShowExportDialog = useAppStore((state) => state.setShowExportDialog);

    return activeTab === 'edit' ? (
        <EditLayout onExportClick={() => setShowExportDialog(true)} />
    ) : (
        <RecordLayout />
    );
};
