/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: {
          50: '#FDFCFB',
          100: '#FAF8F5',
          200: '#F5F1EB',
          300: '#EDE7DE',
        },
        warm: {
          800: '#2D2926',
          900: '#1C1917',
        },
        accent: {
          DEFAULT: '#C17F59',
          light: '#E8C4B0',
          dark: '#A66B4A',
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgb(0 0 0 / 0.04), 0 4px 6px -4px rgb(0 0 0 / 0.02)',
        'card': '0 4px 24px -4px rgb(0 0 0 / 0.06), 0 8px 16px -6px rgb(0 0 0 / 0.04)',
        'card-hover': '0 20px 40px -12px rgb(0 0 0 / 0.12), 0 8px 20px -8px rgb(0 0 0 / 0.06)',
        'glow': '0 0 40px -8px rgba(193, 127, 89, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
