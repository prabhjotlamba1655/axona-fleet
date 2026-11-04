/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        axona: {
          900: '#060B18',
          850: '#0A1128',
          800: '#0F1A3A',
          750: '#14234E',
          700: '#1B2C63',
          card: '#0D1730',
          border: '#1E2E56',
          accent: '#00F0FF',
          orange: '#FF6B00',
          green: '#00E676',
          red: '#FF1744',
          yellow: '#FFD600',
          purple: '#B388FF'
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'slosh': 'slosh 3s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 2px rgba(0,240,255,0.2))' },
        },
        slosh: {
          '0%, 100%': { transform: 'rotate(-1deg) scaleY(1)' },
          '50%': { transform: 'rotate(1.5deg) scaleY(1.02)' },
        }
      }
    },
  },
  plugins: [],
}
