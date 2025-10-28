/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#1e1e1e',
        panel: '#2d2d2d',
        border: '#3d3d3d',
      },
    },
  },
  plugins: [],
};

