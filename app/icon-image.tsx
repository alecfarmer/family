/**
 * Shared renderer for every dynamically-generated app icon size.
 *
 * Returns a JSX tree that ImageResponse can rasterize into PNG. The
 * FamilyMark is drawn inline as SVG so Satori (Next's ImageResponse engine)
 * can render it without external assets. Layout matches the design's brand
 * artboard:
 *   - #0F0D0B dark background
 *   - Soft amber radial glow centered behind the mark
 *   - FamilyMark in the warm amber accent
 *   - For the iOS apple-touch-icon, no border-radius — iOS rounds the
 *     corners + adds its own gloss, so we hand it a full square.
 */
export function IconImage({
  size,
  /** Whether to leave safe-area padding for Android maskable icons (~20%). */
  maskable = false,
}: {
  size: number;
  maskable?: boolean;
}) {
  // FamilyMark fills ~62% of the canvas — feels right at every common icon
  // size. Maskable variants shrink it to leave the safe-zone padding Android
  // expects (so the mark survives circle / squircle / rounded-square crops).
  const markRatio = maskable ? 0.5 : 0.62;
  const markPx = Math.round(size * markRatio);
  // Stroke width scales with the rendered size so the silhouette stays
  // recognizable at 32 px and at 512 px alike.
  const strokeWidth = Math.max(1.5, (markPx / 32) * 1.8);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F0D0B",
        // Radial amber glow centered behind the mark — matches the design's
        // brand artboard inner-glow + ambient backdrop.
        backgroundImage:
          "radial-gradient(circle at 50% 50%, rgba(200,121,65,0.20) 0%, rgba(200,121,65,0.05) 45%, transparent 70%)",
      }}
    >
      <svg
        width={markPx}
        height={markPx}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 14.5 L16 4 L17.5 5.4 L17.5 2.5 L20 2.5 L20 7.8 L27 14.5 L27 27 L20 27 L20 19 L12 19 L12 27 L5 27 Z"
          stroke="#C87941"
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="18.75" cy="4.4" r="0.9" fill="#C87941" />
      </svg>
    </div>
  );
}
