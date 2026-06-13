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
      },
      animation: {
        'wiggle': 'wiggle 0.5s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-pop': 'pulsePop 2s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulsePop: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
