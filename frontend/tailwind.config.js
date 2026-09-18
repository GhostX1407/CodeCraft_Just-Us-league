/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hospital: {
          white: '#FFFFFF',
          canvas: '#F8FAFC',
          surface: '#FFFFFF',
          teal: '#149B9E',
          'teal-hover': '#0D7C7E',
          'teal-light': '#E6F7F7',
          'teal-border': '#B2EBF2',
          wood: '#4A3525',
          'wood-dark': '#302217',
          text: '#0F172A',
          muted: '#475569',
          border: '#E2E8F0',
          // Theme transition aliases
          ivory: '#F8FAFC',
          cream: '#FFFFFF',
          'cream-pure': '#FFFFFF',
          beige: '#E2E8F0',
          'beige-light': '#F1F5F9',
          sage: '#149B9E',
          'sage-light': '#E6F7F7',
          olive: '#0D9488',
          yellow: '#D97706',
          'yellow-light': '#FEF3C7',
          coral: '#E11D48',
          'coral-light': '#FFE4E6',
          terracotta: '#BE123C',
          orange: '#149B9E',
          'orange-hover': '#0D7C7E',
          'orange-light': '#E6F7F7',
          brown: '#4A3525',
          'brown-dark': '#302217',
        },
        canvas: {
          DEFAULT: '#F8FAFC',
          subtle: '#F1F5F9',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FFFFFF',
          hover: '#F8FAFC',
        },
        ink: {
          950: '#F8FAFC',
          900: '#FFFFFF',
          850: '#FFFFFF',
          800: '#F8FAFC',
          750: '#F1F5F9',
          700: '#E2E8F0',
          600: '#CBD5E1',
        },
        line: {
          1: '#E2E8F0',
          highlight: 'rgba(20, 155, 158, 0.15)',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          2: '#F8FAFC',
        },
        text: {
          hi: '#0F172A',
          mid: '#1E293B',
          low: '#475569',
        },
        signal: {
          DEFAULT: '#149B9E',
          glow: 'rgba(20, 155, 158, 0.35)',
          light: '#5EEAD4',
          dark: '#0D7C7E',
        },
        commit: {
          DEFAULT: '#0D9488',
          glow: 'rgba(13, 148, 136, 0.3)',
          light: '#2DD4BF',
          dark: '#0F766E',
        },
        caution: {
          DEFAULT: '#D97706',
          glow: 'rgba(217, 119, 6, 0.3)',
        },
        critical: {
          DEFAULT: '#E11D48',
          glow: 'rgba(225, 29, 72, 0.3)',
        },
        unknown: '#64748B',
        severity: {
          red: '#E11D48',
          yellow: '#D97706',
          green: '#0D9488',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-signal': '0 0 24px rgba(20, 155, 158, 0.35)',
        'glow-commit': '0 0 24px rgba(13, 148, 136, 0.25)',
        'glow-critical': '0 0 24px rgba(225, 29, 72, 0.25)',
        'glow-caution': '0 0 24px rgba(217, 119, 6, 0.25)',
        'card-3d': '0 4px 14px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 0 0 1px #E2E8F0',
        'card-3d-hover': '0 18px 38px -6px rgba(15, 23, 42, 0.10), 0 0 0 1.5px rgba(20, 155, 158, 0.45)',
        'macos-window': '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-settle': 'scaleSettle 270ms cubic-bezier(0.2, 0.9, 0.2, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleSettle: {
          '0%': { transform: 'scale(1.0)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1.0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
