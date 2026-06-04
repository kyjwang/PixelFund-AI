import type { Metadata, Viewport } from "next";
import "./globals.css";
import type { ReactNode } from "react";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "pixelFund AI",
  description: "Pixel-art trading simulation with specialist AI agents",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c7c59"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
