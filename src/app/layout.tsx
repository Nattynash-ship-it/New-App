import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "Compass — Life Management Hub",
  description:
    "One calm place for work, school, meals, fitness, and family — designed to reduce cognitive load.",
};

export const viewport: Viewport = {
  themeColor: "#0B0F13",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
