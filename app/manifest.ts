import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family",
    short_name: "Family",
    description: "Your family's tech, in one place.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0D0B",
    theme_color: "#0F0D0B",
    // Generated dynamically by app/icon0.tsx (192px) and app/icon1.tsx
    // (512px maskable). Next.js serves them at /icon0.png and /icon1.png.
    icons: [
      {
        src: "/icon0.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon1.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
