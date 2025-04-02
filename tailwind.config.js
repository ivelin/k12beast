/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff", // Simplify to a single color
      },
    },
  },
  plugins: [],
};