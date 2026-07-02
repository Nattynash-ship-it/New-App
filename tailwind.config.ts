import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAFAF7",
        surface: "#FFFFFF",
        ink: "#1A1D1B",
        muted: "#6B7069",
        line: "#E7E6E0",
        accent: {
          DEFAULT: "#2F6D5E",
          soft: "#E4EFEA",
          dark: "#24544A",
        },
        work: { DEFAULT: "#4A5D8A", soft: "#EAEDF5" },
        school: { DEFAULT: "#8A5A44", soft: "#F4ECE7" },
        meals: { DEFAULT: "#4C7A3F", soft: "#EBF2E8" },
        fitness: { DEFAULT: "#A04E5E", soft: "#F6EBED" },
        family: { DEFAULT: "#B07B2E", soft: "#F7F0E3" },
      },
      fontFamily: {
        display: ['"Iowan Old Style"', "Palatino", '"Palatino Linotype"', "Georgia", "serif"],
        body: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,29,27,0.04), 0 4px 16px rgba(26,29,27,0.05)",
        lift: "0 2px 4px rgba(26,29,27,0.06), 0 12px 32px rgba(26,29,27,0.10)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
