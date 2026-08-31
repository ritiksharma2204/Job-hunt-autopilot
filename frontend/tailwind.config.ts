import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#F8F8FC",
          900: "#FFFFFF",
          800: "#F2F2F8",
          700: "#E6E7F0",
        },
        fog: {
          100: "#15172B",
          200: "#3E4160",
          300: "#6E7191",
        },
        amber: {
          400: "#F5B860",
          500: "#EB9F3C",
          600: "#C97E1F",
        },
        signal: {
          teal: "#0E9F73",
          coral: "#E14B34",
          slate: "#4C63B6",
        },
        brand: {
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;