export default function ActivityLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="bg-bg px-5 pb-3.5 pt-6">
        <div
          className="skeleton-shimmer mb-2"
          style={{ height: 30, width: 110 }}
        />
        <div className="skeleton-shimmer" style={{ height: 14, width: 150 }} />
      </div>

      <div className="flex flex-col gap-2 px-4 pt-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{ height: 80 }}
          />
        ))}
      </div>
    </div>
  );
}
