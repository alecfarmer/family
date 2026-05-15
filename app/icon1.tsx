import { ImageResponse } from "next/og";
import { IconImage } from "./icon-image";

// PWA manifest "maskable" icon (512x512). Android crops it to a circle /
// squircle / rounded-square depending on the launcher, so the IconImage
// shrinks the mark to leave the standard ~20% safe-zone padding.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon512() {
  return new ImageResponse(<IconImage size={512} maskable />, { ...size });
}
