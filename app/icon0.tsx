import { ImageResponse } from "next/og";
import { IconImage } from "./icon-image";

// Android Chrome / PWA manifest icon (192x192). Served at /icon0.png by
// Next.js convention and referenced from app/manifest.ts.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon192() {
  return new ImageResponse(<IconImage size={192} />, { ...size });
}
