import type { MetadataRoute } from "next";

/** PWA manifest — makes Vela installable to the home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vela — Your life, under sail",
    short_name: "Vela",
    description:
      "Work, school, meals, fitness, and family in one calm place — Vela keeps the day on course.",
    start_url: "/",
    display: "standalone",
    background_color: "#E4EAF8",
    theme_color: "#E4EAF8",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
