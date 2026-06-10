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
        cel: [
          '"Bangers"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'cursive',
        ],
        display: [
          '"Bangers"',
          '"Plus Jakarta Sans"',
          'system-ui',
          'cursive',
        ],
      },
      colors: {
        // 赛璐璐主色板 - 高饱和纯色
        cel: {
          bg:      '#f0e6d3',   // 暖米色背景
          card:    '#ffffff',   // 纯白卡片
          red:     '#e63946',   // 鲜红 - 主强调
          blue:    '#457b9d',   // 深蓝 - 信息
          sky:     '#a8dadc',   // 天蓝 - 次要
          yellow:  '#f4a261',   // 橙黄 - 警告/高亮
          green:   '#2a9d8f',   // 青绿 - 成功
          pink:    '#e76f8b',   // 粉红 - 次要强调
          purple:  '#6c5ce7',   // 紫色 - 特殊
          dark:    '#1a1a2e',   // 深蓝黑 - 轮廓线/文字
          orange:  '#e76f51',   // 橙色 - 行动
          lime:    '#a8e06e',   // 青柠 - 新增
          gold:    '#ffd166',   // 金色 - 星星/奖励
        },
        // 保留兼容映射
        cream: {
          50:  '#f0e6d3',
          100: '#e8d9c0',
          200: '#dcc8a8',
          300: '#d0b790',
          400: '#c4a678',
        },
        moss: {
          50:  '#e6f5f3',
          100: '#b8e0db',
          200: '#8accc3',
          300: '#5cb8ab',
          400: '#2a9d8f',
          500: '#22877b',
          600: '#1a7167',
          700: '#125b53',
        },
        ochre: {
          50:  '#fef3e2',
          100: '#fcd9a8',
          200: '#f4a261',
          300: '#e8934e',
          400: '#e63946',
          500: '#c4303b',
          600: '#a12730',
          700: '#7d1e25',
        },
        ember: {
          50:  '#fde8e8',
          100: '#f5b8b8',
          200: '#e76f8b',
          300: '#d94f6f',
          400: '#e63946',
          500: '#c4303b',
        },
        ink: {
          400: '#4a4a6a',
          500: '#2d2d4a',
          600: '#1a1a2e',
          700: '#1a1a2e',
          800: '#0f0f1e',
        },
        bone: {
          200: '#d0c4b0',
          300: '#b8a88e',
          400: '#a09078',
        },
      },
      borderRadius: {
        '4xl': '1.5rem',
        '5xl': '2rem',
      },
      boxShadow: {
        // 赛璐璐硬阴影
        'cel':      '3px 3px 0 #1a1a2e',
        'cel-sm':   '2px 2px 0 #1a1a2e',
        'cel-lg':   '4px 4px 0 #1a1a2e',
        'cel-xl':   '5px 5px 0 #1a1a2e',
        'cel-red':  '3px 3px 0 #1a1a2e',
        'cel-blue': '3px 3px 0 #1a1a2e',
        // 保留兼容
        'warm-sm': '2px 2px 0 #1a1a2e',
        'warm':    '3px 3px 0 #1a1a2e',
        'warm-lg': '4px 4px 0 #1a1a2e',
        'warm-xl': '5px 5px 0 #1a1a2e',
        'glow-ochre': '0 0 0 3px #e63946, 3px 3px 0 #1a1a2e',
        'glow-moss':  '0 0 0 3px #2a9d8f, 3px 3px 0 #1a1a2e',
      },
      backgroundImage: {
        'paper-grain': 'none',
        'warm-radial': 'none',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'bounce-cel': 'bounceCel 0.5s ease-out',
        'shake': 'shake 0.4s ease-out',
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
        bounceCel: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}
