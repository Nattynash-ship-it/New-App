import type { Config } from "tailwindcss";

/**
 * Tokens resolve to CSS variables set per-theme in globals.css — the built-in
 * themes (see src/core/themes.ts) are switchable at runtime.
 * Domain identity mid-tones are fixed across themes (validated on both light
 * and dark surfaces); text tints (`bright`) swap per theme via variables.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "var(--line)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          soft: "rgb(var(--accent) / 0.14)",
          dark: "rgb(var(--accent-dark) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
        },
        work: {
          DEFAULT: "#4E74E6",
          soft: "rgb(78 116 230 / 0.16)",
          bright: "rgb(var(--work-bright) / <alpha-value>)",
        },
        school: {
          DEFAULT: "#C9702C",
          soft: "rgb(201 112 44 / 0.16)",
          bright: "rgb(var(--school-bright) / <alpha-value>)",
        },
        meals: {
          DEFAULT: "#167A42",
          soft: "rgb(34 153 87 / 0.16)",
          bright: "rgb(var(--meals-bright) / <alpha-value>)",
        },
        fitness: {
          DEFAULT: "#E25C82",
          soft: "rgb(226 92 130 / 0.16)",
          bright: "rgb(var(--fitness-bright) / <alpha-value>)",
        },
        family: {
          DEFAULT: "#8A5FD6",
          soft: "rgb(138 95 214 / 0.16)",
          bright: "rgb(var(--family-bright) / <alpha-value>)",
        },
        compass: {
          DEFAULT: "#87992D",
          soft: "rgb(167 189 61 / 0.16)",
          bright: "rgb(var(--compass-bright) / <alpha-value>)",
        },
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
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
