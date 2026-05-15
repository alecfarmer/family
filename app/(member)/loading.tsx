/**
 * Fallback skeleton for any member route that doesn't define its own
 * loading.tsx (e.g. the chat home / and per-row detail pages). A subtle
 * placeholder is plenty here — the chat's own empty state will replace it
 * within a single server render once the auth check completes.
 */
export default function MemberLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div
        className="h-10 w-10 rounded-full border-2 border-accent/40 border-t-accent"
        style={{ animation: "spin 0.9s linear infinite" }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
