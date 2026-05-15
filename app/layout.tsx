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
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
