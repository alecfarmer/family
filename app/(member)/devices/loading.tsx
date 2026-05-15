export default function DevicesLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="bg-bg px-5 pb-3.5 pt-6">
        <div
          className="skeleton-shimmer mb-2"
          style={{ height: 38, width: 140 }}
        />
        <div className="skeleton-shimmer" style={{ height: 14, width: 200 }} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pt-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{ height: 130 }}
          />
        ))}
      </div>
    </div>
  );
}
