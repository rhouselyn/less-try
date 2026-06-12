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
          '"Inter"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        display: [
          '"Inter"',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        // Soft UI 主色调 - 低饱和度靛蓝
        soft: {
          50:  '#f0f0ff',
          100: '#e0e1ff',
          200: '#c7c8fe',
          300: '#a4a5fc',
          400: '#8183f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // 成功色 - 柔和绿
        mint: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        // 错误/危险 - 柔和红
        rose: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        // 警告/提示 - 柔和琥珀
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        // 文本色 - 柔和灰
        slate: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        // Soft UI 阴影 - 柔和、低饱和度
        'soft-sm': '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'soft':    '0 4px 6px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 25px rgba(0, 0, 0, 0.06), 0 4px 10px rgba(0, 0, 0, 0.04)',
        'soft-xl': '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
        'soft-2xl': '0 25px 50px rgba(0, 0, 0, 0.1), 0 10px 20px rgba(0, 0, 0, 0.06)',
        // Indigo 发光
        'glow-indigo': '0 0 0 4px rgba(99, 102, 241, 0.15)',
        'glow-mint':   '0 0 0 4px rgba(34, 197, 94, 0.15)',
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
