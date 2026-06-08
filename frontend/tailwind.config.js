/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: [
          '"Fraunces"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"Songti SC"',
          'Georgia',
          'serif',
        ],
        display: [
          '"Fraunces"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          'Georgia',
          'serif',
        ],
      },
      colors: {
        // 复古怀旧 - 羊皮纸/奶油背景
        cream: {
          50:  '#f5e6d3',
          100: '#ebd5bc',
          200: '#e0c4a5',
          300: '#d4b08c',
          400: '#c49b72',
        },
        // 苔绿 / 橄榄绿 - 成功 & 副色
        moss: {
          50:  '#e8f0e4',
          100: '#c8dcc0',
          200: '#a4c498',
          300: '#7da86e',
          400: '#5a8a4a',
          500: '#3d6b30',
          600: '#2d5a27',
          700: '#1f4419',
        },
        // 赭石 / 马鞍棕 - 强调色
        ochre: {
          50:  '#f5e6d3',
          100: '#ebd5bc',
          200: '#d4a574',
          300: '#b8834a',
          400: '#8b4513',
          500: '#8b4513',
          600: '#6b3410',
          700: '#4a250a',
        },
        // 深红 / 酒红 - 错误 / 危险
        ember: {
          50:  '#f5e0d8',
          100: '#e8b8a8',
          200: '#d48a70',
          300: '#b85c3e',
          400: '#8b2500',
          500: '#6b1d00',
        },
        // 茶褐 - 主文本
        ink: {
          400: '#8b7355',
          500: '#6b5744',
          600: '#5c4033',
          700: '#4a3728',
          800: '#3b2a1a',
        },
        // 深棕边框
        bone: {
          200: '#8b4513',
          300: '#6b3410',
          400: '#4a250a',
        },
      },
      borderRadius: {
        '4xl': '0',
        '5xl': '0',
      },
      boxShadow: {
        // 复古硬边阴影
        'warm-sm': '0 2px 4px rgba(139,69,19,0.1)',
        'warm':    '0 4px 8px rgba(139,69,19,0.15)',
        'warm-lg': '0 8px 16px rgba(139,69,19,0.2)',
        'warm-xl': '0 12px 24px rgba(139,69,19,0.25)',
        'glow-ochre': '0 0 0 4px rgba(139,69,19,0.18)',
        'glow-moss':  '0 0 0 4px rgba(61,107,48,0.18)',
        // 硬边偏移阴影 (retro)
        'retro-sm': '2px 2px 0px 0px rgba(139,69,19,0.3)',
        'retro':    '4px 4px 0px 0px rgba(139,69,19,0.3)',
        'retro-lg': '6px 6px 0px 0px rgba(139,69,19,0.3)',
      },
      backgroundImage: {
        'paper-grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.27 0 0 0 0 0.16 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
