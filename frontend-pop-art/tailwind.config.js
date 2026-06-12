/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bangers"', '"Noto Sans SC"', 'cursive'],
        body: ['"Outfit"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        pop: {
          yellow: '#FFD700',
          pink: '#FF69B4',
          blue: '#00BFFF',
          red: '#FF006E',
          green: '#39FF14',
          orange: '#FF6B35',
          purple: '#BF5FFF',
          cyan: '#00FFFF',
          magenta: '#FF00FF',
          black: '#000000',
          white: '#FFFFFF',
          cream: '#FFF8E7',
        },
      },
      boxShadow: {
        'pop': '4px 4px 0 #000',
        'pop-sm': '2px 2px 0 #000',
        'pop-lg': '6px 6px 0 #000',
        'pop-xl': '8px 8px 0 #000',
        'pop-pink': '4px 4px 0 #FF69B4',
        'pop-blue': '4px 4px 0 #00BFFF',
        'pop-yellow': '4px 4px 0 #FFD700',
        'pop-red': '4px 4px 0 #FF006E',
      },
      animation: {
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop-in': 'popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'slide-up': 'slideUp 0.6s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-pop': 'pulsePop 2s ease-in-out infinite',
        'rotate-slow': 'rotateSlow 20s linear infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        popIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulsePop: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        rotateSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
