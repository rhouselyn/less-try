/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
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
          '"Plus Jakarta Sans"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // 温暖奶油（暖中性） - 主背景
        cream: {
          50:  '#FBF7F0',
          100: '#F6EFE2',
          200: '#EFE5D2',
          300: '#E5D6BC',
          400: '#D6C29F',
        },
        // 苔绿 / 鼠尾草绿 - 成功 & 副色
        moss: {
          50:  '#F1F1E8',
          100: '#DDE0CC',
          200: '#BFC4A6',
          300: '#9CA37F',
          400: '#7C8461',
          500: '#5F6849',
          600: '#4A5238',
          700: '#363C2A',
        },
        // 赭石 / 陶土橙 - 强调色（主行动按钮、进度、关键提示）
        ochre: {
          50:  '#FBF1E7',
          100: '#F4DCC0',
          200: '#E8B985',
          300: '#D89554',
          400: '#C47A3A',
          500: '#A8622A',
          600: '#894D20',
          700: '#653A18',
        },
        // 烧赭 - 错误 / 危险
        ember: {
          50:  '#FBEFEC',
          100: '#F2CFC6',
          200: '#E29889',
          300: '#CC6A57',
          400: '#B14B36',
          500: '#923623',
        },
        // 茶褐 - 主文本
        ink: {
          400: '#8A7A66',
          500: '#6B5D4B',
          600: '#524635',
          700: '#3B3225',
          800: '#2A2319',
        },
        // 浅石材边框（与 cream 协调）
        bone: {
          200: '#E9DFCB',
          300: '#D9CBB1',
          400: '#C0AE8E',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // 暖色阴影
        'warm-sm': '0 1px 2px rgba(91, 70, 35, 0.06), 0 1px 1px rgba(91, 70, 35, 0.04)',
        'warm':    '0 4px 12px rgba(91, 70, 35, 0.08), 0 2px 4px rgba(91, 70, 35, 0.05)',
        'warm-lg': '0 12px 32px rgba(91, 70, 35, 0.10), 0 4px 12px rgba(91, 70, 35, 0.06)',
        'warm-xl': '0 24px 60px rgba(91, 70, 35, 0.14), 0 8px 24px rgba(91, 70, 35, 0.08)',
        'glow-ochre': '0 0 0 4px rgba(212, 149, 84, 0.18)',
        'glow-moss':  '0 0 0 4px rgba(124, 132, 97, 0.18)',
      },
      backgroundImage: {
        'paper-grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.27 0 0 0 0 0.16 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        'warm-radial': 'radial-gradient(ellipse at top, #F6EFE2 0%, #FBF7F0 60%, #F1E8D2 100%)',
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
