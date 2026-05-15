import type { Metadata, Viewport } from "next";
import { display, sans, mono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family",
  description: "Your family's tech, in one place.",
  applicationName: "Family",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Family",
  },
  // Icons are auto-wired by Next.js from app/icon.tsx (favicon) and
  // app/apple-icon.tsx (iOS home screen). PWA manifest icons live in
  // app/manifest.ts. No explicit URLs needed here.
};

export const viewport: Viewport = {
  themeColor: "#0F0D0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-text">{children}</body>
    </html>
  );
}
