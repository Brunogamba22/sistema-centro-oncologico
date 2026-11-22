import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * Tokens del sistema de diseño.
 * - primary: azul petróleo (estructura, navegación, acciones principales)
 * - accent: verde azulado (estados activos, destacados, gráficos)
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          50: '#EEF6F8',
          100: '#D5E9EE',
          200: '#ABD2DC',
          300: '#77B3C2',
          400: '#3F8CA0',
          500: '#1F6F84',
          600: '#155E70',
          700: '#0F4C5C',
          800: '#0D4250',
          900: '#0B3C49',
          950: '#072630',
        },
        accent: {
          50: '#EFFCF9',
          100: '#C9F6EC',
          200: '#94ECDA',
          300: '#5CDCC4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        surface: {
          DEFAULT: '#F4F7F8',
          muted: '#EDF2F4',
        },
        line: '#E5ECEE',
      },
      borderColor: {
        DEFAULT: '#E5ECEE',
      },
      spacing: {
        sidebar: '248px',
        topbar: '64px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 60, 73, 0.04), 0 1px 3px rgba(11, 60, 73, 0.06)',
        'card-hover': '0 4px 12px rgba(11, 60, 73, 0.08), 0 2px 4px rgba(11, 60, 73, 0.04)',
        popover: '0 10px 30px rgba(11, 60, 73, 0.12), 0 2px 6px rgba(11, 60, 73, 0.06)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'scale-in': 'scale-in 150ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
