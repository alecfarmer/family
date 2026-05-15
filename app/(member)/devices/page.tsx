import { requireUser } from "@/lib/auth";
import { DeviceCard } from "@/components/devices/DeviceCard";

export default async function DevicesPage() {
  const { sb } = await requireUser();

  const { data: devices } = await sb
    .from("devices")
    .select("*")
    .order("name");

  const all = devices ?? [];
  const today = new Date();
  const sixtyDaysOut = new Date(today.getTime() + 60 * 86_400_000);

  // "Need attention" = expired OR warranty within 60 days (warning + danger)
  const needAttentionCount = all.filter((d) => {
    if (!d.warranty_expiry) return false;
    const expiry = new Date(d.warranty_expiry);
    return expiry <= sixtyDaysOut; // includes already-expired
  }).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 bg-bg px-5 pb-3.5 pt-6">
        <h1
          className="font-display font-semibold text-text"
          style={{ fontSize: 34, letterSpacing: "0.01em" }}
        >
          Devices
        </h1>
        <p className="mt-0.5 font-sans text-[13.5px] text-text-2">
          {all.length} tracked ·{" "}
          <span className={needAttentionCount > 0 ? "text-warning" : undefined}>
            {needAttentionCount} need{needAttentionCount === 1 ? "s" : ""} attention
          </span>
        </p>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-4 pb-5 pt-1.5">
        {all.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
            <p className="font-sans text-[14px] text-text-2">No devices tracked yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {all.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
