import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kh: {
          dark:    '#15363F',
          teal:    '#0F8A82',
          'teal-light': '#E0F0EE',
          amber:   '#C98A2B',
          'amber-light': '#F8ECD6',
          red:     '#E06B57',
          'red-light': '#FDECEA',
          violet:  '#5965B8',
          'violet-light': '#E6E8F6',
          bg:      '#F6F3ED',
          page:    '#EFEAE0',
          card:    '#FFFFFF',
          border:  '#E4DDCF',
          muted:   '#6E7E80',
          green:   '#2E9C6E',
          'green-light': '#DDF0E7',
        },
      },
      fontFamily: {
        sans: ['var(--font-hanken)', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-hanken)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
