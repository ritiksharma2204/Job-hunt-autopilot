import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0E1A",
          900: "#12172B",
          800: "#1A2140",
          700: "#242C52",
        },
        fog: {
          100: "#F5F6F8",
          200: "#E7E9EF",
          300: "#C9CCDA",
        },
        amber: {
          400: "#F0B559",
          500: "#E8A33D",
          600: "#C7841F",
        },
        signal: {
          teal: "#1F8A70",
          coral: "#D6553D",
          slate: "#3B5BA9",
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