/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core colors
        background: '#1e1e1e',
        panel: '#2d2d2d',
        border: '#3d3d3d',
        // Additional themed colors for consistency
        'scrollbar-track': '#2d2d2d',
        'scrollbar-thumb': '#555',
        'scrollbar-thumb-hover': '#666',
        // Timeline and canvas
        'canvas-bg': '#1e1e1e',
        'timeline-bg': '#2d2d2d',
        'timeline-border': '#3d3d3d',
        'playhead': '#ff4444',
        'clip-default': '#3a7bd5',
        'clip-selected': '#4a9eff',
        // Media
        'media-bg': '#1f2937',
        'media-border-selected': '#3b82f6',
      },
    },
  },
  plugins: [],
};

