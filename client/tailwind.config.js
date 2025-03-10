/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'felt': {
          DEFAULT: '#35654d',
          dark: '#2a5440',
          light: '#417a5c',
        },
        'wood': {
          DEFAULT: '#8b4513',
          dark: '#723a0f',
          light: '#a45117',
        },
        'card': {
          DEFAULT: '#ffffff',
          back: '#1a237e',
          shadow: 'rgba(0, 0, 0, 0.2)',
        },
        'suit': {
          'hearts': '#ff0000',
          'diamonds': '#ff0000',
          'clubs': '#000000',
          'spades': '#000000',
        },
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 8px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.1)',
        'table': 'inset 0 0 50px rgba(0, 0, 0, 0.5)',
        'player-area': '0 0 15px rgba(255, 255, 255, 0.1)',
      },
      backgroundImage: {
        'felt-texture': "url('/assets/images/felt-texture.svg')",
        'wood-texture': "url('/assets/images/wood-texture.svg')",
        'card-back': "url('/assets/images/card-back.svg')",
      },
      animation: {
        'deal': 'deal 0.5s ease-out forwards',
        'play': 'play 0.3s ease-out forwards',
        'hover': 'hover 0.2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
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
      },
    },
  },
  plugins: [],
} 