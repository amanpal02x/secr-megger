/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#030c1a",
          900: "#071428",
          800: "#0c2044",
          700: "#123060",
          600: "#1a4080",
          500: "#2255a4",
          400: "#3a6bbf",
          300: "#6090d0",
        },
        gold: {
          600: "#b8860b",
          500: "#d4a017",
          400: "#e8b830",
          300: "#f0cc66",
          200: "#f7e4aa",
          100: "#fdf4d8",
        },
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
