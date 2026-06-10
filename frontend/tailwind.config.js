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
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'monospace',
        ],
      },
      colors: {
        // 赛璐璐主色调 - 高饱和鲜艳色彩
        cel: {
          pink:    '#ff006e',
          blue:    '#3a86ff',
          yellow:  '#ffbe0b',
          purple:  '#8338ec',
          orange:  '#fb5607',
          green:   '#06d6a0',
          red:     '#ef476f',
          cyan:    '#00b4d8',
        },
        // 轮廓色
        outline: {
          DEFAULT: '#1a1a2e',
          light:   '#2d2d4a',
        },
        // 背景色
        surface: {
          DEFAULT: '#ffffff',
          alt:     '#f0f0ff',
          muted:   '#e8e8f0',
        },
        // 文本色
        text: {
          DEFAULT: '#1a1a2e',
          muted:   '#4a4a6a',
          light:   '#7a7a9a',
        },
        // 保留兼容旧引用的映射
        cream: {
          50:  '#ffffff',
          100: '#f0f0ff',
          200: '#e0e0f0',
          300: '#d0d0e0',
          400: '#b0b0c8',
        },
        moss: {
          50:  '#e6fff5',
          100: '#b3ffe0',
          200: '#80ffcc',
          300: '#4dffb8',
          400: '#1affa3',
          500: '#06d6a0',
          600: '#04a87d',
          700: '#037a5a',
        },
        ochre: {
          50:  '#fff0f5',
          100: '#ffccdd',
          200: '#ff99bb',
          300: '#ff6699',
          400: '#ff006e',
          500: '#cc0058',
          600: '#990042',
          700: '#66002c',
        },
        ember: {
          50:  '#fff0f0',
          100: '#ffcccc',
          200: '#ff9999',
          300: '#ff6666',
          400: '#ef476f',
          500: '#cc2244',
        },
        ink: {
          400: '#7a7a9a',
          500: '#4a4a6a',
          600: '#2d2d4a',
          700: '#1a1a2e',
          800: '#0f0f1e',
        },
        bone: {
          200: '#1a1a2e',
          300: '#2d2d4a',
          400: '#4a4a6a',
        },
      },
      borderRadius: {
        'none': '0px',
      },
      boxShadow: {
        // 赛璐璐硬偏移阴影
        'cel-sm':  '2px 2px 0 #1a1a2e',
        'cel':     '3px 3px 0 #1a1a2e',
        'cel-lg':  '4px 4px 0 #1a1a2e',
        'cel-xl':  '6px 6px 0 #1a1a2e',
        'cel-pink':  '3px 3px 0 #ff006e',
        'cel-blue':  '3px 3px 0 #3a86ff',
        'cel-green': '3px 3px 0 #06d6a0',
        'cel-yellow':'3px 3px 0 #ffbe0b',
        'cel-purple':'3px 3px 0 #8338ec',
        'cel-orange':'3px 3px 0 #fb5607',
        // 保留兼容旧引用
        'warm-sm': '2px 2px 0 #1a1a2e',
        'warm':    '3px 3px 0 #1a1a2e',
        'warm-lg': '4px 4px 0 #1a1a2e',
        'warm-xl': '6px 6px 0 #1a1a2e',
        'glow-ochre': '0 0 0 3px #ff006e',
        'glow-moss':  '0 0 0 3px #06d6a0',
      },
      backgroundImage: {
        'paper-grain': 'none',
        'warm-radial': 'none',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.15s ease-out',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'bounce-cel': 'bounceCel 0.3s ease-out',
        'shake-cel': 'shakeCel 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
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
        shakeCel: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
  plugins: [],
}
