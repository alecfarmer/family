import { ImageResponse } from "next/og";
import { IconImage } from "./icon-image";

// iPhone home-screen icon when the PWA is added to home. Next.js auto-wires
// this as <link rel="apple-touch-icon">. iOS rounds the corners + adds its
// own subtle gloss; we hand it a full square with no border-radius.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconImage size={180} />, { ...size });
}
