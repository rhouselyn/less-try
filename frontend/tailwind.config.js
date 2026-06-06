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
          '"Playfair Display"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"Songti SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'Georgia',
          'serif',
        ],
        sans: [
          '"Playfair Display"',
          '"Plus Jakarta Sans"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'Georgia',
          'serif',
        ],
      },
      colors: {
        // 画布色 - 主背景
        canvas: {
          50:  '#f5f0e1',
          100: '#ede6d0',
          200: '#e0d6b8',
          300: '#d1c49e',
          400: '#bfb085',
        },
        // 暖橙 - 印象派主强调色
        warmorange: {
          50:  '#fdf3ec',
          100: '#f9e0cc',
          200: '#f0c4a0',
          300: '#e8a87c',
          400: '#d4895a',
          500: '#be6e3d',
          600: '#9a5830',
          700: '#764324',
        },
        // 朱红 - 强调/危险
        vermilion: {
          50:  '#fdeeed',
          100: '#f9d0d2',
          200: '#f0a3a7',
          300: '#e07077',
          400: '#c0392b',
          500: '#a02e22',
          600: '#80241a',
          700: '#601b13',
        },
        // 深蓝 - 印象派天空/次要色
        deepblue: {
          50:  '#eef1f5',
          100: '#d5dce6',
          200: '#a9b9cd',
          300: '#6d87a8',
          400: '#3d5a80',
          500: '#2c3e50',
          600: '#233242',
          700: '#1a2634',
        },
        // 青绿 - 印象派水面/成功
        teal: {
          50:  '#e8f8f5',
          100: '#c5f0e8',
          200: '#8fe3d1',
          300: '#4dd4b6',
          400: '#1abc9c',
          500: '#15967d',
          600: '#107564',
          700: '#0b5449',
        },
        // 金光 - 印象派阳光/高亮
        gold: {
          50:  '#fef9ec',
          100: '#fcf0cc',
          200: '#f9e099',
          300: '#f5d88a',
          400: '#e8c55a',
          500: '#c9a63e',
          600: '#a58530',
          700: '#816424',
        },
        // 生褐 - 主文本
        umber: {
          400: '#8a7b68',
          500: '#6b5d4a',
          600: '#524635',
          700: '#3b3225',
          800: '#2a2319',
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
      },
      boxShadow: {
        // 厚涂阴影 - 实色底部 + 模糊扩散
        'impasto-sm': '0 2px 0 rgba(192,57,43,0.10), 0 3px 8px rgba(232,168,124,0.15)',
        'impasto':    '0 3px 0 rgba(192,57,43,0.12), 0 5px 16px rgba(232,168,124,0.20)',
        'impasto-lg': '0 4px 0 rgba(192,57,43,0.15), 0 8px 24px rgba(44,62,80,0.12)',
        'impasto-xl': '0 4px 0 rgba(192,57,43,0.15), 0 10px 28px rgba(44,62,80,0.12)',
        // 聚焦发光
        'glow-warm': '0 0 0 3px rgba(232,168,124,0.12)',
      },
      backgroundImage: {
        // 画布纹理
        'canvas-grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.42 0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)'/%3E%3C/svg%3E\")",
        // 笔触纹理
        'brush-strokes': "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 123, 104, 0.03) 2px, rgba(139, 123, 104, 0.03) 4px)",
        // 暖色径向渐变 - 模拟光线
        'light-radial': 'radial-gradient(ellipse at top, #f5d88a 0%, #f5f0e1 40%, #ede6d0 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
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
      },
    },
  },
  plugins: [],
}
