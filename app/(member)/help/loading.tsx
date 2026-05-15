export default function HelpLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="bg-bg px-5 pb-3 pt-6">
        <div
          className="skeleton-shimmer mb-2"
          style={{ height: 38, width: 100 }}
        />
        <div className="skeleton-shimmer" style={{ height: 14, width: 220 }} />
      </div>

      <div className="px-4 pt-3">
        <div className="skeleton-shimmer" style={{ height: 52 }} />
      </div>

      <div className="flex flex-col gap-2.5 px-4 pt-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{ height: 92 }}
          />
        ))}
      </div>
    </div>
  );
}
