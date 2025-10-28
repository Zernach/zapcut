// Core Background Colors
export const COLORS = {
    // Backgrounds
    background: '#1e1e1e',
    panel: '#2d2d2d',
    black: '#000000',
    darkGray: '#0a0a0a',

    // Borders
    border: '#3d3d3d',

    // Scrollbar
    scrollbarTrack: '#2d2d2d',
    scrollbarThumb: '#555',
    scrollbarThumbHover: '#666',

    // Canvas / Timeline
    canvasBackground: '#1e1e1e',
    timelineBackground: '#2d2d2d',
    timelineBottomBorder: '#3d3d3d',

    // Timeline Elements
    timelineRulerFill: '#2d2d2d',
    timelineTickMajor: '#888',
    timelineTickLabel: '#aaa',
    timelineRulerStroke: '#666',

    // Timeline Playhead
    playheadStroke: '#ff4444',
    playheadFill: '#ff4444',

    // Timeline Clip
    clipDefault: '#3a7bd5',
    clipSelected: '#4a9eff',
    clipResizeHandle: '#fff',

    // Track
    trackBackground: '#1e1e1e',
    trackBorder: '#3d3d3d',
    trackLabel: '#888',

    // Text
    textPrimary: '#ffffff',
    textSecondary: '#a0a0a0',
    textMuted: '#666666',
    textGray400: '#9ca3af',
    textGray500: '#6b7280',
    textGray600: '#4b5563',
    textGray100: '#f3f4f6',
    textGray300: '#d1d5db',

    // Status Colors
    statusError: '#ef4444',
    statusSuccess: '#22c55e',
    statusWarning: '#eab308',
    statusInfo: '#3b82f6',

    // UI States
    uiRed: '#dc2626',
    uiRedHover: '#b91c1c',
    uiYellow: '#ca8a04',
    uiYellowHover: '#b45309',
    uiGreen: '#16a34a',
    uiGreenHover: '#15803d',
    uiBlue: '#2563eb',
    uiBlueHover: '#1d4ed8',
    uiPurple: '#7c3aed',
    uiPurpleHover: '#6d28d9',

    // Hover States
    hoverOverlay: '#3d3d3d',

    // Inputs & Selects
    inputBackground: '#374151',
    inputBorder: '#4b5563',

    // Recording Settings
    recordingSettingsBg: '#1f2937',
    recordingSettingsText: '#f3f4f6',
    recordingSettingsLabel: '#f3f4f6',

    // Error / Alert
    errorBgLight: '#7f1d1d',
    errorBorder: '#991b1b',
    errorText: '#fca5a5',

    // Modals / Overlays
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    dropZoneOverlay: 'rgba(59, 130, 246, 0.1)',
    dropZoneBorder: '#3b82f6',
    dropZoneText: '#ffffff',

    // Media Library
    mediaItemBg: '#1f2937',
    mediaItemBorderDefault: 'transparent',
    mediaItemBorderHover: '#4b5563',
    mediaItemBorderSelected: '#3b82f6',

    // Video Player
    videoPlayerBg: '#000000',
    playerMessageText: '#9ca3af',
};

// Utility function to get hover variant of a color
export const getHoverColor = (baseColor: string): string => {
    const hoverMap: Record<string, string> = {
        [COLORS.uiRed]: COLORS.uiRedHover,
        [COLORS.uiYellow]: COLORS.uiYellowHover,
        [COLORS.uiGreen]: COLORS.uiGreenHover,
        [COLORS.uiBlue]: COLORS.uiBlueHover,
        [COLORS.uiPurple]: COLORS.uiPurpleHover,
    };
    return hoverMap[baseColor] || baseColor;
};

// Tailwind color utilities
export const TAILWIND_COLORS = {
    blue: {
        base: 'bg-blue-600',
        hover: 'hover:bg-blue-700',
        disabled: 'disabled:bg-blue-800',
    },
    red: {
        base: 'bg-red-600',
        hover: 'hover:bg-red-700',
        disabled: 'disabled:bg-red-800',
    },
    green: {
        base: 'bg-green-600',
        hover: 'hover:bg-green-700',
    },
    yellow: {
        base: 'bg-yellow-600',
        hover: 'hover:bg-yellow-700',
    },
    purple: {
        base: 'bg-purple-600',
        hover: 'hover:bg-purple-700',
    },
};
