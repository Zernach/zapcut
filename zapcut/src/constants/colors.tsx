// Core Background Colors - Deep Space Theme
export const COLORS = {
    // Backgrounds - Deep space with slate foundations
    background: '#0f1419',
    panel: '#1a1f2e',
    black: '#000000',
    darkGray: '#0a0d12',

    // Borders - Subtle cyan/slate gradients
    border: '#1e2d3d',

    // Scrollbar - Futuristic cyan accents
    scrollbarTrack: '#1a1f2e',
    scrollbarThumb: '#2d5f7f',
    scrollbarThumbHover: '#3d7fa0',

    // Canvas / Timeline - Deep slate backgrounds
    canvasBackground: '#0f1419',
    timelineBackground: '#1a1f2e',
    timelineBottomBorder: '#1e2d3d',

    // Timeline Elements - Cyan-based accents
    timelineRulerFill: '#1a1f2e',
    timelineTickMajor: '#2d5f7f',
    timelineTickLabel: '#5f9fba',
    timelineRulerStroke: '#2d5f7f',

    // Timeline Playhead - Energetic cyan
    playheadStroke: '#00d9ff',
    playheadFill: '#00d9ff',

    // Timeline Clip - Cyan spectrum
    clipDefault: '#0066cc',
    clipSelected: '#00d9ff',
    clipResizeHandle: '#fff',

    // Track - Deep space foundations
    trackBackground: '#0f1419',
    trackBorder: '#1e2d3d',
    trackLabel: '#5f9fba',

    // Text - Clean contrast on deep backgrounds
    textPrimary: '#f0f6fb',
    textSecondary: '#a0c9e0',
    textMuted: '#5f7f99',
    textGray400: '#7f99b0',
    textGray500: '#5f7f99',
    textGray600: '#3d5f7f',
    textGray100: '#f0f6fb',
    textGray300: '#a0c9e0',

    // Status Colors - Cosmic themed
    statusError: '#ff3366',
    statusSuccess: '#00ff88',
    statusWarning: '#ffaa00',
    statusInfo: '#00d9ff',

    // UI States - Vibrant deep space colors
    uiRed: '#ff3366',
    uiRedHover: '#ff5588',
    uiYellow: '#ffaa00',
    uiYellowHover: '#ffbb22',
    uiGreen: '#00ff88',
    uiGreenHover: '#22ffaa',
    uiBlue: '#0066cc',
    uiBlueHover: '#0088ff',
    uiPurple: '#aa00ff',
    uiPurpleHover: '#cc22ff',

    // Hover States - Cyan glow
    hoverOverlay: '#00d9ff1a',

    // Inputs & Selects - Slate with cyan borders
    inputBackground: '#1e2d3d',
    inputBorder: '#2d5f7f',

    // Recording Settings - Consistent slate theme
    recordingSettingsBg: '#1a1f2e',
    recordingSettingsText: '#f0f6fb',
    recordingSettingsLabel: '#f0f6fb',

    // Error / Alert - Deep red accents
    errorBgLight: '#4d0011',
    errorBorder: '#990033',
    errorText: '#ff99bb',

    // Modals / Overlays - Translucent deep space
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    dropZoneOverlay: 'rgba(0, 217, 255, 0.08)',
    dropZoneBorder: '#00d9ff',
    dropZoneText: '#f0f6fb',

    // Media Library - Slate foundations with cyan accents
    mediaItemBg: '#1a1f2e',
    mediaItemBorderDefault: 'transparent',
    mediaItemBorderHover: '#2d5f7f',
    mediaItemBorderSelected: '#00d9ff',

    // Video Player - Pure black deep space
    videoPlayerBg: '#000000',
    playerMessageText: '#7f99b0',
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

// Tailwind color utilities - Deep space theme
export const TAILWIND_COLORS = {
    blue: {
        base: 'bg-blue-700',
        hover: 'hover:bg-blue-600',
        disabled: 'disabled:bg-blue-800',
    },
    red: {
        base: 'bg-red-600',
        hover: 'hover:bg-red-500',
        disabled: 'disabled:bg-red-800',
    },
    green: {
        base: 'bg-emerald-600',
        hover: 'hover:bg-emerald-500',
    },
    yellow: {
        base: 'bg-amber-600',
        hover: 'hover:bg-amber-500',
    },
    purple: {
        base: 'bg-violet-600',
        hover: 'hover:bg-violet-500',
    },
};
