/**
 * Streamed instantly when Next.js starts a navigation to /vault. Replaces
 * the previous "blank screen until the server responds" gap with a shape
 * that matches the real page, so the tap feels instant.
 */
export default function VaultLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="bg-bg px-4 pb-3 pt-6">
        <div
          className="skeleton-shimmer mb-2"
          style={{ height: 38, width: 120 }}
        />
        <div
          className="skeleton-shimmer mb-3.5"
          style={{ height: 14, width: 180 }}
        />
        <div className="skeleton-shimmer" style={{ height: 40 }} />
      </div>

      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="skeleton-shimmer" style={{ height: 26, width: 56 }} />
        <div className="skeleton-shimmer" style={{ height: 26, width: 76 }} />
        <div
          className="skeleton-shimmer ml-auto"
          style={{ height: 26, width: 56 }}
        />
      </div>

      <div className="flex flex-col gap-2.5 px-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{ height: 86, borderLeftColor: "var(--color-accent)" }}
          />
        ))}
      </div>
    </div>
  );
}
