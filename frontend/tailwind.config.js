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
        // 生褐 - 主文本 (油画深色) - 提高对比度
        umber: {
          300: '#7a6b55',
          400: '#5e5040',
          500: '#4a3f30',
          600: '#3a3125',
          700: '#2c2419',
          800: '#1e180f',
        },
        // 暖石 - 边框 (提高对比度)
        stone: {
          200: '#d4c8ae',
          300: '#bfb194',
          400: '#a89570',
        },
        // 苔绿 - 成功状态 (更鲜活的绿色)
        teal: {
          50:  '#eef9ef',
          100: '#d4eed6',
          200: '#a9dda6',
          300: '#77c76f',
          400: '#4aa940',
          500: '#2e8a26',
          600: '#226f1b',
          700: '#185312',
        },
        // 朱红 - 错误/危险
        vermilion: {
          50:  '#fdedec',
          100: '#fadbd8',
          200: '#f5b7b1',
          300: '#f1948a',
          400: '#e74c3c',
          500: '#c0392b',
          600: '#a93226',
          700: '#922b21',
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
        // 3D按钮阴影 - 镉黄
        'btn-cadmium': '#b87d1e 0px 4px 0px, rgba(232, 180, 66, 0.3) 0px 6px 16px',
        'btn-cadmium-hover': '#b87d1e 0px 4px 0px, rgba(232, 180, 66, 0.4) 0px 8px 20px',
        // 3D按钮阴影 - 钴蓝
        'btn-cerulean': '#2a4f73 0px 4px 0px, rgba(74, 127, 173, 0.3) 0px 6px 16px',
        'btn-cerulean-hover': '#2a4f73 0px 4px 0px, rgba(74, 127, 173, 0.4) 0px 8px 20px',
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
        // 3D按钮渐变 - 镉黄
        'btn-gradient-cadmium': 'linear-gradient(135deg, #f2d07a 0%, #e8b442 100%)',
        'btn-gradient-cadmium-hover': 'linear-gradient(135deg, #f5d88a 0%, #ecbe52 100%)',
        // 3D按钮渐变 - 钴蓝
        'btn-gradient-cerulean': 'linear-gradient(135deg, #a8c5e1 0%, #6f9fc8 100%)',
        'btn-gradient-cerulean-hover': 'linear-gradient(135deg, #b5d0e8 0%, #7dabd0 100%)',
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
