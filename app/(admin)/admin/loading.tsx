export default function AdminLoading() {
  return (
    <div className="flex flex-1 flex-col px-4 pt-4">
      <div
        className="skeleton-shimmer mb-3"
        style={{ height: 30, width: 220 }}
      />
      <div className="skeleton-shimmer mb-5" style={{ height: 14, width: 160 }} />

      <div className="mb-4 grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 80 }} />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 42 }} />
        ))}
      </div>
    </div>
  );
}
