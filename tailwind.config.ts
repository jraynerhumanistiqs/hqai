import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sand:   '#F5F0E8',
        sand2:  '#EDE7D9',
        sand3:  '#DDD5C4',
        stone:  '#C4BAA8',
        warm:   '#8B7355',
        ink:    '#2C2417',
        ink2:   '#5C4F3A',
        ink3:   '#8B7B66',
        teal:   '#2D6E63',
        teal2:  '#3D8E80',
        teal3:  '#EAF4F2',
        coral:  '#C4593A',
        coral2: '#FAF0EC',
        amber:  '#B8840A',
        amber2: '#FDF5E6',
        cream:  '#FDFAF6',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
      },
      borderRadius: { xl: '20px' },
    },
  },
  plugins: [],
}
export default config
