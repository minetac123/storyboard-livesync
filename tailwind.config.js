/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#000000',     // Čistá černá
          900: '#0a0a0a',     // Velmi tmavý podklad
          850: '#121212',     // Povrch karet
          800: '#1c1c1c',     // Panely
          750: '#262626',     // Rámečky
          700: '#333333',     // Zvýrazněné rámečky
          600: '#525252',
          500: '#737373',     // Tlumený text
          400: '#a3a3a3',     // Sekundární text
          300: '#d4d4d4',
          200: '#e5e5e5',     // Světlý text
          100: '#f5f5f5',
          white: '#ffffff',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
