/**
 * Tailwind class constants for consistent styling across the app
 * This file provides reusable Tailwind class combinations organized by UI element type
 */

export const BUTTON_CLASSES = {
    primary: 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded text-sm flex items-center gap-2 transition-colors',
    success: 'px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-2 transition-colors',
    danger: 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors',
    warning: 'px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors',
    secondary: 'px-4 py-2 hover:bg-gray-700 rounded transition-colors',
    ghost: 'p-2 hover:bg-gray-700 rounded transition-colors',
};

export const TAB_CLASSES = {
    base: 'px-3 py-1.5 rounded text-sm font-medium transition-colors',
    active: 'bg-blue-600 text-white',
    activeRed: 'bg-red-600 text-white',
    inactive: 'text-gray-400 hover:text-white',
};

export const INPUT_CLASSES = {
    base: 'w-full p-2 border rounded bg-gray-700 text-gray-100',
    select: 'w-full bg-background border border-border rounded px-3 py-2',
};

export const TEXT_CLASSES = {
    heading: 'text-lg font-semibold',
    subheading: 'text-lg font-bold',
    body: 'text-sm',
    muted: 'text-gray-400',
    label: 'text-sm font-medium mb-2 text-gray-100',
};

export const CONTAINER_CLASSES = {
    panel: 'bg-panel',
    section: 'mt-4 p-4 bg-gray-800 border rounded-lg shadow-sm',
    error: 'p-3 bg-red-900/30 border border-red-800 rounded text-sm text-red-300',
};

export const LAYOUT_CLASSES = {
    flexCenter: 'flex items-center justify-center',
    flexBetween: 'flex items-center justify-between',
};
