/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'felt': {
          DEFAULT: '#0F3724',
          dark: '#092117',
          light: '#1A5235',
        },
        'wood': {
          DEFAULT: '#8b4513',
          dark: '#723a0f',
          light: '#a45117',
          accent: '#b58d3c',
        },
        'card': {
          DEFAULT: '#ffffff',
          back: '#1a237e',
          shadow: 'rgba(0, 0, 0, 0.2)',
          highlight: 'rgba(255, 255, 255, 0.1)',
        },
        'suit': {
          'hearts': '#ff0000',
          'diamonds': '#ff0000',
          'clubs': '#000000',
          'spades': '#000000',
        },
        'gold': {
          DEFAULT: '#b58d3c',
          light: '#deb25c',
          dark: '#8b6a1b',
        },
        'emerald': {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 8px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.1)',
        'table': 'inset 0 0 50px rgba(0, 0, 0, 0.5)',
        'player-area': '0 0 15px rgba(255, 255, 255, 0.1)',
        'inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
        'outer': '0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'felt-texture': "url('/assets/images/felt-texture-detailed.svg')",
        'wood-border': "url('/assets/images/wood-border.svg')",
        'card-back': "url('/assets/images/card-back-ornate.svg')",
      },
      animation: {
        'deal': 'deal 0.5s ease-out forwards',
        'play': 'play 0.3s ease-out forwards',
        'hover': 'hover 0.2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        deal: {
          '0%': { transform: 'translateY(-200px) translateX(-200px) rotate(-180deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) translateX(0) rotate(0)', opacity: '1' },
        },
        play: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.1)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        hover: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
          '100%': { transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 255, 255, 0.8)' },
          '100%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)' },
        },
        float: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
} 