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
          '"Playfair Display"',
          '"Plus Jakarta Sans"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'Georgia',
          'serif',
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
          '"Plus Jakarta Sans"',
          'Georgia',
          'serif',
        ],
      },
      colors: {
        // 画布色 - 主背景 (印象派画布)
        canvas: {
          50:  '#f5f0e1',
          100: '#ede6d0',
          200: '#e0d6b8',
          300: '#d1c49e',
          400: '#bfb085',
        },
        // 钴蓝 - 印象派天空色
        cerulean: {
          50:  '#eef3f8',
          100: '#d4e2f0',
          200: '#a8c5e1',
          300: '#6f9fc8',
          400: '#4a7fad',
          500: '#356491',
          600: '#2a4f73',
          700: '#1e3a56',
        },
        // 镉黄 - 莫奈阳光色 (主强调色)
        cadmium: {
          50:  '#fdf6e3',
          100: '#f9e8b8',
          200: '#f2d07a',
          300: '#e8b442',
          400: '#d4982a',
          500: '#b87d1e',
          600: '#946318',
          700: '#6e4912',
        },
        // 玫瑰红 - 花卉色 (次要强调)
        madder: {
          50:  '#f9eff0',
          100: '#f0d1d5',
          200: '#e0a3ab',
          300: '#cd6f7c',
          400: '#b84a5b',
          500: '#9a3345',
          600: '#7a2637',
          700: '#5a1c29',
        },
        // 生褐 - 主文本 (油画深色)
        umber: {
          400: '#8a7b68',
          500: '#6b5d4a',
          600: '#524635',
          700: '#3b3225',
          800: '#2a2319',
        },
        // 暖石 - 边框 (与画布协调)
        stone: {
          200: '#ddd3be',
          300: '#c9bca3',
          400: '#b0a086',
        },
        // 苔绿 - 保留用于成功状态
        moss: {
          50:  '#eef0e4',
          100: '#d5dbc0',
          200: '#b3be94',
          300: '#8e9c6c',
          400: '#6f7f52',
          500: '#54663d',
          600: '#3f4e2e',
          700: '#2c3820',
        },
        // 焦赭 - 错误/危险
        sienna: {
          50:  '#f7ede6',
          100: '#e8c9b4',
          200: '#d49878',
          300: '#c06d48',
          400: '#a8502e',
          500: '#8b3a1f',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // 厚涂阴影 - 实色底部 + 模糊扩散
        'impasto-sm': '0 2px 0 #c9bca3, 0 2px 6px rgba(58, 45, 25, 0.10)',
        'impasto':    '0 3px 0 #c9bca3, 0 4px 12px rgba(58, 45, 25, 0.14)',
        'impasto-lg': '0 4px 0 #bfb085, 0 8px 24px rgba(58, 45, 25, 0.18)',
        'impasto-xl': '0 5px 0 #bfb085, 0 12px 40px rgba(58, 45, 25, 0.22)',
        // 发光效果
        'glow-cadmium': '0 0 0 4px rgba(232, 180, 66, 0.22)',
        'glow-cerulean':  '0 0 0 4px rgba(74, 127, 173, 0.22)',
        'glow-madder':  '0 0 0 4px rgba(184, 74, 91, 0.22)',
      },
      backgroundImage: {
        // 画布纹理 - 模拟油画画布的粗糙质感
        'canvas-grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)'/%3E%3C/svg%3E\")",
        // 笔触纹理 - 水平方向的笔触效果
        'brush-strokes': "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 123, 104, 0.03) 2px, rgba(139, 123, 104, 0.03) 4px)",
        // 暖色径向渐变 - 模拟光线
        'light-radial': 'radial-gradient(ellipse at top, #f9e8b8 0%, #f5f0e1 40%, #ede6d0 100%)',
        // 颜料管渐变 - 按钮用的渐变
        'paint-tube-cadmium': 'linear-gradient(135deg, #f2d07a 0%, #e8b442 40%, #d4982a 100%)',
        'paint-tube-cerulean': 'linear-gradient(135deg, #a8c5e1 0%, #6f9fc8 40%, #4a7fad 100%)',
        'paint-tube-madder': 'linear-gradient(135deg, #e0a3ab 0%, #cd6f7c 40%, #b84a5b 100%)',
        'paint-tube-moss': 'linear-gradient(135deg, #b3be94 0%, #8e9c6c 40%, #6f7f52 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'brush-stroke': 'brushStroke 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
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
        brushStroke: {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
      },
    },
  },
  plugins: [],
}
