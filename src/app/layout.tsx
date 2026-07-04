import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { RegisterSW } from "@/components/RegisterSW";

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
  themeColor: "#0E0F1B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Apply the saved theme before first paint, migrating anyone still on a
// removed theme (e.g. the old cream "bloom") to the current default.
const themeInit = `(function(){try{var v=["nocturne","midnight","aurora","ember","velvet","daylight"];var t=localStorage.getItem("hub-theme");if(t&&v.indexOf(t)>=0){document.documentElement.dataset.theme=t}else{document.documentElement.dataset.theme="nocturne";if(t)localStorage.setItem("hub-theme","nocturne")}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="nocturne" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <RegisterSW />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
