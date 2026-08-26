/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        ict: {
          navy: '#0b2545',
          'navy-light': '#1b2a4a',
          blue: '#1394db',
          'blue-dark': '#0f7ab5',
          gold: '#fbd306',
          'gold-deep': '#d9a01b',
          green: '#21a43f',
          ink: '#0e3b40',
          paper: '#f4f6f9',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
