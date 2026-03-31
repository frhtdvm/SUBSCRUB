/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        surface: '#0A0A0A',
        card: '#111111',
        border: '#1E1E1E',
        primary: '#39FF14',
        'primary-dim': '#1A7A07',
        warning: '#FF3131',
        'warning-dim': '#7A1515',
        muted: '#555555',
        subtle: '#888888',
        text: '#FFFFFF',
        'text-secondary': '#CCCCCC',
      },
      fontFamily: {
        mono: ['SpaceMono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
