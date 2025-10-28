/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core colors - Deep Space Theme
        background: '#0f1419',
        panel: '#1a1f2e',
        border: '#1e2d3d',
        // Futuristic cyan accents
        'scrollbar-track': '#1a1f2e',
        'scrollbar-thumb': '#2d5f7f',
        'scrollbar-thumb-hover': '#3d7fa0',
        // Timeline and canvas - Deep slate
        'canvas-bg': '#0f1419',
        'timeline-bg': '#1a1f2e',
        'timeline-border': '#1e2d3d',
        'playhead': '#00d9ff',
        'clip-default': '#0066cc',
        'clip-selected': '#00d9ff',
        // Media - Slate with cyan accents
        'media-bg': '#1a1f2e',
        'media-border-selected': '#00d9ff',
      },
    },
  },
  plugins: [],
};

