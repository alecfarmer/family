import { ImageResponse } from "next/og";
import { IconImage } from "./icon-image";

// Standard browser favicon. Next.js auto-wires this as <link rel="icon">.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconImage size={32} />, { ...size });
}
