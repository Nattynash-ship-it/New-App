import type { Config } from "tailwindcss";

/**
 * "Midnight editorial" theme — deep blue-black surfaces, luminous lime
 * signature accent, serif display type. Module identity hues are mid-tone and
 * CVD-validated against the dark surface (see scripts note in README);
 * `bright` variants are reserved for small text so labels stay legible.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#0B0F13", // app background
        surface: "#131A20", // cards
        ink: "#EDF2EE", // primary text
        muted: "#8E99A1",
        line: "#FFFFFF14", // hairline strokes (8% white)
        accent: {
          DEFAULT: "#C8F04D", // luminous lime — the signature
          soft: "#C8F04D1F",
          dark: "#B2D93D", // pressed/hover fill
          ink: "#151B06", // text on lime
        },
        work: { DEFAULT: "#4E74E6", soft: "#4E74E629", bright: "#98B1F7" },
        school: { DEFAULT: "#C9702C", soft: "#C9702C29", bright: "#EA9D5E" },
        meals: { DEFAULT: "#167A42", soft: "#22995729", bright: "#57CC8B" },
        fitness: { DEFAULT: "#E25C82", soft: "#E25C8229", bright: "#F395B0" },
        family: { DEFAULT: "#8A5FD6", soft: "#8A5FD629", bright: "#BBA0EC" },
        compass: { DEFAULT: "#87992D", soft: "#A7BD3D29", bright: "#C8F04D" },
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
        card: "0 1px 2px rgba(0,0,0,0.5), 0 8px 28px rgba(0,0,0,0.35)",
        lift: "0 2px 6px rgba(0,0,0,0.5), 0 16px 44px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px #C8F04D33, 0 4px 24px #C8F04D1A",
      },
      borderRadius: {
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
