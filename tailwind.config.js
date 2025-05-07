/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./pages/**/*.{ts,tsx}",
      "./components/**/*.{ts,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
        mono: ['Menlo', 'Monaco', 'Courier New', 'monospace']
      },
      },
    },
    plugins: [],
  }
  