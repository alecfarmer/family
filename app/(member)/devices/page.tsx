import { requireUser } from "@/lib/auth";
import { DevicesGrid } from "@/components/devices/DevicesGrid";

export default async function DevicesPage() {
  const { profile, sb } = await requireUser();
  const isAdmin = profile.role === "admin";

  const { data: devices } = await sb.from("devices").select("*").order("name");
  const all = devices ?? [];

  const today = new Date();
  const sixtyDaysOut = new Date(today.getTime() + 60 * 86_400_000);

  // "Need attention" = expired OR warranty within 60 days
  const needAttentionCount = all.filter((d) => {
    if (!d.warranty_expiry) return false;
    const expiry = new Date(d.warranty_expiry);
    return expiry <= sixtyDaysOut;
  }).length;

  const households = isAdmin
    ? ((await sb.from("households").select("id, name").order("name")).data ?? [])
    : [];

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

      {/* Grid (client wrapper handles admin add/edit/delete) */}
      <div className="flex flex-1 flex-col overflow-auto">
        <DevicesGrid devices={all} isAdmin={isAdmin} households={households} />
      </div>
    </div>
  );
}
