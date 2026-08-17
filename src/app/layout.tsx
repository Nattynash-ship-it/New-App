import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { RegisterSW } from "@/components/RegisterSW";
import { UndoToast } from "@/components/UndoToast";
import { LockGate } from "@/components/LockGate";

export const metadata: Metadata = {
  title: "Vela — Your life, under sail",
  description:
    "Work, school, meals, fitness, and family in one calm place — Vela keeps the day on course so you don't have to hold it in your head.",
  applicationName: "Vela",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vela",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#E4EAF8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Apply the saved theme + display preferences before first paint (no flash),
// migrating anyone on a removed theme (bloom/aurora/ember/velvet) to the
// default. Keep the inline theme-id list in sync with src/core/themes.ts and
// the font/size maps with src/core/fonts.ts (this pre-paint script runs before
// modules load, so it can't import them).
const themeInit = `(function(){try{var el=document.documentElement;var v=["glass","cartoon","bubblegum","sunset","ocean","meadow","lavender","daylight","sand","galaxy","nocturne","forest","slate","midnight"];var t=localStorage.getItem("hub-theme");if(t&&v.indexOf(t)>=0){el.dataset.theme=t}else{el.dataset.theme="glass";if(t)localStorage.setItem("hub-theme","glass")}var sizes={small:0.92,default:1,large:1.12,xl:1.25};var sz=localStorage.getItem("hub-textsize");if(sz&&sizes[sz])el.style.setProperty("--font-scale",String(sizes[sz]));var fonts={rounded:'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Nunito", system-ui, sans-serif',serif:'"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif',humanist:'"Avenir Next", "Segoe UI", Optima, system-ui, sans-serif',mono:'ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", monospace'};var f=localStorage.getItem("hub-font");if(f&&fonts[f])el.style.setProperty("--font-body-override",fonts[f]);}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="glass" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <RegisterSW />
        <LockGate>
          <Shell>{children}</Shell>
        </LockGate>
        <UndoToast />
      </body>
    </html>
  );
}
