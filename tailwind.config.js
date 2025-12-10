/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        like: "#2ddb8a",
        nope: "#ff5b5b"
      },
      boxShadow: {
        card: "0 20px 60px -25px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

