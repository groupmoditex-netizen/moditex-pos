/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#ffffff',
        'bg2': '#fafafa',
        'bg3': '#f4f4f4',
        surface: '#ffffff',
        border: 'rgba(0,0,0,0.10)',
        'border-strong': 'rgba(0,0,0,0.20)',
        ink: '#111111',
        'ink-dim': '#444444',
        'ink-muted': '#666666',
        red: '#d91e1e',
        'red-deep': '#b81818',
        'red-soft': 'rgba(217,30,30,0.07)',
        green: '#1a7a3c',
        'green-soft': 'rgba(26,122,60,0.08)',
        blue: '#1440b0',
        'blue-soft': 'rgba(20,64,176,0.08)',
        warn: '#9a4700',
        'warn-soft': 'rgba(154,71,0,0.08)',
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'serif'],
        'poppins': ['Poppins', 'sans-serif'],
        'dm': ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
