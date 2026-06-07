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
          '"DM Sans"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          '"Playfair Display"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"Songti SC"',
          'Georgia',
          'serif',
        ],
        display: [
          '"Playfair Display"',
          '"DM Sans"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"Courier Prime"',
          '"Courier New"',
          'monospace',
        ],
      },
      colors: {
        // 复古羊皮纸 - 主背景
        parchment: {
          50:  '#F5ECD7',
          100: '#EDE0C8',
          200: '#E0CEAA',
          300: '#D1B88A',
          400: '#BF9E6B',
        },
        // 琥珀棕 - 强调色（主行动按钮、进度、关键提示）
        amber: {
          50:  '#FFF8E7',
          100: '#F5E6C0',
          200: '#E8C985',
          300: '#D4A854',
          400: '#C08A3A',
          500: '#A06E28',
          600: '#7D5520',
          700: '#5C3E18',
        },
        // 做旧绿 / 橄榄 - 成功 & 副色
        olive: {
          50:  '#F0EDE2',
          100: '#D8D4BF',
          200: '#B5AE8E',
          300: '#8E866A',
          400: '#6E6650',
          500: '#524D3C',
          600: '#3E3A2E',
          700: '#2C2922',
        },
        // 铁锈红 - 错误 / 危险
        rust: {
          50:  '#F5E8E4',
          100: '#E8C5BB',
          200: '#D08E7D',
          300: '#B8654F',
          400: '#9E4533',
          500: '#7F3125',
        },
        // 深棕墨水 - 主文本
        ink: {
          400: '#8A7A66',
          500: '#6B5D4B',
          600: '#524635',
          700: '#3B3225',
          800: '#2A2319',
        },
        // 做旧边框
        aged: {
          200: '#C9BB9E',
          300: '#B5A588',
          400: '#9E8E70',
        },
      },
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px',
        '2xl': '10px',
        '3xl': '12px',
        '4xl': '14px',
      },
      boxShadow: {
        // 复古阴影
        'retro-sm': '2px 2px 0px rgba(58, 46, 28, 0.12)',
        'retro':    '3px 3px 0px rgba(58, 46, 28, 0.15)',
        'retro-lg': '4px 4px 0px rgba(58, 46, 28, 0.18)',
        'retro-xl': '5px 5px 0px rgba(58, 46, 28, 0.20)',
        'retro-inset': 'inset 2px 2px 0px rgba(255, 255, 255, 0.15), inset -1px -1px 0px rgba(58, 46, 28, 0.08)',
        'warm-sm': '0 1px 2px rgba(91, 70, 35, 0.06), 0 1px 1px rgba(91, 70, 35, 0.04)',
        'warm':    '0 4px 12px rgba(91, 70, 35, 0.08), 0 2px 4px rgba(91, 70, 35, 0.05)',
        'warm-lg': '0 12px 32px rgba(91, 70, 35, 0.10), 0 4px 12px rgba(91, 70, 35, 0.06)',
        'warm-xl': '0 24px 60px rgba(91, 70, 35, 0.14), 0 8px 24px rgba(91, 70, 35, 0.08)',
        'glow-amber': '0 0 0 3px rgba(192, 138, 58, 0.25)',
        'glow-olive':  '0 0 0 3px rgba(110, 102, 80, 0.25)',
      },
      backgroundImage: {
        'paper-grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.27 0 0 0 0 0.16 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        'aged-paper': 'linear-gradient(135deg, #F5ECD7 0%, #EDE0C8 40%, #E0CEAA 70%, #EDE0C8 100%)',
        'warm-radial': 'radial-gradient(ellipse at top, #EDE0C8 0%, #F5ECD7 60%, #E0CEAA 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'typewriter': 'typewriter 0.5s steps(1) infinite',
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
      borderWidth: {
        '2': '2px',
        '4': '4px',
      },
    },
  },
  plugins: [],
}
