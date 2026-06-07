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
          '"Georgia"',
          '"Times New Roman"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"Songti SC"',
          'serif',
        ],
        serif: [
          '"Georgia"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"Songti SC"',
          'serif',
        ],
        display: [
          '"Georgia"',
          '"Playfair Display"',
          '"Source Han Serif SC"',
          'serif',
        ],
      },
      colors: {
        // 复古纸张色 - 主背景
        paper: {
          50:  '#F8F5F0',
          100: '#F0EBE0',
          200: '#E5DCC8',
          300: '#D8CBA8',
          400: '#C8B68A',
        },
        // 深褐色/深棕色 - 主文本
        sepia: {
          900: '#2D1F14',
          800: '#3D2D1E',
          700: '#4D3B28',
          600: '#5D4932',
          500: '#6D573C',
          400: '#8D755C',
          300: '#AD937C',
        },
        // 琥珀色 - 强调色/主按钮
        amber: {
          50:  '#FFF7E6',
          100: '#FDE9C3',
          200: '#F8D68A',
          300: '#EFBF52',
          400: '#D99F2E',
          500: '#B87F18',
          600: '#8F6010',
          700: '#6A470C',
        },
        // 深棕色 - 边框/深色元素
        brown: {
          800: '#5C4033',
          700: '#785145',
          600: '#946257',
          500: '#B07369',
        },
        // 褪色蓝 - 辅助色
        'faded-blue': {
          400: '#7A8B8B',
          500: '#5F7373',
          600: '#455959',
        },
        // 复古绿 - 成功色
        moss: {
          50:  '#E8EDE0',
          100: '#D0D8C0',
          200: '#A8B896',
          300: '#789068',
          400: '#587048',
          500: '#385028',
          600: '#283818',
        },
        // 砖红 - 错误/危险
        brick: {
          50:  '#F8E8E8',
          100: '#F0C8C8',
          200: '#E0A0A0',
          300: '#C87070',
          400: '#A85050',
          500: '#883030',
        },
        // 边框色
        'vintage-border': {
          300: '#D8CBA8',
          400: '#C8B68A',
          500: '#A89068',
        },
      },
      boxShadow: {
        'vintage-sm': '2px 2px 0px #D8CBA8',
        'vintage': '4px 4px 0px #A89068',
        'vintage-lg': '6px 6px 0px #A89068',
        'vintage-xl': '8px 8px 0px #8D755C',
        'vintage-inset': 'inset 0 2px 4px rgba(45, 31, 20, 0.1)',
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        'vintage-gradient': 'linear-gradient(135deg, #F8F5F0 0%, #F0EBE0 50%, #E5DCC8 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
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
      },
    },
  },
  plugins: [],
}
