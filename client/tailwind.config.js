/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C96A',
          dark: '#B8922E',
        },
        orange: {
          DEFAULT: '#FF6B4A',
          hover: '#E8512E',
        },
        green: {
          dark: '#013220',
          card: '#052E1C',
        },
        warm: '#FAFAF7',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(255, 107, 74, 0.15)',
        gold: '0 0 30px rgba(201, 168, 76, 0.2)',
      },
    },
  },
  plugins: [],
};
